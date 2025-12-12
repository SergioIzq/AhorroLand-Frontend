import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./pages/formas-pago-list.page').then(m => m.FormasPagoListPage)
    }
] as Routes;
