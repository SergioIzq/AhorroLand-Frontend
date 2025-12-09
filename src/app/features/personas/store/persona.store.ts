import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, firstValueFrom } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { tapResponse } from '@ngrx/operators';
import { PersonaService } from '@/core/services/api/persona.service';
import { Persona } from '@/core/models/persona.model';
import { ErrorResponse } from '@/core/models/error-response.model';

interface PersonaState {
    personas: Persona[];
    totalRecords: number;
    loading: boolean;
    error: string | null;
    lastUpdated: number | null;
    searchCache: Map<string, Persona[]>;
}

const initialState: PersonaState = {
    personas: [],
    totalRecords: 0,
    loading: false,
    error: null,
    lastUpdated: null,
    searchCache: new Map()
};

export const PersonaStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),
    
    withComputed((store) => ({
        totalPersonas: computed(() => store.personas().length),
        hasData: computed(() => store.personas().length > 0),
        personasOrdenadas: computed(() => {
            return [...store.personas()].sort((a, b) => 
                a.nombre.localeCompare(b.nombre)
            );
        })
    })),
    
    withComputed((store) => ({
        isSyncing: computed(() => store.loading() && store.hasData())
    })),
    
    withMethods((store, personaService = inject(PersonaService)) => ({
        async search(query: string, limit: number = 10): Promise<Persona[]> {
            const cacheKey = `${query}_${limit}`;
            const cached = store.searchCache().get(cacheKey);
            if (cached) return cached;
            
            patchState(store, { loading: true, error: null });
            try {
                const response = await firstValueFrom(personaService.search(query, limit));

                if (response.isSuccess && response.value) {
                    const personas = Array.isArray(response.value) ? response.value : (response.value as any).items || [];
                    const newCache = new Map(store.searchCache());
                    newCache.set(cacheKey, personas);
                    patchState(store, { loading: false, searchCache: newCache, lastUpdated: Date.now() });
                    return personas;
                } else {
                    const errorMsg = response.error?.message || 'Error al buscar personas';
                    patchState(store, { loading: false, error: errorMsg });
                    throw new Error(errorMsg);
                }
            } catch (err: any) {
                const errorMsg = err.message || 'Error al buscar personas';
                patchState(store, { loading: false, error: errorMsg });
                throw err;
            }
        },

        async create(nombre: string): Promise<string> {
            const tempId = `temp_${Date.now()}`;
            const tempPersona: Partial<Persona> & { id: string; nombre: string } = { 
                id: tempId, 
                nombre,
                fechaCreacion: new Date(),
                usuarioId: ''
            };
            
            patchState(store, { 
                personas: [...store.personas(), tempPersona as Persona],
                loading: true,
                error: null
            });
            
            try {
                const response = await firstValueFrom(personaService.create(nombre));

                if (response.isSuccess) {
                    const realPersona: Partial<Persona> & { id: string; nombre: string } = { 
                        id: response.value, 
                        nombre,
                        fechaCreacion: new Date(),
                        usuarioId: ''
                    };
                    patchState(store, { 
                        personas: store.personas().map(p => p.id === tempId ? realPersona as Persona : p),
                        loading: false,
                        lastUpdated: Date.now(),
                        searchCache: new Map()
                    });
                    return response.value;
                }
                throw new Error(response.error?.message || 'Error al crear persona');
            } catch (err) {
                patchState(store, { 
                    personas: store.personas().filter(p => p.id !== tempId),
                    loading: false,
                    error: (err as Error).message
                });
                throw err;
            }
        },

        loadPersonasPaginated: rxMethod<{
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
                    personaService.getPersonas(page, pageSize, searchTerm, sortColumn, sortOrder).pipe(
                        tapResponse({
                            next: (response) => {
                                patchState(store, {
                                    personas: response.items,
                                    totalRecords: response.totalCount,
                                    loading: false,
                                    error: null,
                                    lastUpdated: Date.now(),
                                    searchCache: new Map()
                                });
                            },
                            error: (error: any) => {
                                console.error('[STORE] Error al cargar personas:', error);
                                patchState(store, {
                                    loading: false,
                                    error: error.userMessage || 'Error al cargar personas'
                                });
                            }
                        })
                    )
                )
            )
        ),

        async update(id: string, persona: Partial<Persona>): Promise<string> {
            const personaAnterior = store.personas().find(p => p.id === id);
            
            if (personaAnterior) {
                patchState(store, {
                    personas: store.personas().map(p => p.id === id ? { ...p, ...persona } : p),
                    loading: true,
                    error: null
                });
            }
            
            try {
                const response = await firstValueFrom(personaService.update(id, persona));

                if (response.isSuccess) {
                    patchState(store, { 
                        loading: false,
                        lastUpdated: Date.now(),
                        searchCache: new Map()
                    });
                    return response.value;
                }
                throw new Error(response.error?.message || 'Error al actualizar persona');
            } catch (err) {
                if (personaAnterior) {
                    patchState(store, {
                        personas: store.personas().map(p => p.id === id ? personaAnterior : p)
                    });
                }
                patchState(store, { 
                    loading: false,
                    error: (err as Error).message
                });
                throw err;
            }
        },

        deletePersona: rxMethod<string>(
            pipe(
                switchMap((id) => {
                    // Guardar persona para rollback ANTES de eliminarlo
                    const personaEliminada = store.personas().find(p => p.id === id);
                    const totalAnterior = store.totalRecords();
                    
                    // Actualización optimista: eliminar inmediatamente
                    patchState(store, (state) => ({
                        personas: state.personas.filter((p) => p.id !== id),
                        totalRecords: state.totalRecords - 1,
                        searchCache: new Map()
                    }));
                    
                    return personaService.delete(id).pipe(
                        tapResponse({
                            next: () => {
                                patchState(store, { lastUpdated: Date.now() });
                            },
                            error: (err: ErrorResponse) => {
                                console.error('[STORE] Error al eliminar persona:', err);
                                
                                // ROLLBACK: Restaurar persona eliminada
                                if (personaEliminada) {
                                    patchState(store, (state) => ({
                                        personas: [...state.personas, personaEliminada].sort((a, b) => a.nombre.localeCompare(b.nombre)),
                                        totalRecords: totalAnterior,
                                        error: err.detail || 'Error al eliminar persona'
                                    }));
                                } else {
                                    patchState(store, { error: err.detail || 'Error al eliminar persona' });
                                }
                            }
                        })
                    );
                })
            )
        ),

        async getRecent(limit: number = 5): Promise<Persona[]> {
            patchState(store, { loading: true, error: null });
            try {
                const response = await firstValueFrom(personaService.getRecent(limit));

                // Manejar Result<Persona[]> - el backend devuelve array directo en value
                if (response.isSuccess && response.value) {
                    const personas = Array.isArray(response.value) ? response.value : (response.value as any).items || [];
                    patchState(store, { loading: false });
                    return personas;
                } else {
                    const errorMsg = response.error?.message || 'Error al cargar personas recientes';
                    patchState(store, { loading: false, error: errorMsg });
                    throw new Error(errorMsg);
                }
            } catch (err: any) {
                const errorMsg = err.message || 'Error al cargar personas recientes';
                patchState(store, { loading: false, error: errorMsg });
                throw err;
            }
        },

        clearError() {
            patchState(store, { error: null });
        }
    }))
);
