import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./pages/cuentas-list.page').then(m => m.CuentasListPage)
    }
] as Routes;
