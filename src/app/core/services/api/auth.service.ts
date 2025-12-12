import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, map, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthResponse, LoginCredentials, Usuario } from '../../models';
import { Result } from '@/core/models/common.model';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/auth`;
    private readonly USER_KEY = 'user_data';

    login(credentials: LoginCredentials): Observable<Usuario> {
        return this.http.post<Result<any>>(`${this.apiUrl}/login?useCookie=true`, credentials).pipe(switchMap(() => this.fetchCurrentUser()));
    }

    register(payload: { correo: string; contrasena: string; nombre: string; apellidos?: string }): Observable<string> {
        return this.http.post<Result<string>>(`${this.apiUrl}/register`, payload).pipe(map((res) => res.value));
    }

    confirmEmail(token: string): Observable<string> {
        return this.http.get<Result<string>>(`${this.apiUrl}/confirmar-correo?token=${token}`).pipe(map((res) => res.value));
    }

    resendConfirmation(correo: string): Observable<void> {
        return this.http.post<Result<void>>(`${this.apiUrl}/resend-confirmation`, { correo: correo }).pipe(map(() => undefined));
    }

    forgotPassword(correo: string): Observable<string> {
        return this.http.post<Result<string>>(`${this.apiUrl}/forgot-password`, { correo }, { observe: 'response' }).pipe(
            map((response) => {
                // Si es 204, no hay body
                if (response.status === 204) {
                    return 'Correo de recuperación enviado correctamente';
                }
                // Si hay body, extraer el valor
                return response.body?.value || 'Correo de recuperación enviado correctamente';
            })
        );
    }

    resetPassword(correo: string, token: string, newPassword: string): Observable<string> {
        return this.http.post<Result<string>>(`${this.apiUrl}/reset-password`, { correo, token, newPassword }, { observe: 'response' }).pipe(
            map((response) => {
                // Si es 204, no hay body
                if (response.status === 204) {
                    return 'Contraseña restablecida correctamente';
                }
                // Si hay body, extraer el valor
                return response.body?.value || 'Contraseña restablecida correctamente';
            })
        );
    }

    logout(): Observable<void> {
        return this.http.post<Result<string>>(`${this.apiUrl}/logout`, {}).pipe(
            tap(() => this.clearUser()),
            map(() => undefined),
            catchError(() => {
                this.clearUser();
                return of(undefined);
            })
        );
    }

    fetchCurrentUser(): Observable<Usuario> {
        const url = `${this.apiUrl}/me?_t=${Date.now()}`;
        return this.http
            .get<Result<any>>(url, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    Pragma: 'no-cache',
                    Expires: '0'
                }
            })
            .pipe(
                map((res) => {
                    if (!res.isSuccess || !res.value) {
                        throw new Error('Respuesta inválida del servidor');
                    }

                    const data = res.value;
                    const user: Usuario = {
                        id: data.id || data.Id,
                        correo: data.correo || data.correo || data.correo || data.Correo,
                        nombre: data.nombre || data.Nombre,
                        apellidos: data.apellidos || data.Apellidos,
                        rol: data.rol || data.Rol,
                        avatar: data.avatar || data.Avatar || null
                    };

                    this.setUser(user);
                    return user;
                }),
                catchError((err) => {
                    this.clearUser();
                    return throwError(() => err);
                })
            );
    }

    setUser(user: Usuario): void {
        if (!user) return;
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }

    clearUser(): void {
        localStorage.removeItem(this.USER_KEY);
    }

    getUserFromStorage(): Usuario | null {
        const data = localStorage.getItem(this.USER_KEY);
        if (!data || data === 'undefined' || data === 'null') {
            return null;
        }
        try {
            return JSON.parse(data);
        } catch {
            localStorage.removeItem(this.USER_KEY);
            return null;
        }
    }

    updateProfile(data: { nombre: string; apellido?: string }): Observable<void> {
        return this.http.put<Result<void>>(`${this.apiUrl}/profile`, data).pipe(map(() => undefined));
    }

    uploadAvatar(file: File): Observable<string> {
        const formData = new FormData();
        formData.append('file', file);

        return this.http.post<Result<string>>(`${this.apiUrl}/avatar`, formData).pipe(map((res) => res.value));
    }
}
