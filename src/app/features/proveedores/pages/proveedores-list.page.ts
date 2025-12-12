import { Component, inject, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Table, TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { SkeletonModule } from 'primeng/skeleton';
import { ProveedorStore } from '../store/proveedor.store';
import { Proveedor } from '@/core/models/proveedor.model';
import { ProveedorFormModalComponent } from '../components/proveedor-form-modal.component';
import { BasePageComponent, BasePageTemplateComponent } from '@/shared/components';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
    selector: 'app-proveedores-list-page',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, ToastModule, TableModule, ToolbarModule, InputIconModule, IconFieldModule, SkeletonModule, ProveedorFormModalComponent, BasePageTemplateComponent],
    providers: [MessageService, ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-base-page-template [loading]="proveedorStore.loading()" [skeletonType]="'table'">
            <div class="card surface-ground px-4 py-5 md:px-6 lg:px-8">
                <div class="surface-card shadow-2 border-round p-6">
                    <p-toast></p-toast>

                    <p-toolbar class="mb-6 gap-2 p-6">
                        <ng-template #start>
                            <p-button label="Nueva Proveedor" icon="pi pi-plus" severity="secondary" class="mr-2" (onClick)="openNew()" />
                        </ng-template>

                        <ng-template #end>
                            <p-button icon="pi pi-refresh" severity="secondary" outlined (onClick)="refreshTable()" pTooltip="Actualizar" />
                        </ng-template>
                    </p-toolbar>

                    <p-table
                        #dt
                        [value]="proveedorStore.proveedores()"
                        [loading]="proveedorStore.loading()"
                        [lazy]="true"
                        (onLazyLoad)="onLazyLoad($event)"
                        [paginator]="true"
                        [rows]="pageSize"
                        [totalRecords]="proveedorStore.totalRecords()"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} proveedores"
                        [rowsPerPageOptions]="[10, 25, 50]"
                        [tableStyle]="{ 'min-width': '50rem' }"
                        class="p-datatable-gridlines"
                        [rowHover]="true"
                        dataKey="id"
                        [sortField]="'nombre'"
                        [sortOrder]="1"
                    >
                        <ng-template #caption>
                            <div class="flex items-center justify-between py-3 px-4">
                                <h5 class="m-0 font-semibold text-xl">Gestión de Proveedores</h5>
                                <p-iconfield>
                                    <p-inputicon styleClass="pi pi-search" />
                                    <input pInputText type="text" [(ngModel)]="searchTerm" (input)="onSearchChange($event)" placeholder="Buscar proveedores..." />
                                </p-iconfield>
                            </div>
                        </ng-template>

                        <ng-template #header>
                            <tr>
                                <th pSortableColumn="nombre" style="min-width:20rem; padding: 1rem">
                                    Nombre
                                    <p-sortIcon field="nombre" />
                                </th>
                                <th style="min-width:10rem">Acciones</th>
                            </tr>
                        </ng-template>

                        <ng-template #body let-proveedor>
                            <tr>
                                <td style="padding: 1rem">
                                    <div class="flex items-center gap-2">
                                        <i class="pi pi-credit-card text-primary"></i>
                                        <span class="font-semibold">{{ proveedor.nombre }}</span>
                                    </div>
                                </td>
                                <td>
                                    <p-button icon="pi pi-pencil" class="mr-2" [rounded]="true" [outlined]="true" (click)="editProveedor(proveedor)" />
                                    <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [outlined]="true" (click)="deleteProveedor(proveedor)" />
                                </td>
                            </tr>
                        </ng-template>

                        <ng-template #loadingbody>
                            <tr>
                                <td style="padding: 1rem"><p-skeleton width="80%" /></td>
                                <td><p-skeleton width="70%" /></td>
                                <td><p-skeleton width="6rem" /></td>
                                <td>
                                    <div class="flex gap-2">
                                        <p-skeleton shape="circle" size="2.5rem" />
                                        <p-skeleton shape="circle" size="2.5rem" />
                                    </div>
                                </td>
                            </tr>
                        </ng-template>

                        <ng-template #emptymessage>
                            <tr>
                                <td colspan="4" style="padding: 2rem">
                                    <div class="text-center py-8">
                                        <i class="pi pi-inbox text-500 text-5xl mb-3"></i>
                                        <p class="text-900 font-semibold text-xl mb-2">No hay proveedores</p>
                                        <p class="text-600 mb-4">Comienza agregando tu primer proveedor</p>
                                        <p-button label="Crear Proveedor" icon="pi pi-plus" (onClick)="openNew()" />
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>

                    <app-proveedor-form-modal [visible]="proveedorDialog" [proveedor]="currentProveedor" (visibleChange)="proveedorDialog = $event" (save)="onSaveProveedor($event)" (cancel)="hideDialog()" />
                </div>
            </div>
        </app-base-page-template>
    `
})
export class ProveedoresListPage extends BasePageComponent {
    proveedorStore = inject(ProveedorStore);

    protected override loadingSignal = this.proveedorStore.loading;
    protected override skeletonType = 'table' as const;

    @ViewChild('dt') dt!: Table;

    proveedorDialog: boolean = false;
    currentProveedor: Partial<Proveedor> = {};
    private searchSubject = new Subject<string>();

    pageSize: number = 10;
    pageNumber: number = 1;
    searchTerm: string = '';
    sortColumn: string = 'nombre';
    sortOrder: string = 'asc';

    constructor() {
        super();
        // Configurar búsqueda con debounce de 500ms
        this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe((searchValue) => {
            this.searchTerm = searchValue;
            this.pageNumber = 1; // Resetear a primera página en búsqueda
            this.reloadProveedores();
        });
    }

    /**
     * Manejar evento lazy load de la tabla (paginación + sort)
     */
    onLazyLoad(event: any) {
        this.pageNumber = event.first / event.rows + 1;
        this.pageSize = event.rows;

        // Manejar ordenamiento
        if (event.sortField) {
            this.sortColumn = event.sortField;
            this.sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';
        }

        this.reloadProveedores();
    }

    /**
     * Manejar cambios en la búsqueda con debounce
     */
    onSearchChange(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.searchSubject.next(value);
    }

    /**
     * Recargar proveedores con los filtros actuales
     */
    private reloadProveedores() {
        this.proveedorStore.loadProveedoresPaginated({
            page: this.pageNumber,
            pageSize: this.pageSize,
            searchTerm: this.searchTerm || undefined,
            sortColumn: this.sortColumn || undefined,
            sortOrder: this.sortOrder || undefined
        });
    }

    loadProveedores() {
        this.reloadProveedores();
    }

    refreshTable() {
        this.pageNumber = 1;
        this.searchTerm = '';
        this.reloadProveedores();
        this.showInfo('Datos actualizados', 'Actualización');
    }

    openNew() {
        this.currentProveedor = {};
        this.proveedorDialog = true;
    }

    hideDialog() {
        this.proveedorDialog = false;
        this.currentProveedor = {};
    }

    async onSaveProveedor(proveedor: Partial<Proveedor>) {
        if (proveedor.id) {
            try {
                await this.proveedorStore.update(proveedor.id, proveedor);
                this.showSuccess('Proveedor actualizado correctamente');
                this.hideDialog();
            } catch (error: any) {
                this.showError(error.message || 'Error al actualizar el proveedor');
            }
        } else {
            try {
                await this.proveedorStore.create(proveedor.nombre!);
                this.showSuccess('Proveedor creado correctamente');
                this.hideDialog();
            } catch (error: any) {
                this.showError(error.message || 'Error al crear el proveedor');
            }
        }
    }

    editProveedor(proveedor: Proveedor) {
        this.currentProveedor = { ...proveedor };
        this.proveedorDialog = true;
    }

    deleteProveedor(proveedor: Proveedor) {
        this.confirmAction(
            `¿Estás seguro de eliminar el proveedor "${proveedor.nombre}"?`,
            () => {
                this.proveedorStore.deleteProveedor(proveedor.id);
            },
            {
                header: 'Confirmar eliminación',
                acceptLabel: 'Sí, eliminar',
                rejectLabel: 'Cancelar',
                successMessage: 'Proveedor eliminado correctamente'
            }
        );
    }
}
