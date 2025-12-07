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
import { ClienteStore } from '../store/cliente.store';
import { Cliente } from '@/core/models/cliente.model';
import { ClienteFormModalComponent } from '../components/cliente-form-modal.component';
import { BasePageComponent, BasePageTemplateComponent } from '@/shared/components';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
    selector: 'app-clientes-list-page',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, ToastModule, TableModule, ToolbarModule, InputIconModule, IconFieldModule, SkeletonModule, ClienteFormModalComponent, BasePageTemplateComponent],
    providers: [MessageService, ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-base-page-template [loading]="clienteStore.loading()" [skeletonType]="'table'">
            <div class="card surface-ground px-4 py-5 md:px-6 lg:px-8">
                <div class="surface-card shadow-2 border-round p-6">
                    <p-toast></p-toast>

                    <p-toolbar class="mb-6 gap-2 p-6">
                        <ng-template #start>
                            <p-button label="Nueva Cliente" icon="pi pi-plus" severity="secondary" class="mr-2" (onClick)="openNew()" />
                        </ng-template>

                        <ng-template #end>
                            <p-button icon="pi pi-refresh" severity="secondary" outlined (onClick)="refreshTable()" pTooltip="Actualizar" />
                        </ng-template>
                    </p-toolbar>

                    <p-table
                        #dt
                        [value]="clienteStore.clientes()"
                        [loading]="clienteStore.loading()"
                        [lazy]="true"
                        (onLazyLoad)="onLazyLoad($event)"
                        [paginator]="true"
                        [rows]="pageSize"
                        [totalRecords]="clienteStore.totalRecords()"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} clientes"
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
                                <h5 class="m-0 font-semibold text-xl">Gestión de Clientees</h5>
                                <p-iconfield>
                                    <p-inputicon styleClass="pi pi-search" />
                                    <input pInputText type="text" [(ngModel)]="searchTerm" (input)="onSearchChange($event)" placeholder="Buscar clientes..." />
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

                        <ng-template #body let-cliente>
                            <tr>
                                <td style="padding: 1rem">
                                    <div class="flex items-center gap-2">
                                        <i class="pi pi-credit-card text-primary"></i>
                                        <span class="font-semibold">{{ cliente.nombre }}</span>
                                    </div>
                                </td>
                                <td>
                                    <p-button icon="pi pi-pencil" class="mr-2" [rounded]="true" [outlined]="true" (click)="editCliente(cliente)" />
                                    <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [outlined]="true" (click)="deleteCliente(cliente)" />
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
                                        <p class="text-900 font-semibold text-xl mb-2">No hay clientes</p>
                                        <p class="text-600 mb-4">Comienza agregando tu primera cliente</p>
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>

                    <app-cliente-form-modal [visible]="clienteDialog" [cliente]="currentCliente" (visibleChange)="clienteDialog = $event" (save)="onSaveCliente($event)" (cancel)="hideDialog()" />

                </div>
            </div>
        </app-base-page-template>
    `
})
export class ClientesListPage extends BasePageComponent {
    clienteStore = inject(ClienteStore);

    protected override loadingSignal = this.clienteStore.loading;
    protected override skeletonType = 'table' as const;

    @ViewChild('dt') dt!: Table;

    clienteDialog: boolean = false;
    currentCliente: Partial<Cliente> = {};
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
            this.reloadClientees();
        });
    }

    /**
     * Manejar evento lazy load de la tabla (paginación + sort)
     */
    onLazyLoad(event: any) {
        this.pageNumber = (event.first / event.rows) + 1;
        this.pageSize = event.rows;

        // Manejar ordenamiento
        if (event.sortField) {
            this.sortColumn = event.sortField;
            this.sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';
        }

        this.reloadClientees();
    }

    /**
     * Manejar cambios en la búsqueda con debounce
     */
    onSearchChange(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.searchSubject.next(value);
    }

    /**
     * Recargar clientes con los filtros actuales
     */
    private reloadClientees() {
        this.clienteStore.loadClienteesPaginated({
            page: this.pageNumber,
            pageSize: this.pageSize,
            searchTerm: this.searchTerm || undefined,
            sortColumn: this.sortColumn || undefined,
            sortOrder: this.sortOrder || undefined
        });
    }

    loadClientees() {
        this.reloadClientees();
    }

    refreshTable() {
        this.pageNumber = 1;
        this.searchTerm = '';
        this.reloadClientees();
        this.showInfo('Datos actualizados', 'Actualización');
    }

    openNew() {
        this.currentCliente = {};
        this.clienteDialog = true;
    }

    hideDialog() {
        this.clienteDialog = false;
        this.currentCliente = {};
    }

    async onSaveCliente(cliente: Partial<Cliente>) {
        if (cliente.id) {
            try {
                await this.clienteStore.update(cliente.id, cliente);
                this.showSuccess('Cliente actualizado correctamente');
                this.reloadClientees();
                this.hideDialog();
            } catch (error: any) {
                this.showError(error.message || 'Error al actualizar el cliente');
            }
        } else {
            try {
                await this.clienteStore.create(cliente.nombre!);
                this.showSuccess('Cliente creado correctamente');
                this.reloadClientees();
                this.hideDialog();
            } catch (error: any) {
                this.showError(error.message || 'Error al crear el cliente');
            }
        }
    }

    editCliente(cliente: Cliente) {
        this.currentCliente = { ...cliente };
        this.clienteDialog = true;
    }

    deleteCliente(cliente: Cliente) {
        this.confirmAction(
            `¿Estás seguro de eliminar el cliente "${cliente.nombre}"?`,
            () => {
                this.clienteStore.deleteCliente(cliente.id);
            },
            {
                header: 'Confirmar eliminación',
                acceptLabel: 'Sí, eliminar',
                rejectLabel: 'Cancelar',
                successMessage: 'Cliente eliminado correctamente'
            }
        );
    }
}
