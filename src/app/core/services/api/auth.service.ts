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
        return this.http
            .post<Result<any>>(`${this.apiUrl}/login?useCookie=true`, credentials)
            .pipe(switchMap(() => this.fetchCurrentUser()));
    }

    register(payload: { correo: string; contrasena: string }): Observable<string> {
        return this.http
            .post<Result<string>>(`${this.apiUrl}/register`, payload)
            .pipe(map((res) => res.value));
    }

    confirmEmail(token: string): Observable<string> {
        return this.http
            .get<Result<string>>(`${this.apiUrl}/confirmar-correo?token=${token}`)
            .pipe(map((res) => res.value));
    }

    resendConfirmation(email: string): Observable<void> {
        return this.http
            .post<Result<void>>(`${this.apiUrl}/resend-confirmation`, { correo: email })
            .pipe(map(() => undefined));
    }

    forgotPassword(email: string): Observable<string> {
        return this.http
            .post<Result<string>>(`${this.apiUrl}/forgot-password`, { email })
            .pipe(map((res) => res.value));
    }

    resetPassword(email: string, token: string, newPassword: string): Observable<string> {
        return this.http
            .post<Result<string>>(`${this.apiUrl}/reset-password`, { email, token, newPassword })
            .pipe(map((res) => res.value));
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
        return this.http.get<Result<any>>(`${this.apiUrl}/me`).pipe(
            map((res) => {
                if (!res.isSuccess || !res.value) {
                    throw new Error('Respuesta inválida del servidor');
                }
                
                const data = res.value;
                const user: Usuario = {
                    id: data.id || data.Id,
                    email: data.email || data.Email || data.correo || data.Correo,
                    nombre: data.nombre || data.Nombre,
                    apellido: data.apellido || data.Apellido,
                    rol: data.rol || data.Rol,
                    avatar: data.avatar || data.Avatar
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
}
