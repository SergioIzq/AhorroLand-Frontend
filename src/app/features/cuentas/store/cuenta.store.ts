import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, firstValueFrom } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { tapResponse } from '@ngrx/operators';
import { CuentaService } from '@/core/services/api/cuenta.service';
import { Cuenta } from '@/core/models/cuenta.model';
import { ErrorResponse } from '@/core/models/error-response.model';

interface CuentaState {
    cuentas: Cuenta[];
    totalRecords: number;
    loading: boolean;
    error: string | null;
    lastUpdated: number | null;
    searchCache: Map<string, Cuenta[]>;
}

const initialState: CuentaState = {
    cuentas: [],
    totalRecords: 0,
    loading: false,
    error: null,
    lastUpdated: null,
    searchCache: new Map()
};

export const CuentaStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),
    
    withComputed((store) => ({
        // Saldo total de todas las cuentas
        saldoTotal: computed(() => {
            return store.cuentas().reduce((sum, cuenta) => sum + (cuenta.saldo || 0), 0);
        }),
        
        // Número total de cuentas
        totalCuentas: computed(() => store.cuentas().length),
        
        // Cuentas con saldo positivo
        cuentasActivas: computed(() => {
            return store.cuentas().filter(c => (c.saldo || 0) > 0);
        }),
        
        // Indica si hay datos cargados
        hasData: computed(() => store.cuentas().length > 0),
        
        // Cuentas ordenadas por saldo descendente
        cuentasOrdenadas: computed(() => {
            return [...store.cuentas()].sort((a, b) => (b.saldo || 0) - (a.saldo || 0));
        })
    })),
    
    withComputed((store) => ({
        // Estado de sincronización (loading pero con datos previos)
        isSyncing: computed(() => store.loading() && store.hasData())
    })),
    
    withMethods((store, cuentaService = inject(CuentaService)) => ({
        async search(query: string, limit: number = 10): Promise<Cuenta[]> {
            // Verificar caché primero
            const cacheKey = `${query}_${limit}`;
            const cached = store.searchCache().get(cacheKey);
            if (cached) {
                return cached;
            }
            
            patchState(store, { loading: true, error: null });
            try {
                const response = await firstValueFrom(cuentaService.search(query, limit));

                if (response.isSuccess && response.value) {
                    const cuentas = Array.isArray(response.value) ? response.value : (response.value as any).items || [];
                    
                    // Actualizar caché
                    const newCache = new Map(store.searchCache());
                    newCache.set(cacheKey, cuentas);
                    
                    patchState(store, { 
                        loading: false,
                        searchCache: newCache,
                        lastUpdated: Date.now()
                    });
                    return cuentas;
                } else {
                    const errorMsg = response.error?.message || 'Error al buscar cuentas';
                    patchState(store, { loading: false, error: errorMsg });
                    throw new Error(errorMsg);
                }
            } catch (err: any) {
                const errorMsg = err.message || 'Error al buscar cuentas';
                patchState(store, { loading: false, error: errorMsg });
                throw err;
            }
        },

        async create(nombre: string, saldo: number): Promise<string> {
            // Actualización optimista: agregar inmediatamente a la UI
            const tempId = `temp_${Date.now()}`;
            const tempCuenta: Partial<Cuenta> & { id: string; nombre: string; saldo: number } = { 
                id: tempId, 
                nombre, 
                saldo,
                fechaCreacion: new Date(),
                usuarioId: ''
            };
            
            patchState(store, { 
                cuentas: [...store.cuentas(), tempCuenta as Cuenta],
                loading: true,
                error: null
            });
            
            try {
                const response = await firstValueFrom(cuentaService.create(nombre, saldo));

                if (response.isSuccess) {
                    // Reemplazar la cuenta temporal con la real
                    const realCuenta: Partial<Cuenta> & { id: string; nombre: string; saldo: number } = { 
                        id: response.value, 
                        nombre, 
                        saldo,
                        fechaCreacion: new Date(),
                        usuarioId: ''
                    };
                    patchState(store, { 
                        cuentas: store.cuentas().map(c => 
                            c.id === tempId ? realCuenta as Cuenta : c
                        ),
                        loading: false,
                        lastUpdated: Date.now(),
                        searchCache: new Map() // Invalidar caché
                    });
                    return response.value;
                }
                throw new Error(response.error?.message || 'Error al crear cuenta');
            } catch (err) {
                // ROLLBACK: Revertir actualización optimista en caso de error
                patchState(store, { 
                    cuentas: store.cuentas().filter(c => c.id !== tempId),
                    totalRecords: store.totalRecords() - 1,
                    loading: false,
                    error: (err as Error).message,
                    searchCache: new Map() // Invalidar caché
                });
                throw err;
            }
        },

        loadCuentasPaginated: rxMethod<{
            page: number;
            pageSize: number;
            searchTerm?: string;
            sortColumn?: string;
            sortOrder?: string;
        }>(
            pipe(
                tap(() => {
                    patchState(store, { loading: true, error: null });
                }),
                switchMap(({ page, pageSize, searchTerm, sortColumn, sortOrder }) =>
                    cuentaService.getCuentas(page, pageSize, searchTerm, sortColumn, sortOrder).pipe(
                        tapResponse({
                            next: (response) => {
                                patchState(store, {
                                    cuentas: response.items,
                                    totalRecords: response.totalCount,
                                    loading: false,
                                    error: null,
                                    lastUpdated: Date.now(),
                                    searchCache: new Map() // Invalidar caché
                                });
                            },
                            error: (error: any) => {
                                console.error('[STORE] Error al cargar cuentas:', error);
                                patchState(store, {
                                    loading: false,
                                    error: error.userMessage || 'Error al cargar cuentas'
                                });
                            }
                        })
                    )
                )
            )
        ),

        async update(id: string, cuenta: Partial<Cuenta>): Promise<string> {
            // Actualización optimista: actualizar inmediatamente en la UI
            const cuentaAnterior = store.cuentas().find(c => c.id === id);
            
            if (cuentaAnterior) {
                patchState(store, {
                    cuentas: store.cuentas().map(c => 
                        c.id === id ? { ...c, ...cuenta } : c
                    ),
                    loading: true,
                    error: null
                });
            }
            
            try {
                const response = await firstValueFrom(cuentaService.update(id, cuenta));

                if (response.isSuccess) {
                    patchState(store, { 
                        loading: false,
                        lastUpdated: Date.now(),
                        searchCache: new Map() // Invalidar caché
                    });
                    return response.value;
                }
                throw new Error(response.error?.message || 'Error al actualizar cuenta');
            } catch (err) {
                // ROLLBACK: Revertir actualización optimista
                if (cuentaAnterior) {
                    patchState(store, {
                        cuentas: store.cuentas().map(c => 
                            c.id === id ? cuentaAnterior : c
                        ),
                        loading: false,
                        error: (err as Error).message,
                        searchCache: new Map() // Invalidar caché
                    });
                } else {
                    patchState(store, { 
                        loading: false,
                        error: (err as Error).message
                    });
                }
                throw err;
            }
        },

        deleteCuenta: rxMethod<string>(
            pipe(
                switchMap((id) => {
                    // Guardar cuenta para rollback ANTES de eliminarla
                    const cuentaEliminada = store.cuentas().find(c => c.id === id);
                    const totalAnterior = store.totalRecords();
                    
                    // Actualización optimista: eliminar inmediatamente
                    patchState(store, (state) => ({
                        cuentas: state.cuentas.filter((c) => c.id !== id),
                        totalRecords: state.totalRecords - 1,
                        searchCache: new Map() // Invalidar caché
                    }));
                    
                    return cuentaService.delete(id).pipe(
                        tapResponse({
                            next: () => {
                                patchState(store, { 
                                    lastUpdated: Date.now()
                                });
                            },
                            error: (err: ErrorResponse) => {
                                console.error('[STORE] Error al eliminar cuenta:', err);
                                
                                // ROLLBACK: Restaurar cuenta eliminada
                                if (cuentaEliminada) {
                                    patchState(store, (state) => ({
                                        cuentas: [...state.cuentas, cuentaEliminada].sort((a, b) => a.nombre.localeCompare(b.nombre)),
                                        totalRecords: totalAnterior,
                                        error: err.detail || 'Error al eliminar cuenta'
                                    }));
                                } else {
                                    patchState(store, { 
                                        error: err.detail || 'Error al eliminar cuenta'
                                    });
                                }
                            }
                        })
                    );
                })
            )
        ),

        async getRecent(limit: number = 5): Promise<Cuenta[]> {
            patchState(store, { loading: true, error: null });
            try {
                const response = await firstValueFrom(cuentaService.getRecent(limit));

                // Manejar Result<Cuenta[]> - el backend devuelve array directo en value
                if (response.isSuccess && response.value) {
                    const cuentas = Array.isArray(response.value) ? response.value : (response.value as any).items || [];
                    patchState(store, { loading: false });
                    return cuentas;
                } else {
                    const errorMsg = response.error?.message || 'Error al cargar cuentas recientes';
                    patchState(store, { loading: false, error: errorMsg });
                    throw new Error(errorMsg);
                }
            } catch (err: any) {
                const errorMsg = err.message || 'Error al cargar cuentas recientes';
                patchState(store, { loading: false, error: errorMsg });
                throw err;
            }
        },

        clearError() {
            patchState(store, { error: null });
        }
    }))
);
