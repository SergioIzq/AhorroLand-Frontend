import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./pages/traspasos-list.page').then((m) => m.TraspasosListPage)
    }
] as Routes;
