import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { authGuard, noAuthGuard } from './app/core/guards/auth.guard';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                loadChildren: () => import('./app/features/dashboard/dashboard.routes')
            },
            {
                path: 'gastos',
                loadChildren: () => import('./app/features/gastos/gastos.routes')
            },
            {
                path: 'ingresos',
                loadChildren: () => import('./app/features/ingresos/ingresos.routes')
            },
            {
                path: 'cuentas',
                loadChildren: () => import('./app/features/cuentas/cuentas.routes')
            },
            {
                path: 'proveedores',
                loadChildren: () => import('./app/features/proveedores/proveedores.routes')
            },
            {
                path: 'auth/my-profile',
                loadComponent: () => import('./app/features/auth/pages/my-profile.page').then((m) => m.MyProfilePage)
            }
        ]
    },
    {
        path: 'auth',
        loadChildren: () => import('./app/features/auth/auth.routes')
    },
    {
        path: 'notfound',
        loadComponent: () => import('./app/shared/pages/notfound.page').then((m) => m.NotFoundPage)
    },
    {
        path: '**',
        redirectTo: '/notfound'
    }
];
