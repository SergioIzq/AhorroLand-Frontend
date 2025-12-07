import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./pages/proveedores-list.page').then(m => m.ProveedoresListPage)
    }
] as Routes;
