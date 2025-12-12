import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { firstValueFrom, pipe, switchMap, tap } from 'rxjs';
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
        activos: computed(() => store.gastosProgramados().filter((g) => g.activo)),
        inactivos: computed(() => store.gastosProgramados().filter((g) => !g.activo))
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
                switchMap((gasto) => {
                    const tempId = `temp_${Date.now()}`;
                    const tempGasto: GastoProgramado = {
                        id: tempId,
                        conceptoId: gasto.conceptoId,
                        conceptoNombre: '',
                        categoriaId: gasto.categoriaId,
                        categoriaNombre: '',
                        proveedorId: gasto.proveedorId,
                        proveedorNombre: '',
                        personaId: gasto.personaId,
                        personaNombre: '',
                        cuentaId: gasto.cuentaId,
                        cuentaNombre: '',
                        formaPagoId: gasto.formaPagoId,
                        formaPagoNombre: '',
                        importe: gasto.importe,
                        descripcion: gasto.descripcion,
                        fechaEjecucion: gasto.fechaEjecucion,
                        frecuencia: gasto.frecuencia,
                        activo: gasto.activo ?? true,
                        usuarioId: ''
                    };

                    patchState(store, {
                        gastosProgramados: [tempGasto, ...store.gastosProgramados()],
                        totalRecords: store.totalRecords() + 1,
                        loading: true
                    });

                    return service.create(gasto).pipe(
                        tapResponse({
                            next: (id: string) => {
                                patchState(store, {
                                    gastosProgramados: store.gastosProgramados().map(g =>
                                        g.id === tempId ? { ...tempGasto, id } : g
                                    ),
                                    loading: false,
                                    error: null
                                });
                            },
                            error: (error: any) => {
                                patchState(store, {
                                    gastosProgramados: store.gastosProgramados().filter(g => g.id !== tempId),
                                    totalRecords: store.totalRecords() - 1,
                                    loading: false,
                                    error: error.message || 'Error al crear gasto programado'
                                });
                            }
                        })
                    );
                })
            )
        ),

        async update(id: string, gasto: Partial<GastoProgramado>): Promise<string> {
            const gastoAnterior = store.gastosProgramados().find(g => g.id === id);

            patchState(store, {
                gastosProgramados: store.gastosProgramados().map(g =>
                    g.id === id ? { ...g, ...gasto } : g
                ),
                loading: true
            });

            try {
                const response = await firstValueFrom(service.update(id, gasto));

                if (response.isSuccess) {
                    patchState(store, { loading: false });
                    return response.value;
                }
                throw new Error(response.error?.message || 'Error al actualizar gasto programado');
            } catch (err) {
                if (gastoAnterior) {
                    patchState(store, {
                        gastosProgramados: store.gastosProgramados().map(g =>
                            g.id === id ? gastoAnterior : g
                        )
                    });
                }
                patchState(store, { loading: false });
                throw err;
            }
        },

        deleteGasto: rxMethod<string>(
            pipe(
                switchMap((id) => {
                    const gastoEliminado = store.gastosProgramados().find(g => g.id === id);
                    const totalAnterior = store.totalRecords();

                    patchState(store, {
                        gastosProgramados: store.gastosProgramados().filter(g => g.id !== id),
                        totalRecords: store.totalRecords() - 1
                    });

                    return service.delete(id).pipe(
                        tapResponse({
                            next: () => {
                                patchState(store, { error: null });
                            },
                            error: (error: any) => {
                                if (gastoEliminado) {
                                    patchState(store, {
                                        gastosProgramados: [...store.gastosProgramados(), gastoEliminado],
                                        totalRecords: totalAnterior,
                                        error: error.message || 'Error al eliminar gasto programado'
                                    });
                                } else {
                                    patchState(store, {
                                        error: error.message || 'Error al eliminar gasto programado'
                                    });
                                }
                            }
                        })
                    );
                })
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
