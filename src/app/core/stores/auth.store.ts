import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthService } from '@/core/services/api/auth.service';
import { LoginCredentials, Usuario } from '../models';
import { ErrorResponse } from '../models/error-response.model';

interface AuthState {
    user: Usuario | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
    initialized: boolean;
}

const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    initialized: false
};

export const AuthStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),

    withComputed((store) => ({
        isLoggedIn: computed(() => store.isAuthenticated() && store.user() !== null),
        userName: computed(() => {
            const user = store.user();
            console.log(user)
            return user ? `${user.nombre} ${user.apellido || ''}`.trim() : '';
        }),
        userInitials: computed(() => {
            const user = store.user();
            if (!user) return '';
            const firstInitial = user.nombre?.charAt(0) || '';
            const lastInitial = user.apellido?.charAt(0) || '';
            return `${firstInitial}${lastInitial}`.toUpperCase();
        })
    })),

    withMethods((store, authService = inject(AuthService)) => ({
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
            } catch (err: any) {
                const errorMsg = (err.error as ErrorResponse)?.detail || 'Error al iniciar sesión';

                patchState(store, {
                    loading: false,
                    error: errorMsg
                });

                throw err;
            }
        },

        async register(payload: { correo: string; contrasena: string }): Promise<void> {
            return this.executeAuthAction(
                () => authService.register(payload),
                'Error al registrar usuario'
            );
        },

        async confirmEmail(token: string): Promise<void> {
            return this.executeAuthAction(
                () => authService.confirmEmail(token),
                'Error al confirmar correo'
            );
        },

        async forgotPassword(email: string): Promise<void> {
            return this.executeAuthAction(
                () => authService.forgotPassword(email),
                'No se pudo enviar el correo'
            );
        },

        async resetPassword(payload: { email: string; token: string; newPassword: string }): Promise<void> {
            return this.executeAuthAction(
                () => authService.resetPassword(payload.email, payload.token, payload.newPassword),
                'No se pudo restablecer la contraseña'
            );
        },

        async resendConfirmationEmail(email: string): Promise<void> {
            return this.executeAuthAction(
                () => authService.resendConfirmation(email),
                'Error al reenviar correo'
            );
        },

        async logout(): Promise<void> {
            patchState(store, { loading: true });
            try {
                await firstValueFrom(authService.logout());
            } finally {
                patchState(store, {
                    user: null,
                    isAuthenticated: false,
                    loading: false,
                    error: null
                });
            }
        },

        setUser(user: Usuario | null) {
            patchState(store, { user, isAuthenticated: user !== null });
        },

        clearError() {
            patchState(store, { error: null });
        },

        async executeAuthAction(action: () => Observable<any>, errorMessage: string): Promise<void> {
            patchState(store, { loading: true, error: null });
            try {
                await firstValueFrom(action());
                patchState(store, { loading: false });
            } catch (err: any) {
                const errorMsg = (err.error as ErrorResponse)?.detail || errorMessage;
                patchState(store, { loading: false, error: errorMsg });
                throw err;
            }
        }
    })),

    withHooks({
        onInit(store, authService = inject(AuthService)) {
            const user = authService.getUserFromStorage();

            if (user) {
                patchState(store, { user, isAuthenticated: true, initialized: true });

                authService.fetchCurrentUser().subscribe({
                    next: (freshUser) => patchState(store, { user: freshUser, isAuthenticated: true }),
                    error: () => {
                        patchState(store, { user: null, isAuthenticated: false });
                        authService.clearUser();
                    }
                });
            } else {
                patchState(store, { initialized: true });
            }
        }
    })
);