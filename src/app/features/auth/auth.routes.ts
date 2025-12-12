import { noAuthGuard } from '@/core/guards/auth.guard';
import { Routes } from '@angular/router';

export default [
    {
        path: 'login',
        canActivate: [noAuthGuard],
        loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage)
    },
    {
        path: 'register',
        canActivate: [noAuthGuard],
        loadComponent: () => import('./pages/register.page').then((m) => m.RegisterPage)
    },
    {
        path: 'confirmar-email',
        canActivate: [noAuthGuard],
        loadComponent: () => import('./pages/confirm-email.page').then((m) => m.ConfirmEmail)
    },
    {
        path: 'forgot-password',
        canActivate: [noAuthGuard],
        loadComponent: () => import('./pages/forgot-password.page').then((m) => m.ForgotPasswordPage)
    },
    {
        path: 'reset-password',
        canActivate: [noAuthGuard],
        loadComponent: () => import('./pages/reset-password.page').then((m) => m.ResetPasswordPage)
    },
    { path: 'error', loadComponent: () => import('./pages/error.page').then((m) => m.ErrorPage) },
    { path: 'access', loadComponent: () => import('./pages/access.page').then((m) => m.AccessPage) },
    { path: '', redirectTo: 'login', pathMatch: 'full' }
] as Routes;
