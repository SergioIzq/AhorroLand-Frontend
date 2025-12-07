import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./pages/ingresos-programados-list.page').then((m) => m.IngresosProgramadosListPage)
    }
] as Routes;
