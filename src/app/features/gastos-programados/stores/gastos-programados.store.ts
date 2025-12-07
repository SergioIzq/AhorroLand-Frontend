import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { GastoProgramadoService } from '@/core/services/api/gasto-programado.service';
import { GastoProgramado } from '@/core/models/gasto-programado.model';

interface GastosProgramadosState {
    gastosProgramados: GastoProgramado[];
    selectedGasto: GastoProgramado | null;
    loading: boolean;
    error: string | null;
    totalRecords: number;
}

const initialState: GastosProgramadosState = {
    gastosProgramados: [],
    selectedGasto: null,
    loading: false,
    error: null,
    totalRecords: 0
};

export const GastosProgramadosStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),

    withComputed((store) => ({
        count: computed(() => store.gastosProgramados().length),
        activos: computed(() => store.gastosProgramados().filter(g => g.activo)),
        inactivos: computed(() => store.gastosProgramados().filter(g => !g.activo))
    })),

    withMethods((store, service = inject(GastoProgramadoService)) => ({
        loadGastosProgramadosPaginated: rxMethod<{
            page: number;
            pageSize: number;
            searchTerm?: string;
            sortColumn?: string;
            sortOrder?: string;
        }>(
            pipe(
                tap(() => patchState(store, { loading: true })),
                switchMap(({ page, pageSize, searchTerm, sortColumn, sortOrder }) =>
                    service.getGastosProgramados(page, pageSize, searchTerm, sortColumn, sortOrder).pipe(
                        tapResponse({
                            next: (response) => {
                                patchState(store, {
                                    gastosProgramados: response.items,
                                    totalRecords: response.totalCount,
                                    loading: false,
                                    error: null
                                });
                            },
                            error: (error: any) => {
                                patchState(store, {
                                    loading: false,
                                    error: error.message || 'Error al cargar gastos programados'
                                });
                            }
                        })
                    )
                )
            )
        ),

        createGasto: rxMethod<any>(
            pipe(
                tap(() => patchState(store, { loading: true })),
                switchMap((gasto) =>
                    service.create(gasto).pipe(
                        tapResponse({
                            next: () => {
                                patchState(store, { loading: false, error: null });
                            },
                            error: (error: any) => {
                                patchState(store, {
                                    loading: false,
                                    error: error.message || 'Error al crear gasto programado'
                                });
                            }
                        })
                    )
                )
            )
        ),

        updateGasto: rxMethod<{ id: string; gasto: Partial<GastoProgramado> }>(
            pipe(
                tap(() => patchState(store, { loading: true })),
                switchMap(({ id, gasto }) =>
                    service.update(id, gasto).pipe(
                        tapResponse({
                            next: (updatedGasto) => {
                                const gastos = store.gastosProgramados().map((g) => 
                                    g.id === id ? updatedGasto : g
                                );
                                patchState(store, {
                                    gastosProgramados: gastos,
                                    loading: false,
                                    error: null
                                });
                            },
                            error: (error: any) => {
                                patchState(store, {
                                    loading: false,
                                    error: error.message || 'Error al actualizar gasto programado'
                                });
                            }
                        })
                    )
                )
            )
        ),

        deleteGasto: rxMethod<string>(
            pipe(
                tap((id) => {
                    const gastos = store.gastosProgramados().filter((g) => g.id !== id);
                    patchState(store, { gastosProgramados: gastos });
                }),
                switchMap((id) =>
                    service.delete(id).pipe(
                        tapResponse({
                            next: () => {
                                patchState(store, { error: null });
                            },
                            error: (error: any) => {
                                patchState(store, {
                                    error: error.message || 'Error al eliminar gasto programado'
                                });
                            }
                        })
                    )
                )
            )
        ),

        toggleActivo: rxMethod<{ id: string; activo: boolean }>(
            pipe(
                switchMap(({ id, activo }) =>
                    service.toggleActivo(id, activo).pipe(
                        tapResponse({
                            next: () => {
                                const gastos = store.gastosProgramados().map((g) =>
                                    g.id === id ? { ...g, activo } : g
                                );
                                patchState(store, { gastosProgramados: gastos, error: null });
                            },
                            error: (error: any) => {
                                patchState(store, {
                                    error: error.message || 'Error al cambiar estado'
                                });
                            }
                        })
                    )
                )
            )
        ),

        selectGasto(gasto: GastoProgramado | null) {
            patchState(store, { selectedGasto: gasto });
        },

        clearError() {
            patchState(store, { error: null });
        }
    }))
);
