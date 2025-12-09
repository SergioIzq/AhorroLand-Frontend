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
import { TagModule } from 'primeng/tag';
import { GastosProgramadosStore } from '../stores/gastos-programados.store';
import { GastoProgramado } from '@/core/models/gasto-programado.model';
import { BasePageComponent, BasePageTemplateComponent } from '@/shared/components';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { GastoProgramadoFormModalComponent } from '../components/gasto-programado-form-modal.component';

@Component({
    selector: 'app-gastos-programados-list-page',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, ToastModule, TableModule, ToolbarModule, InputIconModule, IconFieldModule, SkeletonModule, TagModule, BasePageTemplateComponent, GastoProgramadoFormModalComponent],
    providers: [MessageService, ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-base-page-template [loading]="gastosStore.loading()" [skeletonType]="'table'">
            <div class="card surface-ground px-4 py-5 md:px-6 lg:px-8">
                <div class="surface-card shadow-2 border-round p-6">
                    <p-toast></p-toast>

                    <p-toolbar styleClass="mb-6 gap-2 p-6">
                        <ng-template #start>
                            <p-button label="Nuevo Gasto Programado" icon="pi pi-plus" severity="secondary" class="mr-2" (onClick)="openNew()" />
                        </ng-template>

                        <ng-template #end>
                            <p-button icon="pi pi-refresh" severity="secondary" outlined (onClick)="refreshTable()" pTooltip="Actualizar" />
                        </ng-template>
                    </p-toolbar>

                    <p-table
                        #dt
                        [value]="gastosStore.gastosProgramados()"
                        [loading]="gastosStore.loading()"
                        [lazy]="true"
                        (onLazyLoad)="onLazyLoad($event)"
                        [paginator]="true"
                        [rows]="pageSize"
                        [totalRecords]="gastosStore.totalRecords()"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} gastos programados"
                        [rowsPerPageOptions]="[10, 25, 50]"
                        [tableStyle]="{ 'min-width': '50rem' }"
                        styleClass="p-datatable-gridlines"
                        [rowHover]="true"
                        dataKey="id"
                    >
                        <ng-template #caption>
                            <div class="flex items-center justify-between py-3 px-4">
                                <h5 class="m-0 font-semibold text-xl">Gestión de Gastos Programados</h5>
                                <p-iconfield>
                                    <p-inputicon styleClass="pi pi-search" />
                                    <input pInputText type="text" [(ngModel)]="searchTerm" (input)="onSearchChange($event)" placeholder="Buscar gastos programados..." />
                                </p-iconfield>
                            </div>
                        </ng-template>

                        <ng-template #header>
                            <tr>
                                <th pSortableColumn="importe" style="min-width:10rem; padding: 1rem">
                                    Importe
                                    <p-sortIcon field="importe" />
                                </th>
                                <th pSortableColumn="frecuencia" style="min-width:10rem">
                                    Frecuencia
                                    <p-sortIcon field="frecuencia" />
                                </th>
                                <th pSortableColumn="fechaEjecucion" style="min-width:12rem">
                                    Próxima Ejecución
                                    <p-sortIcon field="fechaEjecucion" />
                                </th>
                                <th pSortableColumn="activo" style="min-width:8rem">
                                    Estado
                                    <p-sortIcon field="activo" />
                                </th>
                                <th style="min-width:10rem">Acciones</th>
                            </tr>
                        </ng-template>

                        <ng-template #body let-gasto>
                            <tr>
                                <td style="padding: 1rem">
                                    <span class="font-bold text-red-600">{{ gasto.importe | number: '1.2-2' }} €</span>
                                </td>
                                <td>
                                    <p-tag [value]="gasto.frecuencia" [severity]="getFrecuenciaSeverity(gasto.frecuencia)" />
                                </td>
                                <td>
                                    {{ gasto.fechaEjecucion | date: 'dd/MM/yyyy HH:mm' }}
                                </td>
                                <td>
                                    <p-tag [value]="gasto.activo ? 'Activo' : 'Inactivo'" [severity]="gasto.activo ? 'success' : 'danger'" />
                                </td>
                                <td>
                                    <div class="flex gap-2">
                                        <p-button [icon]="gasto.activo ? 'pi pi-pause' : 'pi pi-play'" [rounded]="true" [outlined]="true" (click)="toggleActivo(gasto)" />
                                        <p-button icon="pi pi-pencil" class="mr-2" [rounded]="true" [outlined]="true" (click)="editGasto(gasto)" pTooltip="Editar" />
                                        <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [outlined]="true" (click)="deleteGasto(gasto)" pTooltip="Eliminar" />
                                    </div>
                                </td>
                            </tr>
                        </ng-template>

                        <ng-template #loadingbody>
                            <tr>
                                <td style="padding: 1rem"><p-skeleton width="80%" /></td>
                                <td><p-skeleton width="70%" /></td>
                                <td><p-skeleton width="70%" /></td>
                                <td><p-skeleton width="70%" /></td>
                                <td>
                                    <div class="flex gap-2">
                                        <p-skeleton shape="circle" size="2.5rem" />
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
                                        <p class="text-900 font-semibold text-xl mb-2">No hay gastos programados</p>
                                        <p class="text-600 mb-4">Comienza agregando tu primer gasto programado</p>
                                        <p-button label="Crear Gasto Programado" icon="pi pi-plus" (onClick)="openNew()" />
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            </div>
        </app-base-page-template>

        <!-- Modal de Formulario -->
        <app-gasto-programado-form-modal [visible]="gastoDialog" [gastoProgramado]="currentGasto" (save)="saveGasto($event)" (cancel)="hideDialog()" />
    `
})
export class GastosProgramadosListPage extends BasePageComponent {
    gastosStore = inject(GastosProgramadosStore);

    protected override loadingSignal = this.gastosStore.loading;
    protected override skeletonType = 'table' as const;

    @ViewChild('dt') dt!: Table;

    private searchSubject = new Subject<string>();

    pageSize: number = 10;
    pageNumber: number = 1;
    searchTerm: string = '';
    sortColumn: string = 'fechaEjecucion';
    sortOrder: string = 'asc';

    // Propiedades del modal
    gastoDialog: boolean = false;
    currentGasto: Partial<GastoProgramado> | null = null;

    constructor() {
        super();
        this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe((searchValue) => {
            this.searchTerm = searchValue;
            this.pageNumber = 1;
            this.reloadGastos();
        });
    }

    onLazyLoad(event: any) {
        this.pageNumber = event.first / event.rows + 1;
        this.pageSize = event.rows;

        if (event.sortField) {
            this.sortColumn = event.sortField;
            this.sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';
        }

        this.reloadGastos();
    }

    onSearchChange(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.searchSubject.next(value);
    }

    private reloadGastos() {
        this.gastosStore.loadGastosProgramadosPaginated({
            page: this.pageNumber,
            pageSize: this.pageSize,
            searchTerm: this.searchTerm || undefined,
            sortColumn: this.sortColumn || undefined,
            sortOrder: this.sortOrder || undefined
        });
    }

    refreshTable() {
        this.pageNumber = 1;
        this.searchTerm = '';
        this.reloadGastos();
        this.showInfo('Datos actualizados', 'Actualización');
    }

    openNew() {
        this.currentGasto = null;
        this.gastoDialog = true;
    }

    editGasto(gasto: GastoProgramado) {
        this.currentGasto = { ...gasto };
        this.gastoDialog = true;
    }

    hideDialog() {
        this.gastoDialog = false;
        this.currentGasto = null;
    }

    saveGasto(gasto: Partial<GastoProgramado>) {
        if (gasto.id) {
            // Actualizar
            this.gastosStore.update(gasto.id, gasto);
            this.showSuccess('Gasto programado actualizado correctamente');
        } else {
            // Crear
            this.gastosStore.createGasto(gasto);
            this.showSuccess('Gasto programado creado correctamente');
        }
        this.hideDialog();
        setTimeout(() => this.reloadGastos(), 300);
    }

    toggleActivo(gasto: GastoProgramado) {
        this.confirmAction(
            `¿Estás seguro de ${gasto.activo ? 'pausar' : 'activar'} el gasto programado?`,
            () => {
                this.gastosStore.toggleActivo({ id: gasto.id, activo: !gasto.activo });
                this.showSuccess(`Gasto programado ${gasto.activo ? 'pausado' : 'activado'} correctamente`);
                setTimeout(() => this.reloadGastos(), 300);
            },
            {
                header: 'Confirmar cambio de estado',
                acceptLabel: 'Sí, cambiar',
                rejectLabel: 'Cancelar'
            }
        );
    }

    deleteGasto(gasto: GastoProgramado) {
        this.confirmAction(
            `¿Estás seguro de eliminar este gasto programado?`,
            () => {
                this.gastosStore.deleteGasto(gasto.id);
                this.showSuccess('Gasto programado eliminado correctamente');
                setTimeout(() => this.reloadGastos(), 300);
            },
            {
                header: 'Confirmar eliminación',
                acceptLabel: 'Sí, eliminar',
                rejectLabel: 'Cancelar'
            }
        );
    }

    getFrecuenciaSeverity(frecuencia: string): 'success' | 'info' | 'warn' | 'danger' {
        switch (frecuencia) {
            case 'DIARIO':
                return 'danger';
            case 'SEMANAL':
                return 'warn';
            case 'MENSUAL':
                return 'info';
            case 'ANUAL':
                return 'success';
            default:
                return 'info';
        }
    }
}
