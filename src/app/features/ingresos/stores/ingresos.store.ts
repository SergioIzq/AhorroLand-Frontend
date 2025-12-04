import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, debounceTime, firstValueFrom } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { IngresoService } from '@/core/services/api/ingreso.service';
import { Ingreso, IngresoCreate } from '@/core/models';

interface IngresosState {
    ingresos: Ingreso[];
    selectedIngreso: Ingreso | null;
    loading: boolean;
    error: string | null;
    totalIngresos: number;
    totalRecords: number;
    filters: {
        fechaInicio: string;
        fechaFin: string;
        tipo: string;
        searchTerm: string;
        sortColumn: string;
        sortOrder: string;
    };
}

const initialState: IngresosState = {
    ingresos: [],
    selectedIngreso: null,
    loading: false,
    error: null,
    totalIngresos: 0,
    totalRecords: 0,
    filters: {
        fechaInicio: '',
        fechaFin: '',
        tipo: '',
        searchTerm: '',
        sortColumn: '',
        sortOrder: ''
    }
};

/**
 * Signal Store para gestión de ingresos
 * Optimizado con computed, cache y operaciones reactivas
 */
export const IngresosStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),

    withComputed((store: any) => ({
        // Total calculado de ingresos
        total: computed(() => store.ingresos().reduce((sum: number, i: Ingreso) => sum + i.importe, 0)),

        // Cantidad de ingresos
        count: computed(() => store.ingresos().length),

        // Ingresos filtrados por término de búsqueda
        filteredIngresos: computed(() => {
            const ingresos = store.ingresos();
            const searchTerm = store.filters.searchTerm().toLowerCase();

            if (!searchTerm) return ingresos;

            return ingresos.filter((i: Ingreso) => i.importe.toString().toLowerCase().includes(searchTerm) || i.categoriaNombre?.toLowerCase().includes(searchTerm) || i.descripcion?.toLowerCase().includes(searchTerm));
        }),

        // Ingresos por tipo
        ingresosPorTipo: computed(() => {
            const ingresos = store.ingresos();
            const tipos: Record<string, { total: number; count: number }> = {};

            ingresos.forEach((ingreso: Ingreso) => {
                const tipo = ingreso.categoriaNombre || 'Sin tipo';
                if (!tipos[tipo]) {
                    tipos[tipo] = { total: 0, count: 0 };
                }
                tipos[tipo].total += ingreso.importe;
                tipos[tipo].count++;
            });

            return tipos;
        }),

        // Ingresos recientes (últimos 5)
        ingresosRecientes: computed(() => [...store.ingresos()].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 5)),

        // Promedio de ingresos
        promedioIngresos: computed(() => {
            const ingresos = store.ingresos();
            return ingresos.length > 0 ? ingresos.reduce((sum: number, i: Ingreso) => sum + i.importe, 0) / ingresos.length : 0;
        })
    })),

    withMethods((store: any, ingresoService = inject(IngresoService)) => ({
        // Cargar ingresos
        loadIngresos: rxMethod<void>(
            pipe(
                tap(() => patchState(store, { loading: true, error: null })),
                switchMap(() =>
                    ingresoService.getAllIngresos().pipe(
                        tapResponse({
                            next: (ingresos: Ingreso[]) => {
                                patchState(store, {
                                    ingresos,
                                    loading: false,
                                    error: null
                                });
                            },
                            error: (error: any) => {
                                patchState(store, {
                                    loading: false,
                                    error: error.userMessage || 'Error al cargar ingresos'
                                });
                            }
                        })
                    )
                )
            )
        ),

        // Cargar ingresos con paginación, búsqueda y ordenamiento
        loadIngresosPaginated: rxMethod<{
            page: number;
            pageSize: number;
            searchTerm?: string;
            sortColumn?: string;
            sortOrder?: string;
        }>(
            pipe(
                tap(({ page, pageSize, searchTerm, sortColumn, sortOrder }) => {
                    console.log('[STORE] Cargando:', { page, pageSize, searchTerm, sortColumn, sortOrder });
                    patchState(store, { loading: true, error: null });
                }),
                switchMap(({ page, pageSize, searchTerm, sortColumn, sortOrder }) =>
                    ingresoService.getIngresos(page, pageSize, searchTerm, sortColumn, sortOrder).pipe(
                        tapResponse({
                            next: (response: any) => {
                                console.log('[STORE] Respuesta recibida:', response);
                                patchState(store, {
                                    ingresos: response.items,
                                    totalRecords: response.totalCount,
                                    loading: false,
                                    error: null
                                });
                            },
                            error: (error: any) => {
                                console.error('[STORE] Error al cargar ingresos:', error);
                                patchState(store, {
                                    loading: false,
                                    error: error.userMessage || 'Error al cargar ingresos'
                                });
                            }
                        })
                    )
                )
            )
        ),

        // Cargar ingresos por período
        loadIngresosPorPeriodo: rxMethod<{ fechaInicio: string; fechaFin: string }>(
            pipe(
                tap(({ fechaInicio, fechaFin }) => patchState(store, { loading: true, error: null })),
                switchMap(({ fechaInicio, fechaFin }) =>
                    ingresoService.getIngresosPorPeriodo(fechaInicio, fechaFin).pipe(
                        tapResponse({
                            next: (ingresos: Ingreso[]) => {
                                patchState(store, {
                                    ingresos,
                                    loading: false,
                                    filters: { ...store.filters(), fechaInicio, fechaFin }
                                });
                            },
                            error: (error: any) => {
                                patchState(store, {
                                    loading: false,
                                    error: error.userMessage || 'Error al cargar ingresos'
                                });
                            }
                        })
                    )
                )
            )
        ),

        // Crear ingreso
        async createIngreso(ingreso: IngresoCreate): Promise<string> {
            patchState(store, { loading: true, error: null });
            
            try {
                const newIngresoId = await firstValueFrom(ingresoService.create(ingreso));
                // El backend solo devuelve el ID, no el objeto completo
                // Necesitaremos recargar la lista o hacer un fetch del ingreso por ID
                patchState(store, { loading: false });
                return newIngresoId;
            } catch (error: any) {
                patchState(store, {
                    loading: false,
                    error: error.userMessage || 'Error al crear ingreso'
                });
                throw error;
            }
        },

        // Actualizar ingreso
        async updateIngreso(payload: { id: string; ingreso: Partial<Ingreso> }): Promise<void> {
            const { id, ingreso } = payload;

            // 1. Loading
            patchState(store, { loading: true, error: null });

            try {
                // 2. Llamada al API (Esperamos que termine)
                // El servicio devuelve void, así que no capturamos respuesta aquí
                await firstValueFrom(ingresoService.update(id, ingreso));

                // 3. Actualizar Estado Local (Optimista/Manual)
                // Como el backend no devuelve el objeto, lo construimos nosotros:
                // Nuevo = Viejo + Cambios
                const currentIngresos = store.ingresos();

                const updatedIngresos = currentIngresos.map((item: Ingreso) => {
                    if (item.id === id) {
                        // Mezclamos el item existente con los cambios parciales
                        return { ...item, ...ingreso };
                    }
                    return item;
                });

                patchState(store, {
                    ingresos: updatedIngresos,
                    loading: false
                });
            } catch (err: any) {
                // 4. Manejo de Errores
                patchState(store, {
                    loading: false,
                    error: err.userMessage || 'Error al actualizar ingreso'
                });

                // Relanzamos para que el componente se entere y no cierre el modal
                throw err;
            }
        },

        // Eliminar ingreso
        async deleteIngreso(id: string): Promise<void> {
            patchState(store, { loading: true, error: null });
            
            try {
                await firstValueFrom(ingresoService.delete(id));
                const ingresos = store.ingresos().filter((i: Ingreso) => i.id !== id);
                patchState(store, { ingresos, loading: false });
            } catch (error: any) {
                patchState(store, {
                    loading: false,
                    error: error.userMessage || 'Error al eliminar ingreso'
                });
                throw error;
            }
        },

        // Buscar ingresos con debounce
        searchIngresos: rxMethod<string>(
            pipe(
                debounceTime(300), // Esperar 300ms después de dejar de escribir
                tap((searchTerm) => {
                    patchState(store, {
                        filters: { ...store.filters(), searchTerm }
                    });
                })
            )
        ),

        // Seleccionar ingreso
        selectIngreso(ingreso: Ingreso | null) {
            patchState(store, { selectedIngreso: ingreso });
        },

        // Actualizar filtros
        setFilters(filters: Partial<IngresosState['filters']>) {
            patchState(store, {
                filters: { ...store.filters(), ...filters }
            });
        },

        // Limpiar error
        clearError() {
            patchState(store, { error: null });
        }
    }))
);
