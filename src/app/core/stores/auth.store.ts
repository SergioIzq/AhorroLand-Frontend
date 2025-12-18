import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom, interval, Observable, Subscription } from 'rxjs';
import { Router } from '@angular/router';

// Asegúrate de que las rutas a tus modelos/servicios sean correctas
import { AuthService } from '@/core/services/api/auth.service';
import { LoginCredentials, Usuario } from '../models';
import { ErrorResponse } from '../models/error-response.model';

interface AuthState {
    user: Usuario | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
    initialized: boolean;
    isLoggingOut: boolean;
    isFetchingUser: boolean;
}

const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    initialized: false,
    isLoggingOut: false,
    isFetchingUser: false
};

// Intervalo de verificación de sesión (5 minutos)
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000;
let sessionCheckSubscription: Subscription | null = null;

export const AuthStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),

    withComputed((store) => ({
        isLoggedIn: computed(() => store.isAuthenticated() && store.user() !== null),

        userName: computed(() => {
            const user = store.user();
            return user ? `${user.nombre} ${user.apellidos ?? ''}`.trim() : '';
        }),

        userInitials: computed(() => {
            const user = store.user();
            if (!user) return '';
            const first = user.nombre?.charAt(0) || '';
            const last = user.apellidos?.charAt(0) || '';
            return `${first}${last}`.toUpperCase();
        })
    })),

    withMethods((store, authService = inject(AuthService), router = inject(Router)) => ({
        
        // --- Helpers Internos ---
        
        async _executeSimpleRequest<T>(request$: Observable<T>, errorMessage: string): Promise<T> {
            patchState(store, { loading: true, error: null });
            try {
                const result = await firstValueFrom(request$);
                patchState(store, { loading: false });
                return result;
            } catch (err: any) {
                const errorMsg = (err.error as ErrorResponse)?.detail || errorMessage;
                patchState(store, { loading: false, error: errorMsg });
                throw err;
            }
        },

        _startSessionCheck() {
            // Evitar múltiples suscripciones
            if (sessionCheckSubscription) {
                sessionCheckSubscription.unsubscribe();
            }
            
            sessionCheckSubscription = interval(SESSION_CHECK_INTERVAL).subscribe(async () => {
                // Solo verificar si hay usuario autenticado y no está en proceso de logout
                if (store.isAuthenticated() && !store.isLoggingOut()) {
                    try {
                        await firstValueFrom(authService.fetchCurrentUser());
                    } catch (err: any) {
                        // Si es 401, la sesión expiró
                        if (err.status === 401) {
                            console.warn('Sesión expirada detectada por verificación periódica');
                            // Llamamos a la lógica de expiración localmente
                            // Nota: dentro de withMethods, usamos las funciones definidas aquí
                            // Para mayor seguridad en JS, replicamos la llamada de limpieza o usamos el router
                            
                            // Detener verificación
                            if (sessionCheckSubscription) sessionCheckSubscription.unsubscribe();

                            authService.clearUser();
                            patchState(store, {
                                user: null,
                                isAuthenticated: false,
                                loading: false,
                                error: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
                            });
                            router.navigate(['/auth/login']);
                        }
                    }
                }
            });
        },

        _stopSessionCheck() {
            if (sessionCheckSubscription) {
                sessionCheckSubscription.unsubscribe();
                sessionCheckSubscription = null;
            }
        },

        async _handleSessionExpired(): Promise<void> {
            this._stopSessionCheck();
            
            authService.clearUser();
            patchState(store, {
                user: null,
                isAuthenticated: false,
                loading: false,
                error: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
            });
            
            await router.navigate(['/auth/login']);
        },

        // --- Acciones de Autenticación ---

        async login(credentials: LoginCredentials): Promise<void> {
            patchState(store, { loading: true, error: null });
            try {
                const user = await firstValueFrom(authService.login(credentials));
                patchState(store, {
                    user,
                    isAuthenticated: true,
                    loading: false,
                    error: null
                });
                // Iniciar verificación periódica
                this._startSessionCheck();
            } catch (err: any) {
                const errorMsg = (err.error as ErrorResponse)?.detail || 'Error al iniciar sesión';
                patchState(store, { loading: false, error: errorMsg });
                throw err;
            }
        },

        async register(payload: { correo: string; contrasena: string; nombre: string; apellidos?: string }): Promise<void> {
            await this._executeSimpleRequest(authService.register(payload), 'Error al registrar usuario');
        },

        async confirmEmail(token: string): Promise<void> {
            await this._executeSimpleRequest(authService.confirmEmail(token), 'Error al confirmar correo');
        },

        async forgotPassword(correo: string): Promise<void> {
            await this._executeSimpleRequest(authService.forgotPassword(correo), 'No se pudo enviar el correo');
        },

        async resetPassword(payload: { correo: string; token: string; newPassword: string }): Promise<void> {
            await this._executeSimpleRequest(authService.resetPassword(payload.correo, payload.token, payload.newPassword), 'No se pudo restablecer la contraseña');
        },

        async resendConfirmationEmail(correo: string): Promise<void> {
            await this._executeSimpleRequest(authService.resendConfirmation(correo), 'Error al reenviar correo');
        },

        async logout(): Promise<void> {
            patchState(store, { loading: true, isLoggingOut: true });
            
            this._stopSessionCheck();
            
            try {
                await firstValueFrom(authService.logout());
            } catch (err) {
                console.warn('Logout falló en backend, limpiando localmente', err);
            } finally {
                authService.clearUser();
                patchState(store, {
                    user: null,
                    isAuthenticated: false,
                    loading: false,
                    error: null
                });
                
                await router.navigate(['/auth/login']);
                
                // Resetear isLoggingOut después de la navegación
                patchState(store, { isLoggingOut: false });
            }
        },

        // --- Acciones de Perfil ---

        async updateProfile(data: { nombre: string; apellidos: string | null }): Promise<void> {
            patchState(store, { loading: true, error: null });
            try {
                await firstValueFrom(authService.updateProfile(data));

                const currentUser = store.user();
                if (currentUser) {
                    const updatedUser = {
                        ...currentUser,
                        nombre: data.nombre,
                        apellidos: data.apellidos ?? null
                    };

                    authService.setUser(updatedUser);
                    patchState(store, { user: updatedUser, loading: false });
                }
            } catch (err: any) {
                const errorMsg = (err.error as ErrorResponse)?.detail || 'Error al actualizar perfil';
                patchState(store, { loading: false, error: errorMsg });
                throw err;
            }
        },

        async updateAvatar(file: File): Promise<void> {
            patchState(store, { loading: true, error: null });
            try {
                const newAvatarUrl = await firstValueFrom(authService.uploadAvatar(file));

                const currentUser = store.user();
                if (currentUser) {
                    const updatedUser = { ...currentUser, avatar: newAvatarUrl };
                    authService.setUser(updatedUser);
                    patchState(store, { user: updatedUser, loading: false });
                }
            } catch (err: any) {
                const errorMsg = (err.error as ErrorResponse)?.detail || 'Error al actualizar avatar';
                patchState(store, { loading: false, error: errorMsg });
                throw err;
            }
        },

        // --- Utilidades Públicas ---

        async checkSession(): Promise<boolean> {
            if (!store.isAuthenticated()) {
                return false;
            }

            try {
                await firstValueFrom(authService.fetchCurrentUser());
                return true;
            } catch (err: any) {
                if (err.status === 401) {
                    await this._handleSessionExpired();
                }
                return false;
            }
        },

        setUser(user: Usuario | null) {
            patchState(store, { user, isAuthenticated: !!user });
        },

        clearError() {
            patchState(store, { error: null });
        }
    })),

    withHooks({
        // CORRECCIÓN PRINCIPAL: Eliminado `authStore = inject(AuthStore)`
        onInit(store, authService = inject(AuthService)) {
            
            // Prevenir múltiples requests
            if (store.isFetchingUser()) {
                return;
            }

            const user = authService.getUserFromStorage();

            if (user) {
                patchState(store, { user, isAuthenticated: true, initialized: true });

                // Marcar fetch
                patchState(store, { isFetchingUser: true });

                authService.fetchCurrentUser().subscribe({
                    next: (freshUser) => {
                        patchState(store, { 
                            user: freshUser, 
                            isAuthenticated: true, 
                            isFetchingUser: false 
                        });
                        
                        // CORRECCIÓN: Accedemos al método a través del parámetro 'store'
                        store._startSessionCheck();
                    },
                    error: () => {
                        console.warn('Sesión expirada al inicializar');
                        authService.clearUser();
                        patchState(store, { 
                            user: null, 
                            isAuthenticated: false, 
                            isFetchingUser: false 
                        });
                    }
                });
            } else {
                patchState(store, { initialized: true });
            }
        },
        onDestroy() {
            if (sessionCheckSubscription) {
                sessionCheckSubscription.unsubscribe();
                sessionCheckSubscription = null;
            }
        }
    })
);