import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { firstValueFrom, pipe, switchMap, tap } from 'rxjs';
import { CategoriaService } from '@/core/services/api/categoria.service';
import { Categoria } from '@/core/models/categoria.model';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { ErrorResponse } from '@/core/models/error-response.model';

interface CategoriaState {
    categorias: Categoria[];
    totalRecords: number;
    loading: boolean;
    error: string | null;
    lastUpdated: number | null;
    searchCache: Map<string, Categoria[]>;
}

const initialState: CategoriaState = {
    categorias: [],
    totalRecords: 0,
    loading: false,
    error: null,
    lastUpdated: null,
    searchCache: new Map()
};

export const CategoriaStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),
    
    withComputed((store) => ({
        // Computed signals para acceso reactivo optimizado
        categoriasActivas: computed(() => {
            const cats = store.categorias();
            return cats.filter(c => c.nombre && c.nombre.trim() !== '');
        }),
        
        totalCategorias: computed(() => store.categorias().length),
        
        // Indica si hay datos cargados
        hasData: computed(() => store.categorias().length > 0),
        
        // Categorías ordenadas alfabéticamente
        categoriasOrdenadas: computed(() => {
            return [...store.categorias()].sort((a, b) => 
                a.nombre.localeCompare(b.nombre)
            );
        })
    })),
    
    withComputed((store) => ({
        // Estado de sincronización
        isSyncing: computed(() => store.loading() && store.hasData())
    })),
    
    withMethods((store, categoriaService = inject(CategoriaService)) => ({
        async search(query: string, limit: number = 10): Promise<Categoria[]> {
            // Verificar caché primero
            const cacheKey = `${query}_${limit}`;
            const cached = store.searchCache().get(cacheKey);
            if (cached) {
                return cached;
            }
            
            patchState(store, { loading: true, error: null });
            try {
                const response = await firstValueFrom(categoriaService.search(query, limit));

                if (response.isSuccess && response.value) {
                    const categorias = response.value;
                    // Actualizar caché
                    const newCache = new Map(store.searchCache());
                    newCache.set(cacheKey, categorias);
                    
                    patchState(store, { 
                        loading: false,
                        searchCache: newCache,
                        lastUpdated: Date.now()
                    });
                    return categorias;
                }
                throw new Error(response.error?.message || 'Error al buscar categorías');
            } catch (err) {
                patchState(store, { loading: false, error: (err as Error).message });
                throw err;
            }
        },

        async create(nombre: string): Promise<string> {
            // Actualización optimista: agregar inmediatamente a la UI
            const tempId = `temp_${Date.now()}`;
            const tempCategoria: Partial<Categoria> & { id: string; nombre: string } = { 
                id: tempId, 
                nombre,
                descripcion: '',
                fechaCreacion: new Date(),
                usuarioId: ''
            };
            
            patchState(store, { 
                categorias: [...store.categorias(), tempCategoria as Categoria],
                loading: true,
                error: null
            });
            
            try {
                const response = await firstValueFrom(categoriaService.create(nombre));

                if (response.isSuccess && response.value) {
                    // Reemplazar la categoría temporal con la real
                    const realCategoria: Partial<Categoria> & { id: string; nombre: string } = { 
                        id: response.value, 
                        nombre,
                        descripcion: '',
                        fechaCreacion: new Date(),
                        usuarioId: ''
                    };
                    patchState(store, { 
                        categorias: store.categorias().map(c => 
                            c.id === tempId ? realCategoria as Categoria : c
                        ),
                        loading: false,
                        lastUpdated: Date.now(),
                        searchCache: new Map() // Invalidar caché
                    });
                    return response.value;
                }
                throw new Error(response.error?.message || 'Error al crear categoría');
            } catch (err) {
                // Revertir actualización optimista en caso de error
                patchState(store, { 
                    categorias: store.categorias().filter(c => c.id !== tempId),
                    loading: false,
                    error: (err as Error).message
                });
                throw err;
            }
        },

        async getRecent(limit: number = 5): Promise<Categoria[]> {
            patchState(store, { loading: true });
            try {
                const response = await firstValueFrom(categoriaService.getRecent(limit));

                if (response.isSuccess && response.value) {
                    const categorias = Array.isArray(response.value) ? response.value : (response.value as any).items || [];
                    patchState(store, { loading: false });
                    return categorias;
                }
                throw new Error(response.error?.message || 'Error al cargar categorías recientes');
            } catch (err) {
                patchState(store, { loading: false });
                throw err;
            }
        },

        loadCategoriasPaginated: rxMethod<{
            page: number;
            pageSize: number;
            searchTerm?: string;
            sortColumn?: string;
            sortOrder?: string;
        }>(
            pipe(
                tap(() => {
                    // Solo mostrar loading si no hay datos previos
                    patchState(store, { 
                        loading: true, 
                        error: null
                    });
                }),
                switchMap(({ page, pageSize, searchTerm, sortColumn, sortOrder }) =>
                    categoriaService.getCategorias(page, pageSize, searchTerm, sortColumn, sortOrder).pipe(
                        tapResponse({
                            next: (response) => {
                                patchState(store, {
                                    categorias: response.items,
                                    totalRecords: response.totalCount,
                                    loading: false,
                                    error: null,
                                    lastUpdated: Date.now(),
                                    searchCache: new Map() // Invalidar caché al cargar nueva página
                                });
                            },
                            error: (error: any) => {
                                console.error('[STORE] Error al cargar categorías:', error);
                                patchState(store, {
                                    loading: false,
                                    error: error.userMessage || 'Error al cargar categorías'
                                });
                            }
                        })
                    )
                )
            )
        ),

        deleteCategoria: rxMethod<string>(
            pipe(
                tap((id) => {
                    // Actualización optimista: eliminar inmediatamente de la UI
                    patchState(store, (state) => ({
                        categorias: state.categorias.filter((c) => c.id !== id),
                        totalRecords: state.totalRecords - 1,
                        searchCache: new Map() // Invalidar caché
                    }));
                }),
                switchMap((id) => {
                    // Guardar categoría eliminada para rollback
                    const categoriaEliminada = store.categorias().find(c => c.id === id) || 
                        (() => {
                            // Si ya fue eliminada del state, intentar recuperarla del último snapshot
                            const allCats = [...store.categorias()];
                            return allCats.find(c => c.id === id);
                        })();
                    
                    const totalAnterior = store.totalRecords();
                    
                    return categoriaService.delete(id).pipe(
                        tapResponse({
                            next: () => {
                                patchState(store, { 
                                    lastUpdated: Date.now()
                                });
                            },
                            error: (err: ErrorResponse) => {
                                console.error('[STORE] Error al eliminar categoría:', err);
                                
                                // ROLLBACK: Restaurar categoría eliminada
                                if (categoriaEliminada) {
                                    patchState(store, (state) => ({
                                        categorias: [...state.categorias, categoriaEliminada].sort((a, b) => a.nombre.localeCompare(b.nombre)),
                                        totalRecords: totalAnterior,
                                        error: err.detail || 'Error al eliminar categoría'
                                    }));
                                } else {
                                    patchState(store, { 
                                        error: err.detail || 'Error al eliminar categoría'
                                    });
                                }
                            }
                        })
                    );
                })
            )
        ),

        async update(id: string, categoria: Partial<Categoria>): Promise<string> {
            // Actualización optimista: actualizar inmediatamente en la UI
            const categoriaAnterior = store.categorias().find(c => c.id === id);
            
            if (categoriaAnterior) {
                patchState(store, {
                    categorias: store.categorias().map(c => 
                        c.id === id ? { ...c, ...categoria } : c
                    ),
                    loading: true,
                    error: null
                });
            }
            
            try {
                const response = await firstValueFrom(categoriaService.update(id, categoria));

                if (response.isSuccess) {
                    patchState(store, { 
                        loading: false,
                        lastUpdated: Date.now(),
                        searchCache: new Map() // Invalidar caché
                    });
                    return response.value;
                }
                throw new Error(response.error?.message || 'Error al actualizar categoría');
            } catch (err) {
                // Revertir actualización optimista
                if (categoriaAnterior) {
                    patchState(store, {
                        categorias: store.categorias().map(c => 
                            c.id === id ? categoriaAnterior : c
                        )
                    });
                }
                patchState(store, { 
                    loading: false,
                    error: (err as Error).message
                });
                throw err;
            }
        },

        clearError() {
            patchState(store, { error: null });
        }
    }))
);
