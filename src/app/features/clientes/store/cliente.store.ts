import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, firstValueFrom } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { tapResponse } from '@ngrx/operators';
import { ClienteService } from '@/core/services/api/cliente.service';
import { Cliente } from '@/core/models/cliente.model';
import { ErrorResponse } from '@/core/models/error-response.model';

interface ClienteState {
    clientes: Cliente[];
    totalRecords: number;
    loading: boolean;
    error: string | null;
    lastUpdated: number | null;
    searchCache: Map<string, Cliente[]>;
}

const initialState: ClienteState = {
    clientes: [],
    totalRecords: 0,
    loading: false,
    error: null,
    lastUpdated: null,
    searchCache: new Map()
};

export const ClienteStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),
    
    withComputed((store) => ({
        totalClientes: computed(() => store.clientes().length),
        hasData: computed(() => store.clientes().length > 0)
    })),
    
    withComputed((store) => ({
        isSyncing: computed(() => store.loading() && store.hasData())
    })),
    
    withMethods((store, clienteService = inject(ClienteService)) => ({
        async search(query: string, limit: number = 10): Promise<Cliente[]> {
            const cacheKey = `${query}_${limit}`;
            const cached = store.searchCache().get(cacheKey);
            if (cached) return cached;
            
            patchState(store, { loading: true, error: null });
            try {
                const response = await firstValueFrom(clienteService.search(query, limit));

                if (response.isSuccess && response.value) {
                    const clientes = Array.isArray(response.value) ? response.value : (response.value as any).items || [];
                    const newCache = new Map(store.searchCache());
                    newCache.set(cacheKey, clientes);
                    patchState(store, { clientes, loading: false, searchCache: newCache, lastUpdated: Date.now() });
                    return clientes;
                } else {
                    const errorMsg = response.error?.message || 'Error al buscar clientes';
                    patchState(store, { loading: false, error: errorMsg });
                    throw new Error(errorMsg);
                }
            } catch (err: any) {
                const errorMsg = err.message || 'Error al buscar clientes';
                patchState(store, { loading: false, error: errorMsg });
                throw err;
            }
        },

        async create(nombre: string): Promise<string> {
            const tempId = `temp_${Date.now()}`;
            const tempCliente: Partial<Cliente> & { id: string; nombre: string } = { 
                id: tempId, 
                nombre,
                fechaCreacion: new Date(),
                usuarioId: ''
            };
            
            patchState(store, { 
                clientes: [...store.clientes(), tempCliente as Cliente],
                loading: true,
                error: null
            });
            
            try {
                const response = await firstValueFrom(clienteService.create(nombre));

                if (response.isSuccess) {
                    const realCliente: Partial<Cliente> & { id: string; nombre: string } = { 
                        id: response.value, 
                        nombre,
                        fechaCreacion: new Date(),
                        usuarioId: ''
                    };
                    patchState(store, { 
                        clientes: store.clientes().map(c => c.id === tempId ? realCliente as Cliente : c),
                        loading: false,
                        lastUpdated: Date.now(),
                        searchCache: new Map()
                    });
                    return response.value;
                }
                throw new Error(response.error?.message || 'Error al crear cliente');
            } catch (err) {
                // ROLLBACK: Eliminar cliente temporal y restaurar totalRecords
                patchState(store, { 
                    clientes: store.clientes().filter(c => c.id !== tempId),
                    totalRecords: store.totalRecords() - 1,
                    loading: false,
                    error: (err as Error).message,
                    searchCache: new Map() // Invalidar caché
                });
                throw err;
            }
        },

        loadClienteesPaginated: rxMethod<{
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
                    clienteService.getClientes(page, pageSize, searchTerm, sortColumn, sortOrder).pipe(
                        tapResponse({
                            next: (response) => {
                                patchState(store, {
                                    clientes: response.items,
                                    totalRecords: response.totalCount,
                                    loading: false,
                                    error: null,
                                    lastUpdated: Date.now(),
                                    searchCache: new Map()
                                });
                            },
                            error: (error: any) => {
                                console.error('[STORE] Error al cargar clientes:', error);
                                patchState(store, {
                                    loading: false,
                                    error: error.userMessage || 'Error al cargar clientes'
                                });
                            }
                        })
                    )
                )
            )
        ),

        async update(id: string, cliente: Partial<Cliente>): Promise<string> {
            const clienteAnterior = store.clientes().find(c => c.id === id);
            
            if (clienteAnterior) {
                patchState(store, {
                    clientes: store.clientes().map(c => c.id === id ? { ...c, ...cliente } : c),
                    loading: true,
                    error: null
                });
            }
            
            try {
                const response = await firstValueFrom(clienteService.update(id, cliente));

                if (response.isSuccess) {
                    patchState(store, { 
                        loading: false,
                        lastUpdated: Date.now(),
                        searchCache: new Map()
                    });
                    return response.value;
                }
                throw new Error(response.error?.message || 'Error al actualizar cliente');
            } catch (err) {
                // ROLLBACK: Restaurar cliente anterior
                if (clienteAnterior) {
                    patchState(store, {
                        clientes: store.clientes().map(c => c.id === id ? clienteAnterior : c),
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

        deleteCliente: rxMethod<string>(
            pipe(
                switchMap((id) => {
                    // Guardar cliente para rollback ANTES de eliminarlo
                    const clienteEliminado = store.clientes().find(c => c.id === id);
                    const totalAnterior = store.totalRecords();
                    
                    // Actualización optimista: eliminar inmediatamente
                    patchState(store, (state) => ({
                        clientes: state.clientes.filter((c) => c.id !== id),
                        totalRecords: state.totalRecords - 1,
                        searchCache: new Map()
                    }));
                    
                    return clienteService.delete(id).pipe(
                        tapResponse({
                            next: () => {
                                patchState(store, { lastUpdated: Date.now() });
                            },
                            error: (err: ErrorResponse) => {
                                console.error('[STORE] Error al eliminar cliente:', err);
                                
                                // ROLLBACK: Restaurar cliente eliminado
                                if (clienteEliminado) {
                                    patchState(store, (state) => ({
                                        clientes: [...state.clientes, clienteEliminado].sort((a, b) => a.nombre.localeCompare(b.nombre)),
                                        totalRecords: totalAnterior,
                                        error: err.detail || 'Error al eliminar cliente'
                                    }));
                                } else {
                                    patchState(store, { error: err.detail || 'Error al eliminar cliente' });
                                }
                            }
                        })
                    );
                })
            )
        ),

        async getRecent(limit: number = 5): Promise<Cliente[]> {
            patchState(store, { loading: true, error: null });
            try {
                const response = await firstValueFrom(clienteService.getRecent(limit));

                // Manejar Result<Cliente[]> - el backend devuelve array directo en value
                if (response.isSuccess && response.value) {
                    const clientes = Array.isArray(response.value) ? response.value : (response.value as any).items || [];
                    patchState(store, { loading: false });
                    return clientes;
                } else {
                    const errorMsg = response.error?.message || 'Error al cargar clientes recientes';
                    patchState(store, { loading: false, error: errorMsg });
                    throw new Error(errorMsg);
                }
            } catch (err: any) {
                const errorMsg = err.message || 'Error al cargar clientes recientes';
                patchState(store, { loading: false, error: errorMsg });
                throw err;
            }
        },

        clearError() {
            patchState(store, { error: null });
        }
    }))
);
