import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul> `
})
export class AppMenu {
    model: MenuItem[] = [];

    ngOnInit() {
        this.model = [
            {
                label: 'Inicio',
                items: [
                    { label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/'] }
                ]
            },
            {
                label: 'Operaciones',
                icon: 'pi pi-fw pi-wallet',
                items: [
                    {
                        label: 'Gastos',
                        icon: 'pi pi-fw pi-arrow-down',
                        routerLink: ['/gastos']
                    },
                    {
                        label: 'Ingresos',
                        icon: 'pi pi-fw pi-arrow-up',
                        routerLink: ['/ingresos']
                    },
                    {
                        label: 'Traspasos',
                        icon: 'pi pi-fw pi-sync',
                        routerLink: ['/traspasos']
                    }
                ]
            },
            {
                label: 'Catálogos',
                icon: 'pi pi-fw pi-database',
                items: [
                    {
                        label: 'Categorías',
                        icon: 'pi pi-fw pi-tag',
                        routerLink: ['/catalogos/categorias']
                    },
                    {
                        label: 'Conceptos',
                        icon: 'pi pi-fw pi-list',
                        routerLink: ['/conceptos']
                    },
                    {
                        label: 'Proveedores',
                        icon: 'pi pi-fw pi-building',
                        routerLink: ['/proveedores']
                    },
                    {
                        label: 'Clientes',
                        icon: 'pi pi-fw pi-briefcase',
                        routerLink: ['/clientes']
                    },
                    {
                        label: 'Personas',
                        icon: 'pi pi-fw pi-users',
                        routerLink: ['/personas']
                    },
                    {
                        label: 'Formas de Pago',
                        icon: 'pi pi-fw pi-money-bill',
                        routerLink: ['/formas-pago']
                    },
                                        {
                        label: 'Cuentas',
                        icon: 'pi pi-fw pi-credit-card',
                        routerLink: ['/cuentas']
                    },
                ]
            },
            {
                label: 'Programación',
                icon: 'pi pi-fw pi-calendar',
                items: [
                    {
                        label: 'Gastos Programados',
                        icon: 'pi pi-fw pi-calendar-minus',
                        routerLink: ['/programacion/gastos-programados']
                    },
                    {
                        label: 'Ingresos Programados',
                        icon: 'pi pi-fw pi-calendar-plus',
                        routerLink: ['/programacion/ingresos-programados']
                    },
                    {
                        label: 'Traspasos Programados',
                        icon: 'pi pi-fw pi-replay',
                        routerLink: ['/programacion/traspasos-programados']
                    }
                ]
            }
        ];
    }
}
