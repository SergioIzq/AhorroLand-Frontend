import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, debounceTime, firstValueFrom } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { GastoService } from '@/core/services/api/gasto.service';
import { Gasto, GastoCreate } from '@/core/models';
import { ErrorResponse } from '@/core/models/error-response.model';
import { ConceptoStore } from '@/features/conceptos/store/concepto.store';
import { CategoriaStore } from '@/features/categorias/store/categoria.store';
import { ProveedorStore } from '@/features/proveedores/store/proveedor.store';
import { PersonaStore } from '@/features/personas/store/persona.store';
import { CuentaStore } from '@/features/cuentas/store/cuenta.store';
import { FormaPagoStore } from '@/features/formas-pago/store/forma-pago.store';

interface GastosState {
    gastos: Gasto[];
    selectedGasto: Gasto | null;
    loading: boolean;
    error: string | null;
    totalGastos: number;
    totalRecords: number;
    lastUpdated: number | null;
    searchCache: Map<string, Gasto[]>;
    filters: {
        fechaInicio: string;
        fechaFin: string;
        categoria: string;
        searchTerm: string;
        sortColumn: string;
        sortOrder: string;
    };
}

const initialState: GastosState = {
    gastos: [],
    selectedGasto: null,
    loading: false,
    error: null,
    totalGastos: 0,
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
 * Signal Store para gestión de gastos
 * Optimizado con computed, cache y operaciones reactivas
 */
export const GastosStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),

    withComputed((store) => ({
        // Total calculado de gastos
        total: computed(() => {
            const gastos = store.gastos();
            if (!Array.isArray(gastos)) return 0;
            return gastos.reduce((sum, g) => sum + g.importe, 0);
        }),

        // Cantidad de gastos
        count: computed(() => {
            const gastos = store.gastos();
            return Array.isArray(gastos) ? gastos.length : 0;
        }),

        // Indica si hay datos cargados
        hasData: computed(() => {
            const gastos = store.gastos();
            return Array.isArray(gastos) && gastos.length > 0;
        }),

        // Gastos filtrados por término de búsqueda
        filteredGastos: computed(() => {
            const gastos = store.gastos();
            if (!Array.isArray(gastos)) return [];

            const searchTerm = store.filters().searchTerm.toLowerCase();

            if (!searchTerm) return gastos;

            return gastos.filter(
                (g) => g.conceptoNombre.toLowerCase().includes(searchTerm) || g.categoriaNombre?.toLowerCase().includes(searchTerm) || g.proveedorNombre?.toLowerCase().includes(searchTerm) || g.descripcion?.toLowerCase().includes(searchTerm)
            );
        }),

        // Gastos por categoría
        gastosPorCategoria: computed(() => {
            const gastos = store.gastos();
            if (!Array.isArray(gastos)) return {};

            const categorias: Record<string, { total: number; count: number }> = {};

            gastos.forEach((gasto) => {
                const cat = gasto.categoriaNombre || 'Sin categoría';
                if (!categorias[cat]) {
                    categorias[cat] = { total: 0, count: 0 };
                }
                categorias[cat].total += gasto.importe;
                categorias[cat].count++;
            });

            return categorias;
        }),

        // Gastos recientes (últimos 5)
        gastosRecientes: computed(() => {
            const gastos = store.gastos();
            if (!Array.isArray(gastos)) return [];

            return [...gastos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 5);
        })
    })),

    withComputed((store) => ({
        // Estado de sincronización (loading pero con datos previos)
        isSyncing: computed(() => store.loading() && store.hasData())
    })),

    withMethods((store, gastoService = inject(GastoService)) => {
        // Inyectar stores auxiliares para obtener nombres en actualización optimista
        const conceptoStore = inject(ConceptoStore);
        const categoriaStore = inject(CategoriaStore);
        const proveedorStore = inject(ProveedorStore);
        const personaStore = inject(PersonaStore);
        const cuentaStore = inject(CuentaStore);
        const formaPagoStore = inject(FormaPagoStore);

        return {
            // Cargar gastos
            loadGastos: rxMethod<void>(
                pipe(
                    tap(() => patchState(store, { loading: true, error: null })),
                    switchMap(() =>
                        gastoService.getAllGastos().pipe(
                            tapResponse({
                                next: (gastos) => {
                                    patchState(store, {
                                        gastos,
                                        loading: false,
                                        error: null
                                    });
                                },
                                error: (error: any) => {
                                    patchState(store, {
                                        loading: false,
                                        error: error.userMessage || 'Error al cargar gastos'
                                    });
                                }
                            })
                        )
                    )
                )
            ),

            // Cargar gastos con paginación, búsqueda y ordenamiento
            loadGastosPaginated: rxMethod<{
                page: number;
                pageSize: number;
                searchTerm?: string;
                sortColumn?: string;
                sortOrder?: string;
                timestamp?: number;
            }>(
                pipe(
                    tap(() => {
                        patchState(store, { loading: true, error: null });
                    }),
                    switchMap(({ page, pageSize, searchTerm, sortColumn, sortOrder, timestamp }) =>
                        gastoService.getGastos(page, pageSize, searchTerm, sortColumn, sortOrder, timestamp).pipe(
                            tapResponse({
                                next: (response) => {
                                    patchState(store, {
                                        gastos: response.items,
                                        totalRecords: response.totalCount,
                                        loading: false,
                                        error: null,
                                        lastUpdated: Date.now(),
                                        searchCache: new Map() // Invalidar caché
                                    });
                                },
                                error: (error: any) => {
                                    console.error('[STORE] Error al cargar gastos:', error);
                                    patchState(store, {
                                        loading: false,
                                        error: error.userMessage || 'Error al cargar gastos'
                                    });
                                }
                            })
                        )
                    )
                )
            ),

            // Cargar gastos por período
            loadGastosPorPeriodo: rxMethod<{ fechaInicio: string; fechaFin: string }>(
                pipe(
                    tap(() => patchState(store, { loading: true, error: null })),
                    switchMap(({ fechaInicio, fechaFin }) =>
                        gastoService.getGastosPorPeriodo(fechaInicio, fechaFin).pipe(
                            tapResponse({
                                next: (gastos) => {
                                    patchState(store, {
                                        gastos,
                                        loading: false,
                                        filters: { ...store.filters(), fechaInicio, fechaFin }
                                    });
                                },
                                error: (error: any) => {
                                    patchState(store, {
                                        loading: false,
                                        error: error.userMessage || 'Error al cargar gastos'
                                    });
                                }
                            })
                        )
                    )
                )
            ),

            // Crear gasto con actualización optimista
            async createGasto(gasto: GastoCreate, displayData?: Partial<Gasto>): Promise<string> {
                const tempId = `temp_${Date.now()}`;

                const tempGasto: Gasto = {
                    id: tempId,
                    usuarioId: '', // Se llenará en backend o ignorar en visual

                    // IDs del formulario
                    conceptoId: gasto.conceptoId,
                    categoriaId: gasto.categoriaId,
                    proveedorId: gasto.proveedorId,
                    personaId: gasto.personaId,
                    cuentaId: gasto.cuentaId,
                    formaPagoId: gasto.formaPagoId,
                    importe: gasto.importe,
                    fecha: gasto.fecha,
                    descripcion: gasto.descripcion,

                    // 🔥 LÓGICA MEJORADA:
                    // 1. Usa el nombre que le pasamos manualmente (displayData)
                    // 2. Si no, intenta buscarlo en el store
                    // 3. Si no, cadena vacía (lo que te pasaba antes)
                    conceptoNombre: displayData?.conceptoNombre || conceptoStore.conceptos().find((c) => c.id === gasto.conceptoId)?.nombre || '',

                    categoriaNombre: displayData?.categoriaNombre || categoriaStore.categorias().find((c) => c.id === gasto.categoriaId)?.nombre || '',

                    proveedorNombre: displayData?.proveedorNombre || proveedorStore.proveedores().find((c) => c.id === gasto.proveedorId)?.nombre || '',

                    personaNombre: displayData?.personaNombre || personaStore.personas().find((p) => p.id === gasto.personaId)?.nombre || '',

                    cuentaNombre: displayData?.cuentaNombre || cuentaStore.cuentas().find((c) => c.id === gasto.cuentaId)?.nombre || '',

                    formaPagoNombre: displayData?.formaPagoNombre || formaPagoStore.formasPago().find((f) => f.id === gasto.formaPagoId)?.nombre || ''
                };

                // Actualización Optimista (Inserta arriba del todo)
                patchState(store, {
                    gastos: [tempGasto, ...store.gastos()],
                    totalRecords: store.totalRecords() + 1,
                    // No pongas loading: true aquí si no quieres que parpadee la tabla
                    error: null
                });

                try {
                    const newGastoId = await firstValueFrom(gastoService.create(gasto));

                    // Reemplazar ID temporal con real manteniendo los nombres que ya pusimos
                    patchState(store, {
                        gastos: store.gastos().map((i) => (i.id === tempId ? { ...tempGasto, id: newGastoId } : i)),
                        lastUpdated: Date.now(),
                        searchCache: new Map()
                    });
                    return newGastoId;
                } catch (error: any) {
                    // Rollback si falla
                    patchState(store, {
                        gastos: store.gastos().filter((i) => i.id !== tempId),
                        totalRecords: store.totalRecords() - 1,
                        error: error.userMessage || 'Error al crear gasto'
                    });
                    throw error;
                }
            },

            // Actualizar gasto con actualización optimista
            async updateGasto(payload: { id: string; gasto: Partial<Gasto> }): Promise<void> {
                const { id, gasto } = payload;

                // Guardar estado anterior para reversión
                const gastoAnterior = store.gastos().find((g) => g.id === id);

                // Actualización optimista
                const gastos = store.gastos().map((g) => (g.id === id ? { ...g, ...gasto } : g));
                patchState(store, { gastos, loading: true, error: null });

                try {
                    await firstValueFrom(gastoService.update(id, gasto));
                    patchState(store, {
                        loading: false,
                        lastUpdated: Date.now(),
                        searchCache: new Map() // Invalidar caché
                    });
                } catch (error: any) {
                    // Revertir actualización optimista
                    if (gastoAnterior) {
                        const revertedGastos = store.gastos().map((g) => (g.id === id ? gastoAnterior : g));
                        patchState(store, { gastos: revertedGastos });
                    }

                    patchState(store, {
                        loading: false,
                        error: error.userMessage || 'Error al actualizar gasto'
                    });
                    throw error;
                }
            },

            // Eliminar gasto con actualización optimista
            deleteGasto: rxMethod<string>(
                pipe(
                    tap((id) => {
                        patchState(store, (state) => ({
                            gastos: state.gastos.filter((g) => g.id !== id),
                            totalRecords: state.totalRecords - 1,
                            searchCache: new Map() // Invalidar caché
                        }));
                    }),
                    switchMap((id) =>
                        gastoService.delete(id).pipe(
                            tapResponse({
                                next: () => {
                                    patchState(store, {
                                        lastUpdated: Date.now()
                                    });
                                },
                                error: (err: ErrorResponse) => {
                                    console.error('[STORE] Error al eliminar gasto:', err);
                                    patchState(store, {
                                        error: err.detail || 'Error al eliminar gasto'
                                    });
                                }
                            })
                        )
                    )
                )
            ),

            // Buscar gastos con debounce
            searchGastos: rxMethod<string>(
                pipe(
                    debounceTime(300), // Esperar 300ms después de dejar de escribir
                    tap((searchTerm) => {
                        patchState(store, {
                            filters: { ...store.filters(), searchTerm }
                        });
                    })
                )
            ),

            // Seleccionar gasto
            selectGasto(gasto: Gasto | null) {
                patchState(store, { selectedGasto: gasto });
            },

            // Actualizar filtros
            setFilters(filters: Partial<GastosState['filters']>) {
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
