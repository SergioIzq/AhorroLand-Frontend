import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

/**
 * Interceptor HTTP moderno funcional para autenticación con cookies
 * Las cookies HttpOnly se envían automáticamente, solo manejamos errores 401
 */

// Flag para evitar múltiples redirecciones simultáneas
let isRedirecting = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    
    // Con cookies HttpOnly, no necesitamos agregar headers manualmente
    // El navegador envía la cookie automáticamente en cada request
    // Solo nos aseguramos de incluir credentials en todas las peticiones
    const authReq = req.clone({
        withCredentials: true // Importante: permite enviar cookies en requests CORS
    });
    
    return next(authReq).pipe(
        catchError(error => {
            // Si es 401 (no autorizado) pero NO es un endpoint de autenticación
            // entonces es sesión expirada y debemos limpiar y redirigir
            // Los 401 de /auth/* (login, register, etc.) NO deben redirigir
            if (error.status === 401 && !req.url.includes('/auth/') && !isRedirecting) {
                isRedirecting = true;
                
                // Limpiar estado local directamente sin llamar al backend
                // para evitar loop infinito de peticiones
                localStorage.removeItem('user_data');
                
                // Redirigir al login
                router.navigate(['/auth/login']).then(() => {
                    // Reset flag después de la redirección
                    setTimeout(() => { isRedirecting = false; }, 1000);
                });
            }
            return throwError(() => error);
        })
    );
};
