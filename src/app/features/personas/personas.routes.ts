import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./pages/personas-list.page').then(m => m.PersonasListPage)
    }
] as Routes;
