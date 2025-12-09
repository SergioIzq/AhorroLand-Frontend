import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./pages/traspasos-programados-list.page').then((m) => m.TraspasosProgramadosListPage)
    }
] as Routes;
