import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { firstValueFrom, pipe, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { TraspasoProgramadoService } from '@/core/services/api/traspaso-programado.service';
import { TraspasoProgramado, TraspasoProgramadoCreate } from '@/core/models/traspaso-programado.model';
import { CuentaStore } from '@/features/cuentas/store/cuenta.store';

interface TraspasosProgramadosState {
    traspasos: TraspasoProgramado[];
    selectedTraspaso: TraspasoProgramado | null;
    loading: boolean;
    error: string | null;
    totalRecords: number;
    lastUpdated: number;
    searchCache: Map<string, { items: TraspasoProgramado[]; totalCount: number; timestamp: number }>;
}

const initialState: TraspasosProgramadosState = {
    traspasos: [],
    selectedTraspaso: null,
    loading: false,
    error: null,
    totalRecords: 0,
    lastUpdated: 0,
    searchCache: new Map()
};

export const TraspasosProgramadosStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),

    withComputed((store) => ({
        hasData: computed(() => store.traspasos().length > 0),
        totalTraspasos: computed(() => store.traspasos().length),
        traspasosActivos: computed(() => store.traspasos().filter(t => t.activo)),
        traspasosInactivos: computed(() => store.traspasos().filter(t => !t.activo))
    })),

    withComputed((store) => ({
        isSyncing: computed(() => store.loading() && store.hasData())
    })),

    withMethods(
        (
            store, 
            service = inject(TraspasoProgramadoService),
            cuentaStore = inject(CuentaStore)
        ) => ({
            loadTraspasosProgramadosPaginated: rxMethod<{
                page: number;
                pageSize: number;
                searchTerm?: string;
                sortColumn?: string;
                sortOrder?: string;
            }>(
                pipe(
                    tap(() => patchState(store, { loading: true })),
                    switchMap(({ page, pageSize, searchTerm, sortColumn, sortOrder }) => {
                        // Verificar cache
                        const cacheKey = `${page}-${pageSize}-${searchTerm || ''}-${sortColumn || ''}-${sortOrder || ''}`;
                        const cached = store.searchCache().get(cacheKey);
                        const CACHE_TTL = 30000; // 30 segundos

                        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                            patchState(store, {
                                traspasos: cached.items,
                                totalRecords: cached.totalCount,
                                loading: false,
                                error: null
                            });
                            return [];
                        }

                        return service.getTraspasosProgramados(page, pageSize, searchTerm, sortColumn, sortOrder).pipe(
                            tapResponse({
                                next: (response) => {
                                    const newCache = new Map(store.searchCache());
                                    newCache.set(cacheKey, {
                                        items: response.items,
                                        totalCount: response.totalCount,
                                        timestamp: Date.now()
                                    });

                                    patchState(store, {
                                        traspasos: response.items,
                                        totalRecords: response.totalCount,
                                        loading: false,
                                        error: null,
                                        lastUpdated: Date.now(),
                                        searchCache: newCache
                                    });
                                },
                                error: (error: any) => {
                                    patchState(store, {
                                        loading: false,
                                        error: error.message || 'Error al cargar traspasos programados'
                                    });
                                }
                            })
                        );
                    })
                )
            ),

            createTraspaso: rxMethod<TraspasoProgramadoCreate>(
                pipe(
                    tap((traspaso) => {
                        // Actualización optimista: crear objeto temporal
                        const cuentas = cuentaStore.cuentas();
                        const cuentaOrigen = cuentas.find(c => c.id === traspaso.cuentaOrigenId);
                        const cuentaDestino = cuentas.find(c => c.id === traspaso.cuentaDestinoId);

                        const tempTraspaso: TraspasoProgramado = {
                            id: `temp-${Date.now()}`,
                            cuentaOrigenId: traspaso.cuentaOrigenId,
                            cuentaOrigenNombre: cuentaOrigen?.nombre || '',
                            cuentaDestinoId: traspaso.cuentaDestinoId,
                            cuentaDestinoNombre: cuentaDestino?.nombre || '',
                            importe: traspaso.importe,
                            frecuencia: traspaso.frecuencia,
                            fechaEjecucion: traspaso.fechaEjecucion,
                            activo: traspaso.activo,
                            descripcion: traspaso.descripcion,
                            usuarioId: '',
                            hangfireJobId: undefined,
                            saldoCuentaOrigen: undefined,
                            saldoCuentaDestino: undefined
                        };

                        patchState(store, {
                            traspasos: [...store.traspasos(), tempTraspaso],
                            totalRecords: store.totalRecords() + 1,
                            loading: true,
                            searchCache: new Map() // Limpiar cache
                        });
                    }),
                    switchMap((traspaso) =>
                        service.create(traspaso).pipe(
                            tapResponse({
                                next: (id) => {
                                    // Reemplazar objeto temporal con el real
                                    const traspasos = store.traspasos().filter(t => !t.id.startsWith('temp-'));
                                    patchState(store, {
                                        traspasos,
                                        loading: false,
                                        error: null,
                                        lastUpdated: Date.now()
                                    });
                                },
                                error: (error: any) => {
                                    // Rollback: eliminar objeto temporal
                                    const traspasos = store.traspasos().filter(t => !t.id.startsWith('temp-'));
                                    patchState(store, {
                                        traspasos,
                                        totalRecords: store.totalRecords() - 1,
                                        loading: false,
                                        error: error.message || 'Error al crear traspaso programado'
                                    });
                                }
                            })
                        )
                    )
                )
            ),

            updateTraspaso: rxMethod<{ id: string; traspaso: Partial<TraspasoProgramado> }>(
                pipe(
                    tap(({ id, traspaso }) => {
                        // Actualización optimista: guardar estado anterior
                        const traspasoAnterior = store.traspasos().find(t => t.id === id);
                        if (!traspasoAnterior) return;

                        const cuentas = cuentaStore.cuentas();
                        
                        const traspasoActualizado: TraspasoProgramado = {
                            ...traspasoAnterior,
                            ...traspaso,
                            cuentaOrigenNombre: traspaso.cuentaOrigenId 
                                ? cuentas.find(c => c.id === traspaso.cuentaOrigenId)?.nombre || traspasoAnterior.cuentaOrigenNombre
                                : traspasoAnterior.cuentaOrigenNombre,
                            cuentaDestinoNombre: traspaso.cuentaDestinoId
                                ? cuentas.find(c => c.id === traspaso.cuentaDestinoId)?.nombre || traspasoAnterior.cuentaDestinoNombre
                                : traspasoAnterior.cuentaDestinoNombre
                        };

                        const traspasos = store.traspasos().map(t => t.id === id ? traspasoActualizado : t);
                        
                        patchState(store, {
                            traspasos,
                            loading: true,
                            searchCache: new Map() // Limpiar cache
                        });

                        // Guardar para rollback
                        (store as any)._traspasoAnterior = traspasoAnterior;
                    }),
                    switchMap(({ id, traspaso }) =>
                        service.update(id, traspaso).pipe(
                            tapResponse({
                                next: () => {
                                    patchState(store, {
                                        loading: false,
                                        error: null,
                                        lastUpdated: Date.now()
                                    });
                                    delete (store as any)._traspasoAnterior;
                                },
                                error: (error: any) => {
                                    // Rollback: restaurar estado anterior
                                    const traspasoAnterior = (store as any)._traspasoAnterior;
                                    if (traspasoAnterior) {
                                        const traspasos = store.traspasos().map(t => 
                                            t.id === id ? traspasoAnterior : t
                                        );
                                        patchState(store, { traspasos });
                                        delete (store as any)._traspasoAnterior;
                                    }
                                    patchState(store, {
                                        loading: false,
                                        error: error.message || 'Error al actualizar traspaso programado'
                                    });
                                }
                            })
                        )
                    )
                )
            ),

            deleteTraspaso: rxMethod<string>(
                pipe(
                    switchMap((id) => {
                        // Guardar para rollback ANTES de eliminar
                        const traspasoEliminado = store.traspasos().find(t => t.id === id);
                        const totalAnterior = store.totalRecords();
                        
                        if (!traspasoEliminado) {
                            throw new Error('Traspaso no encontrado');
                        }

                        // Actualización optimista: eliminar de la lista
                        const traspasos = store.traspasos().filter(t => t.id !== id);
                        patchState(store, {
                            traspasos,
                            totalRecords: totalAnterior - 1,
                            loading: true,
                            searchCache: new Map() // Limpiar cache
                        });

                        return service.delete(id).pipe(
                            tapResponse({
                                next: () => {
                                    patchState(store, {
                                        loading: false,
                                        error: null,
                                        lastUpdated: Date.now()
                                    });
                                },
                                error: (error: any) => {
                                    // Rollback: restaurar el elemento eliminado
                                    const traspasos = [...store.traspasos(), traspasoEliminado]
                                        .sort((a, b) => {
                                            const fechaA = new Date(a.fechaEjecucion).getTime();
                                            const fechaB = new Date(b.fechaEjecucion).getTime();
                                            return fechaB - fechaA;
                                        });
                                    
                                    patchState(store, {
                                        traspasos,
                                        totalRecords: totalAnterior,
                                        loading: false,
                                        error: error.message || 'Error al eliminar traspaso programado'
                                    });
                                }
                            })
                        );
                    })
                )
            ),

            selectTraspaso(traspaso: TraspasoProgramado | null) {
                patchState(store, { selectedTraspaso: traspaso });
            },

            clearError() {
                patchState(store, { error: null });
            },

            clearCache() {
                patchState(store, { searchCache: new Map() });
            }
        })
    ),

    withHooks({
        onInit(store) {
            console.log('TraspasosProgramadosStore initialized');
        }
    })
);
