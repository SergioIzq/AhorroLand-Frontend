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
            // Usamos operador de coalescencia nula (??) para strings vacíos
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

    withMethods((store, authService = inject(AuthService)) => ({
        // --- Helper privado para reutilizar lógica try-catch ---
        async _executeRequest<T>(request$: Observable<T>, errorMessage: string): Promise<T> {
            patchState(store, { loading: true, error: null });
            try {
                const result = await firstValueFrom(request$);
                patchState(store, { loading: false });
                return result;
            } catch (err: any) {
                // Extraer mensaje del backend o usar fallback
                const errorMsg = (err.error as ErrorResponse)?.detail || errorMessage;
                patchState(store, { loading: false, error: errorMsg });
                throw err;
            }
        },

        // --- Acciones Públicas ---

        async login(credentials: LoginCredentials): Promise<void> {
            patchState(store, { loading: true, error: null });
            try {
                // El servicio login ya devuelve el Usuario completo gracias al switchMap interno
                const user = await firstValueFrom(authService.login(credentials));

                patchState(store, {
                    user,
                    isAuthenticated: true,
                    loading: false,
                    error: null
                });
            } catch (err: any) {
                const errorMsg = (err.error as ErrorResponse)?.detail || 'Error al iniciar sesión';
                patchState(store, { loading: false, error: errorMsg });
                throw err;
            }
        },

        async register(payload: { correo: string; contrasena: string; nombre: string; apellidos?: string }): Promise<void> {
            // Usamos _executeRequest porque no necesitamos actualizar el store con el resultado
            await this._executeRequest(authService.register(payload), 'Error al registrar usuario');
        },

        async confirmEmail(token: string): Promise<void> {
            await this._executeRequest(authService.confirmEmail(token), 'Error al confirmar correo');
        },

        async forgotPassword(email: string): Promise<void> {
            await this._executeRequest(authService.forgotPassword(email), 'No se pudo enviar el correo de recuperación');
        },

        async resetPassword(payload: { email: string; token: string; newPassword: string }): Promise<void> {
            await this._executeRequest(authService.resetPassword(payload.email, payload.token, payload.newPassword), 'No se pudo restablecer la contraseña');
        },

        async resendConfirmationEmail(email: string): Promise<void> {
            await this._executeRequest(authService.resendConfirmation(email), 'Error al reenviar correo de confirmación');
        },

        async logout(): Promise<void> {
            patchState(store, { loading: true });
            try {
                await firstValueFrom(authService.logout());
            } catch (err) {
                console.warn('Error en logout backend, limpiando localmente', err);
            } finally {
                // Limpieza incondicional
                patchState(store, {
                    user: null,
                    isAuthenticated: false,
                    loading: false,
                    error: null
                });
            }
        },

        async updateProfile(data: { nombre: string; apellidos: string | null }): Promise<void> {
            patchState(store, { loading: true, error: null });

            try {
                // 1. Llamada al Backend
                await firstValueFrom(authService.updateProfile(data));

                // 2. Si tiene éxito, actualizamos el estado local (Optimistic update confirmado)
                const currentUser = store.user();

                if (currentUser) {
                    // Creamos el objeto usuario actualizado
                    const updatedUser = {
                        ...currentUser,
                        nombre: data.nombre,
                        // Mapeamos 'apellido' (frontend) a 'apellidos' (modelo Usuario si fuera necesario)
                        // Asegúrate de que tu modelo Usuario usa 'apellidos' o 'apellido' consistentemente.
                        // Basado en tu código anterior, parece que usas 'apellidos' en el modelo Usuario.
                        apellidos: data.apellidos ?? null
                    };

                    // 3. Guardamos en LocalStorage para persistencia (F5)
                    authService.setUser(updatedUser);

                    // 4. Actualizamos el Signal Store (UI reactiva)
                    patchState(store, {
                        user: updatedUser,
                        loading: false
                    });
                }
            } catch (err: any) {
                const errorMsg = (err.error as ErrorResponse)?.detail || 'Error al actualizar el perfil';
                patchState(store, { loading: false, error: errorMsg });
                throw err;
            }
        },

        // Métodos síncronos para actualizaciones manuales
        setUser(user: Usuario | null) {
            patchState(store, { user, isAuthenticated: !!user });
        },

        clearError() {
            patchState(store, { error: null });
        }
    })),

    withHooks({
        onInit(store, authService = inject(AuthService)) {
            // 1. Carga síncrona inicial (para que el Guard pase rápido)
            const user = authService.getUserFromStorage();

            if (user) {
                // Estado optimista: "Estamos logueados"
                patchState(store, { user, isAuthenticated: true, initialized: true });

                // 2. Validación asíncrona (Background check)
                authService.fetchCurrentUser().subscribe({
                    next: (freshUser) => {
                        // Si el token es válido, actualizamos con datos frescos
                        patchState(store, { user: freshUser, isAuthenticated: true });
                    },
                    error: () => {
                        // Si el token expiró, cerramos sesión automáticamente
                        console.warn('Sesión expirada detectada al inicio');
                        authService.clearUser();
                        patchState(store, { user: null, isAuthenticated: false });
                        // Opcional: Redirigir al login si estás en ruta protegida (lo hará el guard al navegar)
                    }
                });
            } else {
                // No hay usuario guardado, inicialización terminada
                patchState(store, { initialized: true });
            }
        }
    })
);