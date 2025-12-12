import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, firstValueFrom } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { tapResponse } from '@ngrx/operators';
import { ProveedorService } from '@/core/services/api/proveedor.service';
import { Proveedor } from '@/core/models/proveedor.model';
import { ErrorResponse } from '@/core/models/error-response.model';

interface ProveedorState {
    proveedores: Proveedor[];
    totalRecords: number;
    loading: boolean;
    error: string | null;
    lastUpdated: number | null;
    searchCache: Map<string, Proveedor[]>;
}

const initialState: ProveedorState = {
    proveedores: [],
    totalRecords: 0,
    loading: false,
    error: null,
    lastUpdated: null,
    searchCache: new Map()
};

export const ProveedorStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),

    withComputed((store) => ({
        totalProveedores: computed(() => store.proveedores().length),
        hasData: computed(() => store.proveedores().length > 0),
    })),

    withComputed((store) => ({
        isSyncing: computed(() => store.loading() && store.hasData())
    })),

    withMethods((store, proveedorService = inject(ProveedorService)) => ({
        async search(query: string, limit: number = 10): Promise<Proveedor[]> {
            const cacheKey = `${query}_${limit}`;
            const cached = store.searchCache().get(cacheKey);
            if (cached) return cached;

            patchState(store, { loading: true, error: null });
            try {
                const response = await firstValueFrom(proveedorService.search(query, limit));

                if (response.isSuccess && response.value) {
                    const proveedores = Array.isArray(response.value) ? response.value : (response.value as any).items || [];
                    const newCache = new Map(store.searchCache());
                    newCache.set(cacheKey, proveedores);
                    patchState(store, { loading: false, searchCache: newCache, lastUpdated: Date.now() });
                    return proveedores;
                } else {
                    const errorMsg = response.error?.message || 'Error al buscar proveedores';
                    patchState(store, { loading: false, error: errorMsg });
                    throw new Error(errorMsg);
                }
            } catch (err: any) {
                const errorMsg = err.message || 'Error al buscar proveedores';
                patchState(store, { loading: false, error: errorMsg });
                throw err;
            }
        },

        async create(nombre: string): Promise<string> {
            const tempId = `temp_${Date.now()}`;
            const tempProveedor: Proveedor = { id: tempId, nombre, fechaCreacion: new Date(), usuarioId: '' };

            patchState(store, {
                proveedores: [...store.proveedores(), tempProveedor],
                loading: true,
                error: null
            });

            try {
                const response = await firstValueFrom(proveedorService.create(nombre));

                if (response.isSuccess) {
                    const realProveedor: Proveedor = { id: response.value, nombre, fechaCreacion: new Date(), usuarioId: '' };
                    patchState(store, {
                        proveedores: store.proveedores().map((p) => (p.id === tempId ? realProveedor : p)),
                        loading: false,
                        lastUpdated: Date.now(),
                        searchCache: new Map()
                    });
                    return response.value;
                }
                throw new Error(response.error?.message || 'Error al crear proveedor');
            } catch (err) {
                patchState(store, {
                    proveedores: store.proveedores().filter((p) => p.id !== tempId),
                    loading: false,
                    error: (err as Error).message
                });
                throw err;
            }
        },

        loadProveedoresPaginated: rxMethod<{
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
                    proveedorService.getProveedores(page, pageSize, searchTerm, sortColumn, sortOrder).pipe(
                        tapResponse({
                            next: (response) => {
                                patchState(store, {
                                    proveedores: response.items,
                                    totalRecords: response.totalCount,
                                    loading: false,
                                    error: null,
                                    lastUpdated: Date.now(),
                                    searchCache: new Map()
                                });
                            },
                            error: (error: any) => {
                                console.error('[STORE] Error al cargar proveedores:', error);
                                patchState(store, {
                                    loading: false,
                                    error: error.userMessage || 'Error al cargar proveedores'
                                });
                            }
                        })
                    )
                )
            )
        ),

        async update(id: string, proveedor: Partial<Proveedor>): Promise<string> {
            const proveedorAnterior = store.proveedores().find((p) => p.id === id);

            if (proveedorAnterior) {
                patchState(store, {
                    proveedores: store.proveedores().map((p) => (p.id === id ? { ...p, ...proveedor } : p)),
                    loading: true,
                    error: null
                });
            }

            try {
                const response = await firstValueFrom(proveedorService.update(id, proveedor));

                if (response.isSuccess) {
                    patchState(store, {
                        loading: false,
                        lastUpdated: Date.now(),
                        searchCache: new Map()
                    });
                    return response.value;
                }
                throw new Error(response.error?.message || 'Error al actualizar proveedor');
            } catch (err) {
                if (proveedorAnterior) {
                    patchState(store, {
                        proveedores: store.proveedores().map((p) => (p.id === id ? proveedorAnterior : p))
                    });
                }
                patchState(store, {
                    loading: false,
                    error: (err as Error).message
                });
                throw err;
            }
        },

        deleteProveedor: rxMethod<string>(
            pipe(
                switchMap((id) => {
                    // Guardar proveedor para rollback ANTES de eliminarlo
                    const proveedorEliminado = store.proveedores().find(p => p.id === id);
                    const totalAnterior = store.totalRecords();
                    
                    // Actualización optimista: eliminar inmediatamente
                    patchState(store, (state) => ({
                        proveedores: state.proveedores.filter((p) => p.id !== id),
                        totalRecords: state.totalRecords - 1,
                        searchCache: new Map()
                    }));
                    
                    return proveedorService.delete(id).pipe(
                        tapResponse({
                            next: () => {
                                patchState(store, { lastUpdated: Date.now() });
                            },
                            error: (err: ErrorResponse) => {
                                console.error('[STORE] Error al eliminar proveedor:', err);
                                
                                // ROLLBACK: Restaurar proveedor eliminado
                                if (proveedorEliminado) {
                                    patchState(store, (state) => ({
                                        proveedores: [...state.proveedores, proveedorEliminado].sort((a, b) => a.nombre.localeCompare(b.nombre)),
                                        totalRecords: totalAnterior,
                                        error: err.detail || 'Error al eliminar proveedor'
                                    }));
                                } else {
                                    patchState(store, { error: err.detail || 'Error al eliminar proveedor' });
                                }
                            }
                        })
                    );
                })
            )
        ),

        async getRecent(limit: number = 5): Promise<Proveedor[]> {
            patchState(store, { loading: true, error: null });
            try {
                const response = await firstValueFrom(proveedorService.getRecent(limit));

                // Manejar Result<Proveedor[]> - el backend devuelve array directo en value
                if (response.isSuccess && response.value) {
                    const proveedores = Array.isArray(response.value) ? response.value : (response.value as any).items || [];
                    patchState(store, { loading: false });
                    return proveedores;
                } else {
                    const errorMsg = response.error?.message || 'Error al cargar proveedores recientes';
                    patchState(store, { loading: false, error: errorMsg });
                    throw new Error(errorMsg);
                }
            } catch (err: any) {
                const errorMsg = err.message || 'Error al cargar proveedores recientes';
                patchState(store, { loading: false, error: errorMsg });
                throw err;
            }
        },

        clearError() {
            patchState(store, { error: null });
        }
    }))
);
