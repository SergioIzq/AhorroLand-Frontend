import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, firstValueFrom } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { tapResponse } from '@ngrx/operators';
import { FormaPagoService } from '@/core/services/api/forma-pago.service';
import { FormaPago } from '@/core/models/forma-pago.model';
import { ErrorResponse } from '@/core/models/error-response.model';

interface FormaPagoState {
    formasPago: FormaPago[];
    totalRecords: number;
    loading: boolean;
    error: string | null;
    lastUpdated: number | null;
    searchCache: Map<string, FormaPago[]>;
}

const initialState: FormaPagoState = {
    formasPago: [],
    totalRecords: 0,
    loading: false,
    error: null,
    lastUpdated: null,
    searchCache: new Map()
};

export const FormaPagoStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),
    
    withComputed((store) => ({
        totalFormasPago: computed(() => store.formasPago().length),
        hasData: computed(() => store.formasPago().length > 0),
        formasPagoOrdenadas: computed(() => {
            return [...store.formasPago()].sort((a, b) => 
                a.nombre.localeCompare(b.nombre)
            );
        })
    })),
    
    withComputed((store) => ({
        isSyncing: computed(() => store.loading() && store.hasData())
    })),
    
    withMethods((store, formaPagoService = inject(FormaPagoService)) => ({
        async search(query: string, limit: number = 10): Promise<FormaPago[]> {
            const cacheKey = `${query}_${limit}`;
            const cached = store.searchCache().get(cacheKey);
            if (cached) return cached;
            
            patchState(store, { loading: true, error: null });
            try {
                const response = await firstValueFrom(formaPagoService.search(query, limit));

                if (response.isSuccess && response.value) {
                    const formasPago = Array.isArray(response.value) ? response.value : (response.value as any).items || [];
                    const newCache = new Map(store.searchCache());
                    newCache.set(cacheKey, formasPago);
                    patchState(store, { formasPago, loading: false, searchCache: newCache, lastUpdated: Date.now() });
                    return formasPago;
                } else {
                    const errorMsg = response.error?.message || 'Error al buscar formas de pago';
                    patchState(store, { loading: false, error: errorMsg });
                    throw new Error(errorMsg);
                }
            } catch (err: any) {
                const errorMsg = err.message || 'Error al buscar formas de pago';
                patchState(store, { loading: false, error: errorMsg });
                throw err;
            }
        },

        async create(nombre: string): Promise<string> {
            const tempId = `temp_${Date.now()}`;
            const tempFormaPago: Partial<FormaPago> & { id: string; nombre: string } = { 
                id: tempId, 
                nombre,
                fechaCreacion: new Date(),
                usuarioId: ''
            };
            
            patchState(store, { 
                formasPago: [...store.formasPago(), tempFormaPago as FormaPago],
                loading: true,
                error: null
            });
            
            try {
                const response = await firstValueFrom(formaPagoService.create(nombre));

                if (response.isSuccess) {
                    const realFormaPago: Partial<FormaPago> & { id: string; nombre: string } = { 
                        id: response.value, 
                        nombre,
                        fechaCreacion: new Date(),
                        usuarioId: ''
                    };
                    patchState(store, { 
                        formasPago: store.formasPago().map(f => f.id === tempId ? realFormaPago as FormaPago : f),
                        loading: false,
                        lastUpdated: Date.now(),
                        searchCache: new Map()
                    });
                    return response.value;
                }
                throw new Error(response.error?.message || 'Error al crear forma de pago');
            } catch (err) {
                patchState(store, { 
                    formasPago: store.formasPago().filter(f => f.id !== tempId),
                    loading: false,
                    error: (err as Error).message
                });
                throw err;
            }
        },

        loadFormasPagoPaginated: rxMethod<{
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
                    formaPagoService.getFormasPago(page, pageSize, searchTerm, sortColumn, sortOrder).pipe(
                        tapResponse({
                            next: (response) => {
                                patchState(store, {
                                    formasPago: response.items,
                                    totalRecords: response.totalCount,
                                    loading: false,
                                    error: null,
                                    lastUpdated: Date.now(),
                                    searchCache: new Map()
                                });
                            },
                            error: (error: any) => {
                                console.error('[STORE] Error al cargar formas de pago:', error);
                                patchState(store, {
                                    loading: false,
                                    error: error.userMessage || 'Error al cargar formas de pago'
                                });
                            }
                        })
                    )
                )
            )
        ),

        async update(id: string, formaPago: Partial<FormaPago>): Promise<string> {
            const formaPagoAnterior = store.formasPago().find(f => f.id === id);
            
            if (formaPagoAnterior) {
                patchState(store, {
                    formasPago: store.formasPago().map(f => f.id === id ? { ...f, ...formaPago } : f),
                    loading: true,
                    error: null
                });
            }
            
            try {
                const response = await firstValueFrom(formaPagoService.update(id, formaPago));

                if (response.isSuccess) {
                    patchState(store, { 
                        loading: false,
                        lastUpdated: Date.now(),
                        searchCache: new Map()
                    });
                    return response.value;
                }
                throw new Error(response.error?.message || 'Error al actualizar forma de pago');
            } catch (err) {
                if (formaPagoAnterior) {
                    patchState(store, {
                        formasPago: store.formasPago().map(f => f.id === id ? formaPagoAnterior : f)
                    });
                }
                patchState(store, { 
                    loading: false,
                    error: (err as Error).message
                });
                throw err;
            }
        },

        deleteFormaPago: rxMethod<string>(
            pipe(
                switchMap((id) => {
                    // Guardar forma de pago para rollback ANTES de eliminarla
                    const formaPagoEliminada = store.formasPago().find(f => f.id === id);
                    const totalAnterior = store.totalRecords();
                    
                    // Actualización optimista: eliminar inmediatamente
                    patchState(store, (state) => ({
                        formasPago: state.formasPago.filter((f) => f.id !== id),
                        totalRecords: state.totalRecords - 1,
                        searchCache: new Map()
                    }));
                    
                    return formaPagoService.delete(id).pipe(
                        tapResponse({
                            next: () => {
                                patchState(store, { lastUpdated: Date.now() });
                            },
                            error: (err: ErrorResponse) => {
                                console.error('[STORE] Error al eliminar forma de pago:', err);
                                
                                // ROLLBACK: Restaurar forma de pago eliminada
                                if (formaPagoEliminada) {
                                    patchState(store, (state) => ({
                                        formasPago: [...state.formasPago, formaPagoEliminada].sort((a, b) => a.nombre.localeCompare(b.nombre)),
                                        totalRecords: totalAnterior,
                                        error: err.detail || 'Error al eliminar forma de pago'
                                    }));
                                } else {
                                    patchState(store, { error: err.detail || 'Error al eliminar forma de pago' });
                                }
                            }
                        })
                    );
                })
            )
        ),

        async getRecent(limit: number = 5): Promise<FormaPago[]> {
            patchState(store, { loading: true, error: null });
            try {
                const response = await firstValueFrom(formaPagoService.getRecent(limit));

                // Manejar Result<FormaPago[]> - el backend devuelve array directo en value
                if (response.isSuccess && response.value) {
                    const formasPago = Array.isArray(response.value) ? response.value : (response.value as any).items || [];
                    patchState(store, { loading: false });
                    return formasPago;
                } else {
                    const errorMsg = response.error?.message || 'Error al cargar formas de pago recientes';
                    patchState(store, { loading: false, error: errorMsg });
                    throw new Error(errorMsg);
                }
            } catch (err: any) {
                const errorMsg = err.message || 'Error al cargar formas de pago recientes';
                patchState(store, { loading: false, error: errorMsg });
                throw err;
            }
        },

        clearError() {
            patchState(store, { error: null });
        }
    }))
);
