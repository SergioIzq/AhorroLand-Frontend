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
import { FormaPagoStore } from '@/features/formas-pago/store/forma-pago.store';
import { FormaPago } from '@/core/models/forma-pago.model';
import { FormaPagoFormModalComponent } from '../components/forma-pago-form-modal.component';
import { BasePageComponent, BasePageTemplateComponent } from '@/shared/components';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
    selector: 'app-formas-pago-list-page',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, ToastModule, TableModule, ToolbarModule, InputIconModule, IconFieldModule, SkeletonModule, FormaPagoFormModalComponent, BasePageTemplateComponent],
    providers: [MessageService, ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-base-page-template [loading]="formaPagoStore.loading()" [skeletonType]="'table'">
            <div class="card surface-ground px-4 py-5 md:px-6 lg:px-8">
                <div class="surface-card shadow-2 border-round p-6">
                    <p-toast></p-toast>

                    <p-toolbar styleClass="mb-6 gap-2 p-6">
                        <ng-template #start>
                            <p-button label="Nueva Forma de Pago" icon="pi pi-plus" severity="secondary" class="mr-2" (onClick)="openNew()" />
                        </ng-template>

                        <ng-template #end>
                            <p-button icon="pi pi-refresh" severity="secondary" outlined (onClick)="refreshTable()" pTooltip="Actualizar" />
                        </ng-template>
                    </p-toolbar>

                    <p-table
                        #dt
                        [value]="formaPagoStore.formasPago()"
                        [loading]="formaPagoStore.loading()"
                        [lazy]="true"
                        (onLazyLoad)="onLazyLoad($event)"
                        [paginator]="true"
                        [rows]="pageSize"
                        [totalRecords]="formaPagoStore.totalRecords()"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} formas de pago"
                        [rowsPerPageOptions]="[10, 25, 50]"
                        [tableStyle]="{ 'min-width': '50rem' }"
                        styleClass="p-datatable-gridlines"
                        [rowHover]="true"
                        dataKey="id"
                    >
                        <ng-template #caption>
                            <div class="flex items-center justify-between py-3 px-4">
                                <h5 class="m-0 font-semibold text-xl">Gestión de Formas de Pago</h5>
                                <p-iconfield>
                                    <p-inputicon styleClass="pi pi-search" />
                                    <input pInputText type="text" [(ngModel)]="searchTerm" (input)="onSearchChange($event)" placeholder="Buscar formas de pago..." />
                                </p-iconfield>
                            </div>
                        </ng-template>

                        <ng-template #header>
                            <tr>
                                <th pSortableColumn="nombre" style="min-width:30rem; padding: 1rem">
                                    Nombre
                                    <p-sortIcon field="nombre" />
                                </th>
                                <th style="min-width:10rem">Acciones</th>
                            </tr>
                        </ng-template>

                        <ng-template #body let-formaPago>
                            <tr>
                                <td style="padding: 1rem">
                                    <div class="flex items-center gap-2">
                                        <i class="pi pi-wallet text-primary"></i>
                                        <span class="font-semibold">{{ formaPago.nombre }}</span>
                                    </div>
                                </td>
                                <td>
                                    <p-button icon="pi pi-pencil" class="mr-2" [rounded]="true" [outlined]="true" (click)="editFormaPago(formaPago)" />
                                    <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [outlined]="true" (click)="deleteFormaPago(formaPago)" />
                                </td>
                            </tr>
                        </ng-template>

                        <ng-template #loadingbody>
                            <tr>
                                <td style="padding: 1rem"><p-skeleton width="80%" /></td>
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
                                <td colspan="8" style="padding: 2rem">
                                    <div class="text-center py-8">
                                        <i class="pi pi-inbox text-500 text-5xl mb-3"></i>
                                        <p class="text-900 font-semibold text-xl mb-2">No hay formas de pago</p>
                                        <p class="text-600 mb-4">Comienza agregando tu primera forma de pago</p>
                                        <p-button label="Crear Forma de Pago" icon="pi pi-plus" (onClick)="openNew()" />
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>

                    <app-forma-pago-form-modal [visible]="formaPagoDialog" [formaPago]="currentFormaPago" (visibleChange)="formaPagoDialog = $event" (save)="onSaveFormaPago($event)" (cancel)="hideDialog()" />
                </div>
            </div>
        </app-base-page-template>
    `
})
export class FormasPagoListPage extends BasePageComponent {
    formaPagoStore = inject(FormaPagoStore);

    protected override loadingSignal = this.formaPagoStore.loading;
    protected override skeletonType = 'table' as const;

    @ViewChild('dt') dt!: Table;

    formaPagoDialog: boolean = false;
    currentFormaPago: Partial<FormaPago> = {};
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
            this.reloadFormasPago();
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

        this.reloadFormasPago();
    }

    /**
     * Manejar cambios en la búsqueda con debounce
     */
    onSearchChange(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.searchSubject.next(value);
    }

    /**
     * Recargar formas de pago con los filtros actuales
     */
    private reloadFormasPago() {
        this.formaPagoStore.loadFormasPagoPaginated({
            page: this.pageNumber,
            pageSize: this.pageSize,
            searchTerm: this.searchTerm || undefined,
            sortColumn: this.sortColumn || undefined,
            sortOrder: this.sortOrder || undefined
        });
    }

    loadFormasPago() {
        this.reloadFormasPago();
    }

    refreshTable() {
        this.pageNumber = 1;
        this.searchTerm = '';
        this.reloadFormasPago();
        this.showInfo('Datos actualizados', 'Actualización');
    }

    openNew() {
        this.currentFormaPago = {};
        this.formaPagoDialog = true;
    }

    hideDialog() {
        this.formaPagoDialog = false;
        this.currentFormaPago = {};
    }

    async onSaveFormaPago(formaPago: Partial<FormaPago>) {
        if (formaPago.id) {
            try {
                await this.formaPagoStore.update(formaPago.id, formaPago);
                this.showSuccess('Forma de pago actualizada correctamente');
                this.hideDialog();
            } catch (error: any) {
                this.showError(error.message || 'Error al actualizar la forma de pago');
            }
        } else {
            try {
                await this.formaPagoStore.create(formaPago.nombre!);
                this.showSuccess('Forma de pago creada correctamente');
                this.hideDialog();
            } catch (error: any) {
                this.showError(error.message || 'Error al crear la forma de pago');
            }
        }
    }

    editFormaPago(formaPago: FormaPago) {
        this.currentFormaPago = { ...formaPago };
        this.formaPagoDialog = true;
    }

    deleteFormaPago(formaPago: FormaPago) {
        this.confirmAction(
            `¿Estás seguro de eliminar la forma de pago "${formaPago.nombre}"?`,
            () => {
                this.formaPagoStore.deleteFormaPago(formaPago.id);
            },
            {
                header: 'Confirmar eliminación',
                acceptLabel: 'Sí, eliminar',
                rejectLabel: 'Cancelar',
                successMessage: 'Forma de pago eliminada correctamente'
            }
        );
    }
}
