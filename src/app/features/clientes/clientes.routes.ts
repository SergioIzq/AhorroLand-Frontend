import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./pages/clientes-list.page').then(m => m.ClientesListPage)
    }
] as Routes;
