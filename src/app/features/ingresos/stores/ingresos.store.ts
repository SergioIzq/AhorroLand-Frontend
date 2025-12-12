import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, debounceTime, firstValueFrom } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { IngresoService } from '@/core/services/api/ingreso.service';
import { Ingreso, IngresoCreate } from '@/core/models';
import { ErrorResponse } from '@/core/models/error-response.model';
import { ConceptoStore } from '@/features/conceptos/store/concepto.store';
import { CategoriaStore } from '@/features/categorias/store/categoria.store';
import { ClienteStore } from '@/features/clientes/store/cliente.store';
import { PersonaStore } from '@/features/personas/store/persona.store';
import { CuentaStore } from '@/features/cuentas/store/cuenta.store';
import { FormaPagoStore } from '@/features/formas-pago/store/forma-pago.store';

interface IngresosState {
    ingresos: Ingreso[];
    selectedIngreso: Ingreso | null;
    loading: boolean;
    error: string | null;
    totalIngresos: number;
    totalRecords: number;
    lastUpdated: number | null;
    searchCache: Map<string, Ingreso[]>;
    filters: {
        fechaInicio: string;
        fechaFin: string;
        categoria: string;
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
    lastUpdated: null,
    searchCache: new Map(),
    filters: {
        fechaInicio: '',
        fechaFin: '',
        categoria: '',
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

    withComputed((store) => ({
        // Total calculado de ingresos
        total: computed(() => {
            const ingresos = store.ingresos();
            if (!Array.isArray(ingresos)) return 0;
            return ingresos.reduce((sum, g) => sum + g.importe, 0);
        }),

        // Cantidad de ingresos
        count: computed(() => {
            const ingresos = store.ingresos();
            return Array.isArray(ingresos) ? ingresos.length : 0;
        }),

        // Indica si hay datos cargados
        hasData: computed(() => {
            const ingresos = store.ingresos();
            return Array.isArray(ingresos) && ingresos.length > 0;
        })
    })),

    withComputed((store) => ({
        // Estado de sincronización (separado para poder usar hasData)
        isSyncing: computed(() => store.loading() && store.hasData()),

        // Ingresos filtrados por término de búsqueda
        filteredIngresos: computed(() => {
            const ingresos = store.ingresos();
            if (!Array.isArray(ingresos)) return [];

            const searchTerm = store.filters().searchTerm.toLowerCase();

            if (!searchTerm) return ingresos;

            return ingresos.filter(
                (g) => g.conceptoNombre.toLowerCase().includes(searchTerm) || g.categoriaNombre?.toLowerCase().includes(searchTerm) || g.clienteNombre?.toLowerCase().includes(searchTerm) || g.descripcion?.toLowerCase().includes(searchTerm)
            );
        }),

        // Ingresos por categoría
        ingresosPorCategoria: computed(() => {
            const ingresos = store.ingresos();
            if (!Array.isArray(ingresos)) return {};

            const categorias: Record<string, { total: number; count: number }> = {};

            ingresos.forEach((ingreso) => {
                const cat = ingreso.categoriaNombre || 'Sin categoría';
                if (!categorias[cat]) {
                    categorias[cat] = { total: 0, count: 0 };
                }
                categorias[cat].total += ingreso.importe;
                categorias[cat].count++;
            });

            return categorias;
        }),

        // Ingresos recientes (últimos 5)
        ingresosRecientes: computed(() => {
            const ingresos = store.ingresos();
            if (!Array.isArray(ingresos)) return [];

            return [...ingresos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 5);
        })
    })),

    withMethods((store, ingresoService = inject(IngresoService)) => {
        // Inyectar stores auxiliares para obtener nombres en actualización optimista
        const conceptoStore = inject(ConceptoStore);
        const categoriaStore = inject(CategoriaStore);
        const clienteStore = inject(ClienteStore);
        const personaStore = inject(PersonaStore);
        const cuentaStore = inject(CuentaStore);
        const formaPagoStore = inject(FormaPagoStore);

        return {
            // Cargar ingresos
            loadIngresos: rxMethod<void>(
                pipe(
                    tap(() => patchState(store, { loading: true, error: null })),
                    switchMap(() =>
                        ingresoService.getAllIngresos().pipe(
                            tapResponse({
                                next: (ingresos) => {
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
                        patchState(store, { loading: true, error: null });
                    }),
                    switchMap(({ page, pageSize, searchTerm, sortColumn, sortOrder }) =>
                        ingresoService.getIngresos(page, pageSize, searchTerm, sortColumn, sortOrder).pipe(
                            tapResponse({
                                next: (response) => {
                                    patchState(store, {
                                        ingresos: response.items,
                                        totalRecords: response.totalCount,
                                        loading: false,
                                        error: null,
                                        lastUpdated: Date.now(),
                                        searchCache: new Map() // Invalidar caché
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
                    tap(() => patchState(store, { loading: true, error: null })),
                    switchMap(({ fechaInicio, fechaFin }) =>
                        ingresoService.getIngresosPorPeriodo(fechaInicio, fechaFin).pipe(
                            tapResponse({
                                next: (ingresos) => {
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

            // Crear ingreso con actualización optimista
            async createIngreso(ingreso: IngresoCreate, displayData?: Partial<Ingreso>): Promise<string> {
                const tempId = `temp_${Date.now()}`;

                const tempIngreso: Ingreso = {
                    id: tempId,
                    usuarioId: '', // Se llenará en backend o ignorar en visual

                    // IDs del formulario
                    conceptoId: ingreso.conceptoId,
                    categoriaId: ingreso.categoriaId,
                    clienteId: ingreso.clienteId,
                    personaId: ingreso.personaId,
                    cuentaId: ingreso.cuentaId,
                    formaPagoId: ingreso.formaPagoId,
                    importe: ingreso.importe,
                    fecha: ingreso.fecha,
                    descripcion: ingreso.descripcion,

                    // 🔥 LÓGICA MEJORADA:
                    // 1. Usa el nombre que le pasamos manualmente (displayData)
                    // 2. Si no, intenta buscarlo en el store
                    // 3. Si no, cadena vacía (lo que te pasaba antes)
                    conceptoNombre: displayData?.conceptoNombre || conceptoStore.conceptos().find((c) => c.id === ingreso.conceptoId)?.nombre || '',

                    categoriaNombre: displayData?.categoriaNombre || categoriaStore.categorias().find((c) => c.id === ingreso.categoriaId)?.nombre || '',

                    clienteNombre: displayData?.clienteNombre || clienteStore.clientes().find((c) => c.id === ingreso.clienteId)?.nombre || '',

                    personaNombre: displayData?.personaNombre || personaStore.personas().find((p) => p.id === ingreso.personaId)?.nombre || '',

                    cuentaNombre: displayData?.cuentaNombre || cuentaStore.cuentas().find((c) => c.id === ingreso.cuentaId)?.nombre || '',

                    formaPagoNombre: displayData?.formaPagoNombre || formaPagoStore.formasPago().find((f) => f.id === ingreso.formaPagoId)?.nombre || ''
                };

                // Actualización Optimista (Inserta arriba del todo)
                patchState(store, {
                    ingresos: [tempIngreso, ...store.ingresos()],
                    totalRecords: store.totalRecords() + 1,
                    // No pongas loading: true aquí si no quieres que parpadee la tabla
                    error: null
                });

                try {
                    const newIngresoId = await firstValueFrom(ingresoService.create(ingreso));

                    // Reemplazar ID temporal con real manteniendo los nombres que ya pusimos
                    patchState(store, {
                        ingresos: store.ingresos().map((i) => (i.id === tempId ? { ...tempIngreso, id: newIngresoId } : i)),
                        lastUpdated: Date.now(),
                        searchCache: new Map()
                    });
                    return newIngresoId;
                } catch (error: any) {
                    // Rollback si falla
                    patchState(store, {
                        ingresos: store.ingresos().filter((i) => i.id !== tempId),
                        totalRecords: store.totalRecords() - 1,
                        error: error.userMessage || 'Error al crear ingreso'
                    });
                    throw error;
                }
            },

            // Actualizar ingreso con actualización optimista
            async updateIngreso(payload: { id: string; ingreso: Partial<Ingreso> }): Promise<void> {
                const { id, ingreso } = payload;

                // Guardar estado anterior
                const ingresoAnterior = store.ingresos().find((i) => i.id === id);

                // Actualización optimista
                const ingresos = store.ingresos().map((i) => (i.id === id ? { ...i, ...ingreso } : i));
                patchState(store, { ingresos, loading: true, error: null });

                try {
                    await firstValueFrom(ingresoService.update(id, ingreso));
                    patchState(store, {
                        loading: false,
                        lastUpdated: Date.now(),
                        searchCache: new Map()
                    });
                } catch (error: any) {
                    // Revertir actualización optimista
                    if (ingresoAnterior) {
                        const revertedIngresos = store.ingresos().map((i) => (i.id === id ? ingresoAnterior : i));
                        patchState(store, { ingresos: revertedIngresos });
                    }

                    patchState(store, {
                        loading: false,
                        error: error.userMessage || 'Error al actualizar ingreso'
                    });
                    throw error;
                }
            },

            // Eliminar ingreso con actualización optimista
            deleteIngreso: rxMethod<string>(
                pipe(
                    tap((id) => {
                        patchState(store, (state) => ({
                            ingresos: state.ingresos.filter((i) => i.id !== id),
                            totalRecords: state.totalRecords - 1,
                            searchCache: new Map()
                        }));
                    }),
                    switchMap((id) =>
                        ingresoService.delete(id).pipe(
                            tapResponse({
                                next: () => {
                                    patchState(store, {
                                        lastUpdated: Date.now()
                                    });
                                },
                                error: (err: ErrorResponse) => {
                                    console.error('[STORE] Error al eliminar ingreso:', err);
                                    patchState(store, {
                                        error: err.detail || 'Error al eliminar ingreso'
                                    });
                                }
                            })
                        )
                    )
                )
            ),

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
        };
    })
);
