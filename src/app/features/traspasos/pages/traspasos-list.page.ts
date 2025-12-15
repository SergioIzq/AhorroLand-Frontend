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
import { TraspasosStore } from '../stores/traspasos.store';
import { Traspaso } from '@/core/models/traspaso.model';
import { BasePageComponent, BasePageTemplateComponent } from '@/shared/components';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { TraspasoFormModalComponent } from '../components/traspaso-form-modal.component';

@Component({
    selector: 'app-traspasos-list-page',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, ToastModule, TableModule, ToolbarModule, InputIconModule, IconFieldModule, SkeletonModule, TagModule, BasePageTemplateComponent, TraspasoFormModalComponent],
    providers: [MessageService, ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        /* Toolbar responsive en móvil */
        @media screen and (max-width: 768px) {
            :host ::ng-deep .p-toolbar {
                flex-direction: column !important;
                align-items: stretch !important;
            }
            
            :host ::ng-deep .p-toolbar-group-start,
            :host ::ng-deep .p-toolbar-group-end {
                width: 100% !important;
                justify-content: center !important;
            }
            
            :host ::ng-deep .p-toolbar-group-start {
                margin-bottom: 0.5rem;
            }
        }
    `],
    template: `
        <app-base-page-template [loading]="traspasosStore.loading()" [skeletonType]="'table'">
            <div class="card surface-ground px-4 py-5 md:px-6 lg:px-8">
                <div class="surface-card shadow-2 border-round p-6">

                    <p-toolbar styleClass="mb-6 gap-2 p-6">
                        <ng-template #start>
                            <p-button label="Nuevo Traspaso" icon="pi pi-plus" severity="secondary" class="mr-2" (onClick)="openNew()" />
                        </ng-template>

                        <ng-template #end>
                            <p-button icon="pi pi-refresh" severity="secondary" outlined (onClick)="refreshTable()" pTooltip="Actualizar" />
                        </ng-template>
                    </p-toolbar>

                    <p-table
                        #dt
                        [value]="traspasosStore.traspasos()"
                        [loading]="traspasosStore.loading()"
                        [lazy]="true"
                        (onLazyLoad)="onLazyLoad($event)"
                        [paginator]="true"
                        [rows]="pageSize"
                        [totalRecords]="traspasosStore.totalRecords()"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} traspasos"
                        [rowsPerPageOptions]="[10, 25, 50]"
                        [tableStyle]="{ 'min-width': '50rem' }"
                        styleClass="p-datatable-gridlines"
                        [rowHover]="true"
                        dataKey="id"
                    >
                        <ng-template #caption>
                            <div class="flex flex-col md:flex-row items-center justify-between gap-3 py-3 px-4">
                                <h5 class="m-0 font-semibold text-xl">Gestión de Traspasos</h5>
                                <p-iconfield class="w-full md:w-auto">
                                    <p-inputicon styleClass="pi pi-search" />
                                    <input pInputText type="text" [(ngModel)]="searchTerm" (input)="onSearchChange($event)" placeholder="Buscar traspasos..." class="w-full" />
                                </p-iconfield>
                            </div>
                        </ng-template>

                        <ng-template #header>
                            <tr>
                                <th pSortableColumn="fecha" style="min-width:10rem; padding: 1rem">
                                    Fecha
                                    <p-sortIcon field="fecha" />
                                </th>
                                <th pSortableColumn="importe" style="min-width:10rem">
                                    Importe
                                    <p-sortIcon field="importe" />
                                </th>
                                <th style="min-width:12rem">Cuenta Origen</th>
                                <th style="min-width:12rem">Cuenta Destino</th>
                                <th style="min-width:15rem">Descripción</th>
                                <th style="min-width:10rem">Acciones</th>
                            </tr>
                        </ng-template>

                        <ng-template #body let-traspaso>
                            <tr>
                                <td style="padding: 1rem">
                                    {{ traspaso.fecha | date: 'dd/MM/yyyy' }}
                                </td>
                                <td>
                                    <span class="font-bold text-blue-600">{{ traspaso.importe | number: '1.2-2' : 'es-ES' }} €</span>
                                </td>
                                <td>
                                    <div class="flex items-center gap-2">
                                        <i class="pi pi-arrow-circle-right text-red-500"></i>
                                        <span>{{ traspaso.cuentaOrigenNombre }}</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="flex items-center gap-2">
                                        <i class="pi pi-arrow-circle-left text-green-500"></i>
                                        <span>{{ traspaso.cuentaDestinoNombre }}</span>
                                    </div>
                                </td>
                                <td>
                                    <span [title]="traspaso.descripcion">
                                        {{ traspaso.descripcion || '-' }}
                                    </span>
                                </td>
                                <td>
                                    <div class="flex gap-2">
                                        <p-button icon="pi pi-pencil" class="mr-2" [rounded]="true" [outlined]="true" (click)="editTraspaso(traspaso)" pTooltip="Editar" />
                                        <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [outlined]="true" (click)="deleteTraspaso(traspaso)" pTooltip="Eliminar" />
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
                                <td><p-skeleton width="90%" /></td>
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
                                        <p class="text-900 font-semibold text-xl mb-2">No hay traspasos</p>
                                        <p class="text-600 mb-4">Comienza agregando tu primer traspaso entre cuentas</p>
                                        <p-button label="Crear Traspaso" icon="pi pi-plus" (onClick)="openNew()" />
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            </div>
        </app-base-page-template>

        <!-- Modal de Formulario -->
        <app-traspaso-form-modal [visible]="traspasoDialog" [traspaso]="currentTraspaso" (save)="saveTraspaso($event)" (cancel)="hideDialog()" />
    `
})
export class TraspasosListPage extends BasePageComponent {
    traspasosStore = inject(TraspasosStore);

    protected override loadingSignal = this.traspasosStore.loading;
    protected override skeletonType = 'table' as const;

    @ViewChild('dt') dt!: Table;

    private searchSubject = new Subject<string>();

    pageSize: number = 10;
    pageNumber: number = 1;
    searchTerm: string = '';
    sortColumn: string = 'fecha';
    sortOrder: string = 'desc';

    // Propiedades del modal
    traspasoDialog: boolean = false;
    currentTraspaso: Partial<Traspaso> | null = null;

    constructor() {
        super();
        this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe((searchValue) => {
            this.searchTerm = searchValue;
            this.pageNumber = 1;
            this.reloadTraspasos();
        });
    }

    onLazyLoad(event: any) {
        this.pageNumber = event.first / event.rows + 1;
        this.pageSize = event.rows;

        if (event.sortField) {
            this.sortColumn = event.sortField;
            this.sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';
        }

        this.reloadTraspasos();
    }

    onSearchChange(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.searchSubject.next(value);
    }

    private reloadTraspasos() {
        this.traspasosStore.loadTraspasosPaginated({
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
        this.reloadTraspasos();
        this.showInfo('Datos actualizados', 'Actualización');
    }

    openNew() {
        this.currentTraspaso = null;
        this.traspasoDialog = true;
    }

    editTraspaso(traspaso: Traspaso) {
        this.currentTraspaso = { ...traspaso };
        this.traspasoDialog = true;
    }

    hideDialog() {
        this.traspasoDialog = false;
        this.currentTraspaso = null;
    }

    saveTraspaso(traspaso: Partial<Traspaso>) {
        if (traspaso.id) {
            // Actualizar
            this.traspasosStore.updateTraspaso({ id: traspaso.id, traspaso });
            this.showSuccess('Traspaso actualizado correctamente');
        } else {
            // Crear - asegurar que todos los campos requeridos están presentes
            const traspasoCreate = {
                cuentaOrigenId: traspaso.cuentaOrigenId!,
                cuentaDestinoId: traspaso.cuentaDestinoId!,
                importe: traspaso.importe!,
                fecha: traspaso.fecha!,
                descripcion: traspaso.descripcion
            };
            this.traspasosStore.createTraspaso(traspasoCreate as any);
            this.showSuccess('Traspaso creado correctamente');
        }
        this.hideDialog();
    }

    deleteTraspaso(traspaso: Traspaso) {
        this.confirmAction(
            `¿Estás seguro de eliminar este traspaso de ${traspaso.importe}€?`,
            () => {
                this.traspasosStore.deleteTraspaso(traspaso.id);
                this.showSuccess('Traspaso eliminado correctamente');
            },
            {
                header: 'Confirmar eliminación',
                acceptLabel: 'Sí, eliminar',
                rejectLabel: 'Cancelar'
            }
        );
    }
}
