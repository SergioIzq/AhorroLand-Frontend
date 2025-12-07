import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
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
}

const initialState: ClienteState = {
    clientes: [],
    totalRecords: 0,
    loading: false,
    error: null
};

export const ClienteStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),
    withMethods((store, clienteService = inject(ClienteService)) => ({
        async search(query: string, limit: number = 10): Promise<Cliente[]> {
            patchState(store, { loading: true, error: null });
            try {
                const response = await firstValueFrom(clienteService.search(query, limit));

                // Manejar Result<Cliente[]> - el backend devuelve array directo en value
                if (response.isSuccess && response.value) {
                    const clientes = Array.isArray(response.value) ? response.value : (response.value as any).items || [];
                    patchState(store, { clientes: clientes, loading: false });
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
            patchState(store, { loading: true });
            try {
                const response = await firstValueFrom(clienteService.create(nombre));

                if (response.isSuccess) {
                    patchState(store, { loading: false });
                    return response.value;
                }
                throw new Error(response.error?.message || 'Error al crear cliente');
            } catch (err) {
                patchState(store, { loading: false });
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
                                    error: null
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

        async update(id: string, cliente: Partial<Cliente>): Promise<Cliente> {
            patchState(store, { loading: true });
            try {
                const response = await firstValueFrom(clienteService.update(id, cliente));

                if (response.isSuccess) {
                    patchState(store, { loading: false });
                    return response.value;
                }
                throw new Error(response.error?.message || 'Error al actualizar cliente');
            } catch (err) {
                patchState(store, { loading: false });
                throw err;
            }
        },

        deleteCliente: rxMethod<string>(
            pipe(
                // 1. (Opcional) Actualización Optimista Inmediata: Lo borramos de la vista antes de ir al servidor
                tap((id) => {
                    patchState(store, (state) => ({
                        clientes: state.clientes.filter((c) => c.id !== id),
                        totalRecords: state.totalRecords - 1 // Ajustamos el contador visualmente
                    }));
                }),
                switchMap((id) =>
                    clienteService.delete(id).pipe(
                        tapResponse({
                            next: () => {},
                            error: (err: ErrorResponse) => {
                                console.error(err);
                                patchState(store, { error: err.detail || 'Error al eliminar cliente' });
                            }
                        })
                    )
                )
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
