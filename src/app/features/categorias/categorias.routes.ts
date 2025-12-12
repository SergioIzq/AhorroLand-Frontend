import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./pages/categorias-list.page').then((m) => m.CategoriasListPage)
    }
] as Routes;
