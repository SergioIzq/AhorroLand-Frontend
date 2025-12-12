import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { firstValueFrom, pipe, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { IngresoProgramadoService } from '@/core/services/api/ingreso-programado.service';
import { IngresoProgramado } from '@/core/models/ingreso-programado.model';

interface IngresosProgramadosState {
    ingresosProgramados: IngresoProgramado[];
    selectedIngreso: IngresoProgramado | null;
    loading: boolean;
    error: string | null;
    totalRecords: number;
}

const initialState: IngresosProgramadosState = {
    ingresosProgramados: [],
    selectedIngreso: null,
    loading: false,
    error: null,
    totalRecords: 0
};

export const IngresosProgramadosStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),

    withComputed((store) => ({
        count: computed(() => store.ingresosProgramados().length),
        activos: computed(() => store.ingresosProgramados().filter(i => i.activo)),
        inactivos: computed(() => store.ingresosProgramados().filter(i => !i.activo))
    })),

    withMethods((store, service = inject(IngresoProgramadoService)) => ({
        loadIngresosProgramadosPaginated: rxMethod<{
            page: number;
            pageSize: number;
            searchTerm?: string;
            sortColumn?: string;
            sortOrder?: string;
        }>(
            pipe(
                tap(() => patchState(store, { loading: true })),
                switchMap(({ page, pageSize, searchTerm, sortColumn, sortOrder }) =>
                    service.getIngresosProgramados(page, pageSize, searchTerm, sortColumn, sortOrder).pipe(
                        tapResponse({
                            next: (response) => {
                                patchState(store, {
                                    ingresosProgramados: response.items,
                                    totalRecords: response.totalCount,
                                    loading: false,
                                    error: null
                                });
                            },
                            error: (error: any) => {
                                patchState(store, {
                                    loading: false,
                                    error: error.message || 'Error al cargar ingresos programados'
                                });
                            }
                        })
                    )
                )
            )
        ),

        createIngreso: rxMethod<any>(
            pipe(
                switchMap((ingreso) => {
                    const tempId = `temp_${Date.now()}`;
                    const tempIngreso: IngresoProgramado = {
                        id: tempId,
                        conceptoId: ingreso.conceptoId,
                        conceptoNombre: '',
                        categoriaId: ingreso.categoriaId,
                        categoriaNombre: '',
                        clienteId: ingreso.clienteId,
                        clienteNombre: '',
                        personaId: ingreso.personaId,
                        personaNombre: '',
                        cuentaId: ingreso.cuentaId,
                        cuentaNombre: '',
                        formaPagoId: ingreso.formaPagoId,
                        formaPagoNombre: '',
                        importe: ingreso.importe,
                        descripcion: ingreso.descripcion,
                        fechaEjecucion: ingreso.fechaEjecucion,
                        frecuencia: ingreso.frecuencia,
                        activo: ingreso.activo ?? true,
                        usuarioId: ''
                    };

                    patchState(store, {
                        ingresosProgramados: [tempIngreso, ...store.ingresosProgramados()],
                        totalRecords: store.totalRecords() + 1,
                        loading: true
                    });

                    return service.create(ingreso).pipe(
                        tapResponse({
                            next: (id: string) => {
                                patchState(store, {
                                    ingresosProgramados: store.ingresosProgramados().map(i =>
                                        i.id === tempId ? { ...tempIngreso, id } : i
                                    ),
                                    loading: false,
                                    error: null
                                });
                            },
                            error: (error: any) => {
                                patchState(store, {
                                    ingresosProgramados: store.ingresosProgramados().filter(i => i.id !== tempId),
                                    totalRecords: store.totalRecords() - 1,
                                    loading: false,
                                    error: error.message || 'Error al crear ingreso programado'
                                });
                            }
                        })
                    );
                })
            )
        ),

        async update(id: string, ingreso: Partial<IngresoProgramado>): Promise<string> {
            const ingresoAnterior = store.ingresosProgramados().find(i => i.id === id);

            patchState(store, {
                ingresosProgramados: store.ingresosProgramados().map(i =>
                    i.id === id ? { ...i, ...ingreso } : i
                ),
                loading: true
            });

            try {
                const response = await firstValueFrom(service.update(id, ingreso));

                if (response.isSuccess) {
                    patchState(store, { loading: false });
                    return response.value;
                }
                throw new Error(response.error?.message || 'Error al actualizar ingreso programado');
            } catch (err) {
                if (ingresoAnterior) {
                    patchState(store, {
                        ingresosProgramados: store.ingresosProgramados().map(i =>
                            i.id === id ? ingresoAnterior : i
                        )
                    });
                }
                patchState(store, { loading: false });
                throw err;
            }
        },

        deleteIngreso: rxMethod<string>(
            pipe(
                switchMap((id) => {
                    const ingresoEliminado = store.ingresosProgramados().find(i => i.id === id);
                    const totalAnterior = store.totalRecords();

                    patchState(store, {
                        ingresosProgramados: store.ingresosProgramados().filter(i => i.id !== id),
                        totalRecords: store.totalRecords() - 1
                    });

                    return service.delete(id).pipe(
                        tapResponse({
                            next: () => {
                                patchState(store, { error: null });
                            },
                            error: (error: any) => {
                                if (ingresoEliminado) {
                                    patchState(store, {
                                        ingresosProgramados: [...store.ingresosProgramados(), ingresoEliminado],
                                        totalRecords: totalAnterior,
                                        error: error.message || 'Error al eliminar ingreso programado'
                                    });
                                } else {
                                    patchState(store, {
                                        error: error.message || 'Error al eliminar ingreso programado'
                                    });
                                }
                            }
                        })
                    );
                })
            )
        ),

        selectIngreso(ingreso: IngresoProgramado | null) {
            patchState(store, { selectedIngreso: ingreso });
        },

        clearError() {
            patchState(store, { error: null });
        }
    }))
);
