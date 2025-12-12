import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./pages/gastos-programados-list.page').then((m) => m.GastosProgramadosListPage)
    }
] as Routes;
