import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, firstValueFrom } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { tapResponse } from '@ngrx/operators';
import { ConceptoService } from '@/core/services/api/concepto.service';
import { Concepto } from '@/core/models/concepto.model';
import { ErrorResponse } from '@/core/models/error-response.model';

interface ConceptoState {
    conceptos: Concepto[];
    totalRecords: number;
    loading: boolean;
    error: string | null;
    lastUpdated: number | null;
    searchCache: Map<string, Concepto[]>;
}

const initialState: ConceptoState = {
    conceptos: [],
    totalRecords: 0,
    loading: false,
    error: null,
    lastUpdated: null,
    searchCache: new Map()
};

export const ConceptoStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),
    
    withComputed((store) => ({
        totalConceptos: computed(() => store.conceptos().length),
        hasData: computed(() => store.conceptos().length > 0),
        conceptosOrdenados: computed(() => {
            return [...store.conceptos()].sort((a, b) => 
                a.nombre.localeCompare(b.nombre)
            );
        })
    })),
    
    withComputed((store) => ({
        isSyncing: computed(() => store.loading() && store.hasData())
    })),
    
    withMethods((store, conceptoService = inject(ConceptoService)) => ({
        async search(query: string, limit: number = 10, categoriaId?: string): Promise<Concepto[]> {
            const cacheKey = `${query}_${limit}_${categoriaId || ''}`;
            const cached = store.searchCache().get(cacheKey);
            if (cached) return cached;
            
            patchState(store, { loading: true, error: null });
            try {
                const response = await firstValueFrom(conceptoService.search(query, limit, categoriaId));

                if (response.isSuccess && response.value) {
                    const conceptos = Array.isArray(response.value) ? response.value : (response.value as any).items || [];
                    const newCache = new Map(store.searchCache());
                    newCache.set(cacheKey, conceptos);
                    patchState(store, { loading: false, searchCache: newCache, lastUpdated: Date.now() });
                    return conceptos;
                }
                throw new Error(response.error?.message || 'Error al buscar conceptos');
            } catch (err) {
                patchState(store, { loading: false, error: (err as Error).message });
                throw err;
            }
        },

        async create(nombre: string, categoriaId: string): Promise<string> {
            const tempId = `temp_${Date.now()}`;
            const tempConcepto: Partial<Concepto> & { id: string; nombre: string; categoriaId: string } = { 
                id: tempId, 
                nombre, 
                categoriaId,
                fechaCreacion: new Date(),
                usuarioId: ''
            };
            
            patchState(store, { 
                conceptos: [...store.conceptos(), tempConcepto as Concepto],
                loading: true,
                error: null
            });
            
            try {
                const response = await firstValueFrom(conceptoService.create(nombre, categoriaId));

                if (response.isSuccess) {
                    const realConcepto: Partial<Concepto> & { id: string; nombre: string; categoriaId: string } = { 
                        id: response.value, 
                        nombre, 
                        categoriaId,
                        fechaCreacion: new Date(),
                        usuarioId: ''
                    };
                    patchState(store, { 
                        conceptos: store.conceptos().map(c => c.id === tempId ? realConcepto as Concepto : c),
                        loading: false,
                        lastUpdated: Date.now(),
                        searchCache: new Map()
                    });
                    return response.value;
                }
                throw new Error(response.error?.message || 'Error al crear concepto');
            } catch (err) {
                // ROLLBACK: Eliminar concepto temporal
                patchState(store, { 
                    conceptos: store.conceptos().filter(c => c.id !== tempId),
                    totalRecords: store.totalRecords() - 1,
                    loading: false,
                    error: (err as Error).message,
                    searchCache: new Map()
                });
                throw err;
            }
        },

        loadConceptosPaginated: rxMethod<{
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
                    conceptoService.getConceptos(page, pageSize, searchTerm, sortColumn, sortOrder).pipe(
                        tapResponse({
                            next: (response) => {
                                patchState(store, {
                                    conceptos: response.items,
                                    totalRecords: response.totalCount,
                                    loading: false,
                                    error: null,
                                    lastUpdated: Date.now(),
                                    searchCache: new Map()
                                });
                            },
                            error: (error: any) => {
                                console.error('[STORE] Error al cargar conceptos:', error);
                                patchState(store, {
                                    loading: false,
                                    error: error.userMessage || 'Error al cargar conceptos'
                                });
                            }
                        })
                    )
                )
            )
        ),

        async update(id: string, concepto: Partial<Concepto>): Promise<string> {
            const conceptoAnterior = store.conceptos().find(c => c.id === id);
            
            if (conceptoAnterior) {
                patchState(store, {
                    conceptos: store.conceptos().map(c => c.id === id ? { ...c, ...concepto } : c),
                    loading: true,
                    error: null
                });
            }
            
            try {
                const response = await firstValueFrom(conceptoService.update(id, concepto));

                if (response.isSuccess) {
                    patchState(store, { 
                        loading: false,
                        lastUpdated: Date.now(),
                        searchCache: new Map()
                    });
                    return response.value;
                }
                throw new Error(response.error?.message || 'Error al actualizar concepto');
            } catch (err) {
                // ROLLBACK: Restaurar concepto anterior
                if (conceptoAnterior) {
                    patchState(store, {
                        conceptos: store.conceptos().map(c => c.id === id ? conceptoAnterior : c),
                        loading: false,
                        error: (err as Error).message,
                        searchCache: new Map()
                    });
                } else {
                    patchState(store, { 
                        loading: false,
                        error: (err as Error).message
                    });
                }
                throw err;
            }
        },

        deleteConcepto: rxMethod<string>(
            pipe(
                switchMap((id) => {
                    // Guardar concepto para rollback ANTES de eliminarlo
                    const conceptoEliminado = store.conceptos().find(c => c.id === id);
                    const totalAnterior = store.totalRecords();
                    
                    // Actualización optimista: eliminar inmediatamente
                    patchState(store, (state) => ({
                        conceptos: state.conceptos.filter((c) => c.id !== id),
                        totalRecords: state.totalRecords - 1,
                        searchCache: new Map()
                    }));
                    
                    return conceptoService.delete(id).pipe(
                        tapResponse({
                            next: () => {
                                patchState(store, { lastUpdated: Date.now() });
                            },
                            error: (err: ErrorResponse) => {
                                console.error('[STORE] Error al eliminar concepto:', err);
                                
                                // ROLLBACK: Restaurar concepto eliminado
                                if (conceptoEliminado) {
                                    patchState(store, (state) => ({
                                        conceptos: [...state.conceptos, conceptoEliminado].sort((a, b) => a.nombre.localeCompare(b.nombre)),
                                        totalRecords: totalAnterior,
                                        error: err.detail || 'Error al eliminar concepto'
                                    }));
                                } else {
                                    patchState(store, { error: err.detail || 'Error al eliminar concepto' });
                                }
                            }
                        })
                    );
                })
            )
        ),

        async getRecent(limit: number = 5, categoriaId?: string): Promise<Concepto[]> {
            patchState(store, { loading: true });
            try {
                const response = await firstValueFrom(conceptoService.getRecent(limit, categoriaId));

                if (response.isSuccess && response.value) {
                    const conceptos = Array.isArray(response.value) ? response.value : (response.value as any).items || [];
                    patchState(store, { loading: false });
                    return conceptos;
                }
                throw new Error(response.error?.message || 'Error al cargar conceptos recientes');
            } catch (err) {
                patchState(store, { loading: false });
                throw err;
            }
        },

        clearError() {
            patchState(store, { error: null });
        }
    }))
);
