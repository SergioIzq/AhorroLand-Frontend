import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { firstValueFrom, pipe, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { TraspasoService } from '@/core/services/api/traspaso.service';
import { Traspaso, TraspasoCreate } from '@/core/models/traspaso.model';

interface TraspasosState {
    traspasos: Traspaso[];
    selectedTraspaso: Traspaso | null;
    loading: boolean;
    error: string | null;
    totalRecords: number;
}

const initialState: TraspasosState = {
    traspasos: [],
    selectedTraspaso: null,
    loading: false,
    error: null,
    totalRecords: 0
};

export const TraspasosStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),
    withComputed((store) => ({
        count: computed(() => store.traspasos().length)
    })),
    withMethods((store, traspasoService = inject(TraspasoService)) => ({
        loadTraspasosPaginated: rxMethod<{
            page: number;
            pageSize: number;
            searchTerm?: string;
            sortColumn?: string;
            sortOrder?: string;
        }>(
            pipe(
                tap(({ page, pageSize, searchTerm, sortColumn, sortOrder }) => {
                    patchState(store, { loading: true, error: null });
                }),
                switchMap(({ page, pageSize, searchTerm, sortColumn, sortOrder }) =>
                    traspasoService.getTraspasos(page, pageSize, searchTerm, sortColumn, sortOrder).pipe(
                        tapResponse({
                            next: (response) => {
                                patchState(store, {
                                    traspasos: response.items,
                                    totalRecords: response.totalCount,
                                    loading: false,
                                    error: null
                                });
                            },
                            error: (error: any) => {
                                console.error('[STORE] Error al cargar traspasos:', error);
                                patchState(store, {
                                    loading: false,
                                    error: error.userMessage || 'Error al cargar traspasos'
                                });
                            }
                        })
                    )
                )
            )
        ),


        // Crear traspaso con actualización optimista
        async createTraspaso(traspaso: TraspasoCreate): Promise<string> {
            const tempId = `temp_${Date.now()}`;
            const tempTraspaso: Traspaso = {
                id: tempId,
                cuentaOrigenId: traspaso.cuentaOrigenId,
                cuentaOrigenNombre: '',
                cuentaDestinoId: traspaso.cuentaDestinoId,
                cuentaDestinoNombre: '',
                fecha: traspaso.fecha,
                importe: traspaso.importe,
                descripcion: traspaso.descripcion,
                usuarioId: ''
            };

            patchState(store, {
                traspasos: [tempTraspaso, ...store.traspasos()],
                totalRecords: store.totalRecords() + 1,
                loading: true,
                error: null
            });

            try {
                const newTraspasoId = await firstValueFrom(traspasoService.create(traspaso));
                patchState(store, {
                    traspasos: store.traspasos().map(t =>
                        t.id === tempId ? { ...tempTraspaso, id: newTraspasoId } : t
                    ),
                    loading: false
                });
                return newTraspasoId;
            } catch (error: any) {
                patchState(store, {
                    traspasos: store.traspasos().filter(t => t.id !== tempId),
                    totalRecords: store.totalRecords() - 1,
                    loading: false,
                    error: error.userMessage || 'Error al crear traspaso'
                });
                throw error;
            }
        },

        // Actualizar traspaso con actualización optimista
        async updateTraspaso(payload: { id: string; traspaso: Partial<Traspaso> }): Promise<void> {
            const { id, traspaso } = payload;
            const traspasoAnterior = store.traspasos().find(t => t.id === id);

            const traspasos = store.traspasos().map((t) => (t.id === id ? { ...t, ...traspaso } : t));
            patchState(store, { traspasos, loading: true, error: null });

            try {
                await firstValueFrom(traspasoService.update(id, traspaso));
                patchState(store, { loading: false });
            } catch (error: any) {
                if (traspasoAnterior) {
                    const revertedTraspasos = store.traspasos().map(t =>
                        t.id === id ? traspasoAnterior : t
                    );
                    patchState(store, { traspasos: revertedTraspasos });
                }
                patchState(store, {
                    loading: false,
                    error: error.userMessage || 'Error al actualizar traspaso'
                });
                throw error;
            }
        },

        deleteTraspaso: rxMethod<string>(
            pipe(
                switchMap((id) => {
                    const traspasoEliminado = store.traspasos().find(t => t.id === id);
                    const totalAnterior = store.totalRecords();

                    patchState(store, {
                        traspasos: store.traspasos().filter(t => t.id !== id),
                        totalRecords: store.totalRecords() - 1
                    });

                    return traspasoService.delete(id).pipe(
                        tapResponse({
                            next: () => {
                                patchState(store, { error: null });
                            },
                            error: (error: any) => {
                                if (traspasoEliminado) {
                                    patchState(store, {
                                        traspasos: [...store.traspasos(), traspasoEliminado],
                                        totalRecords: totalAnterior,
                                        error: error.message || 'Error al eliminar traspaso'
                                    });
                                } else {
                                    patchState(store, { error: error.message || 'Error al eliminar traspaso' });
                                }
                            }
                        })
                    );
                })
            )
        )
    }))
);
