import { Component, inject, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule, Table } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { ToolbarModule } from 'primeng/toolbar';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ConceptoStore } from '../store/concepto.store';
import { CategoriaStore } from '@/features/categorias/store/categoria.store';
import { Concepto } from '@/core/models/concepto.model';
import { ConceptoCreateModalComponent } from '../components/concepto-create-modal.component';
import { BasePageComponent, BasePageTemplateComponent } from '@/shared/components';

@Component({
    selector: 'app-conceptos-list',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, TableModule, InputTextModule, ToastModule, ConfirmDialogModule, SkeletonModule, ToolbarModule, InputIconModule, IconFieldModule, ConceptoCreateModalComponent, BasePageTemplateComponent],
    providers: [MessageService, ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-base-page-template [loading]="conceptoStore.loading()" [skeletonType]="'table'">
            <div class="card surface-ground px-4 py-5 md:px-6 lg:px-8">
                <div class="surface-card shadow-2 border-round p-6">
                    <p-toast></p-toast>

                    <p-toolbar styleClass="mb-6 gap-2 p-6">
                        <ng-template #start>
                            <p-button label="Nuevo Concepto" icon="pi pi-plus" severity="secondary" class="mr-2" (onClick)="openNew()" />
                        </ng-template>

                        <ng-template #end>
                            <p-button icon="pi pi-refresh" severity="secondary" outlined (onClick)="refreshTable()" pTooltip="Actualizar" />
                        </ng-template>
                    </p-toolbar>

                    <p-table
                        #dt
                        [value]="conceptoStore.conceptos()"
                        [loading]="conceptoStore.loading()"
                        [lazy]="true"
                        (onLazyLoad)="onLazyLoad($event)"
                        [paginator]="true"
                        [rows]="pageSize"
                        [totalRecords]="conceptoStore.totalRecords()"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} conceptos"
                        [rowsPerPageOptions]="[10, 25, 50]"
                        [tableStyle]="{ 'min-width': '50rem' }"
                        styleClass="p-datatable-gridlines"
                        [rowHover]="true"
                        dataKey="id"
                    >
                        <ng-template #caption>
                            <div class="flex items-center justify-between py-3 px-4">
                                <h5 class="m-0 font-semibold text-xl">Gestión de Conceptos</h5>
                                <p-iconfield>
                                    <p-inputicon styleClass="pi pi-search" />
                                    <input pInputText type="text" [(ngModel)]="searchTerm" (input)="onSearchChange($event)" placeholder="Buscar conceptos..." />
                                </p-iconfield>
                            </div>
                        </ng-template>

                        <ng-template #header>
                            <tr>
                                <th pSortableColumn="nombre" style="min-width:15rem; padding: 1rem">
                                    Nombre
                                    <p-sortIcon field="nombre" />
                                </th>
                                <th pSortableColumn="categoriaId" style="min-width:12rem">
                                    Categoría
                                    <p-sortIcon field="categoriaId" />
                                </th>
                                <th style="min-width:10rem">Acciones</th>
                            </tr>
                        </ng-template>

                        <ng-template #body let-concepto>
                            <tr>
                                <td style="padding: 1rem">
                                    <div class="flex items-center gap-2">
                                        <i class="pi pi-bookmark text-primary"></i>
                                        <span class="font-semibold">{{ concepto.nombre }}</span>
                                    </div>
                                </td>
                                <td>
                                    <span class="text-gray-600">{{ getCategoriaName(concepto.categoriaId) }}</span>
                                </td>
                                <td>
                                    <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [outlined]="true" (click)="deleteConcepto(concepto)" />
                                </td>
                            </tr>
                        </ng-template>

                        <ng-template #loadingbody>
                            <tr>
                                <td style="padding: 1rem"><p-skeleton width="80%" /></td>
                                <td><p-skeleton width="70%" /></td>
                                <td>
                                    <div class="flex gap-2">
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
                                        <p class="text-900 font-semibold text-xl mb-2">No hay conceptos</p>
                                        <p class="text-600 mb-4">Comienza agregando tu primer concepto</p>
                                        <p-button label="Crear Concepto" icon="pi pi-plus" (onClick)="openNew()" />
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>

                    <app-concepto-create-modal [visible]="conceptoDialog" (visibleChange)="conceptoDialog = $event" (created)="onConceptoCreated($event)" (cancel)="hideDialog()" />
                </div>
            </div>
        </app-base-page-template>
    `
})
export class ConceptosListPage extends BasePageComponent {
    conceptoStore = inject(ConceptoStore);
    categoriaStore = inject(CategoriaStore);

    protected override loadingSignal = this.conceptoStore.loading;
    protected override skeletonType = 'table' as const;

    @ViewChild('dt') dt!: Table;

    conceptoDialog: boolean = false;
    private searchSubject = new Subject<string>();
    private categoriasMap = new Map<string, string>();

    pageSize: number = 10;
    pageNumber: number = 1;
    searchTerm: string = '';
    sortColumn: string = 'nombre';
    sortOrder: string = 'asc';

    constructor() {
        super();
        this.loadCategorias();
        this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe((searchValue) => {
            this.searchTerm = searchValue;
            this.pageNumber = 1;
            this.reloadConceptos();
        });
    }

    private async loadCategorias() {
        try {
            const categorias = await this.categoriaStore.getRecent(100);
            categorias.forEach((cat) => this.categoriasMap.set(cat.id, cat.nombre));
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    getCategoriaName(categoriaId: string): string {
        return this.categoriasMap.get(categoriaId) || 'Sin categoría';
    }

    onLazyLoad(event: any) {
        this.pageNumber = event.first / event.rows + 1;
        this.pageSize = event.rows;

        if (event.sortField) {
            this.sortColumn = event.sortField;
            this.sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';
        }

        this.reloadConceptos();
    }

    onSearchChange(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.searchSubject.next(value);
    }

    private reloadConceptos() {
        this.conceptoStore.loadConceptosPaginated({
            page: this.pageNumber,
            pageSize: this.pageSize,
            searchTerm: this.searchTerm || undefined,
            sortColumn: this.sortColumn || undefined,
            sortOrder: this.sortOrder || undefined
        });
    }

    loadConceptos() {
        this.reloadConceptos();
    }

    refreshTable() {
        this.pageNumber = 1;
        this.searchTerm = '';
        this.reloadConceptos();
        this.showInfo('Datos actualizados', 'Actualización');
    }

    openNew() {
        this.conceptoDialog = true;
    }

    hideDialog() {
        this.conceptoDialog = false;
    }

    onConceptoCreated(concepto: Concepto) {
        this.showSuccess('Concepto creado correctamente');
        this.reloadConceptos();
        this.hideDialog();
    }

    deleteConcepto(concepto: Concepto) {
        this.confirmAction(
            `¿Estás seguro de eliminar el concepto "${concepto.nombre}"?`,
            () => {
                this.conceptoStore.deleteConcepto(concepto.id);
            },
            {
                header: 'Confirmar eliminación',
                acceptLabel: 'Sí, eliminar',
                rejectLabel: 'Cancelar',
                successMessage: 'Concepto eliminado correctamente'
            }
        );
    }
}
