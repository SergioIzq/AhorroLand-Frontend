import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, debounceTime, firstValueFrom } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { GastoService } from '@/core/services/api/gasto.service';
import { Gasto, GastoCreate } from '@/core/models';

interface GastosState {
    gastos: Gasto[];
    selectedGasto: Gasto | null;
    loading: boolean;
    error: string | null;
    totalGastos: number;
    totalRecords: number;
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
        
        // Gastos filtrados por término de búsqueda
        filteredGastos: computed(() => {
            const gastos = store.gastos();
            if (!Array.isArray(gastos)) return [];
            
            const searchTerm = store.filters().searchTerm.toLowerCase();
            
            if (!searchTerm) return gastos;
            
            return gastos.filter(g =>
                g.conceptoNombre.toLowerCase().includes(searchTerm) ||
                g.categoriaNombre?.toLowerCase().includes(searchTerm) ||
                g.proveedorNombre?.toLowerCase().includes(searchTerm) ||
                g.descripcion?.toLowerCase().includes(searchTerm)
            );
        }),
        
        // Gastos por categoría
        gastosPorCategoria: computed(() => {
            const gastos = store.gastos();
            if (!Array.isArray(gastos)) return {};
            
            const categorias: Record<string, { total: number; count: number }> = {};
            
            gastos.forEach(gasto => {
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
            
            return [...gastos]
                .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                .slice(0, 5);
        })
    })),
    
    withMethods((store, gastoService = inject(GastoService)) => ({
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
        }>(
            pipe(
                tap(({ page, pageSize, searchTerm, sortColumn, sortOrder }) => {
                    console.log('[STORE] Cargando:', { page, pageSize, searchTerm, sortColumn, sortOrder });
                    patchState(store, { loading: true, error: null });
                }),
                switchMap(({ page, pageSize, searchTerm, sortColumn, sortOrder }) =>
                    gastoService.getGastos(page, pageSize, searchTerm, sortColumn, sortOrder).pipe(
                        tapResponse({
                            next: (response) => {
                                console.log('[STORE] Respuesta recibida:', response);
                                patchState(store, {
                                    gastos: response.items,
                                    totalRecords: response.totalCount,
                                    loading: false,
                                    error: null
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
        
        // Crear gasto
        async createGasto(gasto: GastoCreate): Promise<string> {
            patchState(store, { loading: true, error: null });
            
            try {
                const newGastoId = await firstValueFrom(gastoService.create(gasto));
                // El backend solo devuelve el ID, no el objeto completo
                // Necesitaremos recargar la lista o hacer un fetch del gasto por ID
                patchState(store, { loading: false });
                return newGastoId;
            } catch (error: any) {
                patchState(store, {
                    loading: false,
                    error: error.userMessage || 'Error al crear gasto'
                });
                throw error;
            }
        },
        
        // Actualizar gasto
        async updateGasto(payload: { id: string; gasto: Partial<Gasto> }): Promise<void> {
            const { id, gasto } = payload;
            patchState(store, { loading: true, error: null });
            
            try {
                await firstValueFrom(gastoService.update(id, gasto));
                
                // Actualizar estado local
                const gastos = store.gastos().map(g =>
                    g.id === id ? { ...g, ...gasto } : g
                );
                patchState(store, { gastos, loading: false });
            } catch (error: any) {
                patchState(store, {
                    loading: false,
                    error: error.userMessage || 'Error al actualizar gasto'
                });
                throw error;
            }
        },
        
        // Eliminar gasto
        async deleteGasto(id: string): Promise<void> {
            patchState(store, { loading: true, error: null });
            
            try {
                await firstValueFrom(gastoService.delete(id));
                const gastos = store.gastos().filter(g => g.id !== id);
                patchState(store, { gastos, loading: false });
            } catch (error: any) {
                patchState(store, {
                    loading: false,
                    error: error.userMessage || 'Error al eliminar gasto'
                });
                throw error;
            }
        },
        
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
    })),

);
