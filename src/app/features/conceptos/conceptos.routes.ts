import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./pages/conceptos-list.page').then((m) => m.ConceptosListPage)
    }
] as Routes;
