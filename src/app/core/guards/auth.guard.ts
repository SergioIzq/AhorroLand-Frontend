import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthStore } from '../stores/auth.store';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    return toObservable(authStore.initialized).pipe(
        filter(initialized => initialized === true),
        take(1),
        map(() => {
            if (authStore.isAuthenticated()) {
                return true;
            }

            return router.createUrlTree(['/auth/login'], { 
                queryParams: { returnUrl: state.url } 
            });
        })
    );
};

export const noAuthGuard: CanActivateFn = () => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    return toObservable(authStore.initialized).pipe(
        filter(initialized => initialized === true),
        take(1),
        map(() => {
            if (!authStore.isAuthenticated()) {
                return true;
            }

            return router.createUrlTree(['/']);
        })
    );
};