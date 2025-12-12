import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthStore } from '../stores/auth.store';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';

// Constante con la key de tu localStorage (Asegúrate que coincida con la de tu AuthService)
const USER_STORAGE_KEY = 'user_data'; // ⚠️ CAMBIA ESTO por tu key real

export const authGuard: CanActivateFn = (route, state) => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    return toObservable(authStore.initialized).pipe(
        filter(initialized => initialized === true),
        take(1),
        map(() => {
            // Si está en proceso de logout, redirigir inmediatamente a login
            if (authStore.isLoggingOut()) {
                return router.createUrlTree(['/auth/login']);
            }
            
            // Para proteger rutas privadas, confiamos en el Store
            if (authStore.isAuthenticated()) {
                return true;
            }

            return router.createUrlTree(['/auth/login'], { 
                queryParams: { returnUrl: state.url } 
            });
        })
    );
};

export const noAuthGuard: CanActivateFn = (route, state) => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    // Si el store no está inicializado, esperamos a que lo esté
    if (!authStore.initialized()) {
        return toObservable(authStore.initialized).pipe(
            filter(initialized => initialized === true),
            take(1),
            map(() => {
                // Una vez inicializado, verificamos autenticación
                if (authStore.isAuthenticated() && !authStore.isLoggingOut()) {
                    return router.createUrlTree(['/']);
                }
                return true;
            })
        );
    }

    // Si ya está inicializado, verificación síncrona
    // ✅ CASO 1: Estamos en proceso de logout - permitir acceso
    if (authStore.isLoggingOut()) {
        return true;
    }

    // ❌ CASO 2: Usuario autenticado intentando acceder a páginas de auth
    // Lo mandamos al dashboard
    if (authStore.isAuthenticated()) {
        return router.createUrlTree(['/']);
    }

    // ✅ CASO 3: Usuario anónimo - permitir acceso
    return true;
};