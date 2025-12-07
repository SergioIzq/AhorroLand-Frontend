import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
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
}

const initialState: ProveedorState = {
    proveedores: [],
    totalRecords: 0,
    loading: false,
    error: null
};

export const ProveedorStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),
    withMethods((store, proveedorService = inject(ProveedorService)) => ({
        async search(query: string, limit: number = 10): Promise<Proveedor[]> {
            patchState(store, { loading: true, error: null });
            try {
                const response = await firstValueFrom(proveedorService.search(query, limit));

                // Manejar Result<Proveedor[]> - el backend devuelve array directo en value
                if (response.isSuccess && response.value) {
                    const proveedores = Array.isArray(response.value) ? response.value : (response.value as any).items || [];
                    patchState(store, { proveedores: proveedores, loading: false });
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
            patchState(store, { loading: true });
            try {
                const response = await firstValueFrom(proveedorService.create(nombre));

                if (response.isSuccess) {
                    patchState(store, { loading: false });
                    return response.value;
                }
                throw new Error(response.error?.message || 'Error al crear proveedor');
            } catch (err) {
                patchState(store, { loading: false });
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
                                    error: null
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

        async update(id: string, proveedor: Partial<Proveedor>): Promise<Proveedor> {
            patchState(store, { loading: true });
            try {
                const response = await firstValueFrom(proveedorService.update(id, proveedor));

                if (response.isSuccess) {
                    patchState(store, { loading: false });
                    return response.value;
                }
                throw new Error(response.error?.message || 'Error al actualizar proveedor');
            } catch (err) {
                patchState(store, { loading: false });
                throw err;
            }
        },

        deleteProveedor: rxMethod<string>(
            pipe(
                // 1. (Opcional) Actualización Optimista Inmediata: Lo borramos de la vista antes de ir al servidor
                tap((id) => {
                    patchState(store, (state) => ({
                        proveedores: state.proveedores.filter((c) => c.id !== id),
                        totalRecords: state.totalRecords - 1 // Ajustamos el contador visualmente
                    }));
                }),
                switchMap((id) =>
                    proveedorService.delete(id).pipe(
                        tapResponse({
                            next: () => {},
                            error: (err: ErrorResponse) => {
                                console.error(err);
                                patchState(store, { error: err.detail || 'Error al eliminar proveedor' });
                            }
                        })
                    )
                )
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
