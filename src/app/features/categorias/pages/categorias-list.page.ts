import { Component, inject, ChangeDetectionStrategy, ViewChild, signal, effect, computed } from '@angular/core';
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
import { CategoriaStore } from '@/features/categorias/store/categoria.store';
import { Categoria } from '@/core/models/categoria.model';
import { CategoriaFormModalComponent } from '../components/categoria-form-modal.component';
import { BasePageComponent, BasePageTemplateComponent } from '@/shared/components';

@Component({
    selector: 'app-categorias-list',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, TableModule, InputTextModule, ToastModule, ConfirmDialogModule, SkeletonModule, ToolbarModule, InputIconModule, IconFieldModule, CategoriaFormModalComponent, BasePageTemplateComponent],
    providers: [MessageService, ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-base-page-template [loading]="categoriaStore.loading()" [skeletonType]="'table'">
            <div class="card surface-ground px-4 py-5 md:px-6 lg:px-8">
                <div class="surface-card shadow-2 border-round p-6">
                    <p-toast></p-toast>

                    <p-toolbar styleClass="mb-6 gap-2 p-6">
                        <ng-template #start>
                            <p-button label="Nueva Categoría" icon="pi pi-plus" severity="secondary" class="mr-2" (onClick)="openNew()" />
                        </ng-template>

                        <ng-template #end>
                            <p-button icon="pi pi-refresh" severity="secondary" outlined (onClick)="refreshTable()" pTooltip="Actualizar" />
                        </ng-template>
                    </p-toolbar>

                    <p-table
                        #dt
                        [value]="categoriaStore.categorias()"
                        [loading]="categoriaStore.loading()"
                        [lazy]="true"
                        (onLazyLoad)="onLazyLoad($event)"
                        [paginator]="true"
                        [rows]="pageSize()"
                        [totalRecords]="categoriaStore.totalRecords()"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} categorías"
                        [rowsPerPageOptions]="[10, 25, 50]"
                        [tableStyle]="{ 'min-width': '50rem' }"
                        styleClass="p-datatable-gridlines"
                        [rowHover]="true"
                        dataKey="id"
                    >
                        <ng-template #caption>
                            <div class="flex items-center justify-between py-3 px-4">
                                <h5 class="m-0 font-semibold text-xl">Gestión de Categorías</h5>
                                <p-iconfield>
                                    <p-inputicon styleClass="pi pi-search" />
                                    <input pInputText type="text" [ngModel]="searchTerm()" (input)="onSearchChange($event)" placeholder="Buscar categorías..." />
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

                        <ng-template #body let-categoria>
                            <tr>
                                <td style="padding: 1rem">
                                    <div class="flex items-center gap-2">
                                        <i class="pi pi-tag text-primary"></i>
                                        <span class="font-semibold">{{ categoria.nombre }}</span>
                                    </div>
                                </td>
                                <td>
                                    <p-button icon="pi pi-pencil" class="mr-2" [rounded]="true" [outlined]="true" (click)="editCategoria(categoria)" />
                                    <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [outlined]="true" (click)="deleteCategoria(categoria)" />
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
                                        <p class="text-900 font-semibold text-xl mb-2">No hay categorías</p>
                                        <p class="text-600 mb-4">Comienza agregando tu primera categoría</p>
                                        <p-button label="Crear Categoría" icon="pi pi-plus" (onClick)="openNew()" />
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>

                    <app-categoria-form-modal [visible]="categoriaDialog()" [categoria]="currentCategoria()" (visibleChange)="categoriaDialog.set($event)" (save)="onSaveCategoria($event)" (cancel)="hideDialog()" />
                </div>
            </div>
        </app-base-page-template>
    `
})
export class CategoriasListPage extends BasePageComponent {
    categoriaStore = inject(CategoriaStore);

    protected override loadingSignal = this.categoriaStore.loading;
    protected override skeletonType = 'table' as const;

    @ViewChild('dt') dt!: Table;

    categoriaDialog = signal(false);
    currentCategoria = signal<Partial<Categoria>>({});
    private searchSubject = new Subject<string>();

    // Signals para paginación y filtros
    pageSize = signal(10);
    pageNumber = signal(1);
    searchTerm = signal('');
    sortColumn = signal('nombre');
    sortOrder = signal('asc');

    // Computed signal para saber si hay cambios pendientes
    hasChanges = computed(() => {
        const lastUpdate = this.categoriaStore.lastUpdated();
        return lastUpdate !== null;
    });

    constructor() {
        super();

        // Configurar búsqueda con debounce
        this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe((searchValue) => {
            this.searchTerm.set(searchValue);
            this.pageNumber.set(1);
            this.reloadCategorias();
        });

        // Effect para sincronización automática cuando cambian los datos
        effect(() => {
            const lastUpdated = this.categoriaStore.lastUpdated();
            if (lastUpdated) {
                // Los datos se han actualizado, la UI ya se sincronizó automáticamente
                console.log('[CATEGORIAS] Datos sincronizados:', new Date(lastUpdated));
            }
        });
    }

    onLazyLoad(event: any) {
        this.pageNumber.set(event.first / event.rows + 1);
        this.pageSize.set(event.rows);

        if (event.sortField) {
            this.sortColumn.set(event.sortField);
            this.sortOrder.set(event.sortOrder === 1 ? 'asc' : 'desc');
        }

        this.reloadCategorias();
    }

    onSearchChange(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.searchSubject.next(value);
    }

    private reloadCategorias() {
        this.categoriaStore.loadCategoriasPaginated({
            page: this.pageNumber(),
            pageSize: this.pageSize(),
            searchTerm: this.searchTerm() || undefined,
            sortColumn: this.sortColumn() || undefined,
            sortOrder: this.sortOrder() || undefined
        });
    }

    loadCategorias() {
        this.reloadCategorias();
    }

    refreshTable() {
        this.pageNumber.set(1);
        this.searchTerm.set('');
        this.reloadCategorias();
        this.showInfo('Datos actualizados', 'Actualización');
    }

    openNew() {
        this.currentCategoria.set({});
        this.categoriaDialog.set(true);
    }

    hideDialog() {
        this.categoriaDialog.set(false);
        this.currentCategoria.set({});
    }

    async onSaveCategoria(categoria: Partial<Categoria>) {
        const categoriaData = this.currentCategoria();

        if (categoriaData.id) {
            try {
                await this.categoriaStore.update(categoriaData.id, { nombre: categoria.nombre! });
                this.showSuccess('Categoría actualizada correctamente');
                // No es necesario reloadCategorias() - actualización optimista ya lo hizo
                this.hideDialog();
            } catch (error: any) {
                this.showError(error.message || 'Error al actualizar la categoría');
            }
        } else {
            try {
                await this.categoriaStore.create(categoria.nombre!);
                this.showSuccess('Categoría creada correctamente');
                // No es necesario reloadCategorias() - actualización optimista ya lo hizo
                this.hideDialog();
            } catch (error: any) {
                this.showError(error.message || 'Error al crear la categoría');
            }
        }
    }

    editCategoria(categoria: Categoria) {
        this.currentCategoria.set({ ...categoria });
        this.categoriaDialog.set(true);
    }

    deleteCategoria(categoria: Categoria) {
        this.confirmAction(
            `¿Estás seguro de eliminar la categoría "${categoria.nombre}"?`,
            () => {
                this.categoriaStore.deleteCategoria(categoria.id);
            },
            {
                header: 'Confirmar eliminación',
                acceptLabel: 'Sí, eliminar',
                rejectLabel: 'Cancelar',
                successMessage: 'Categoría eliminada correctamente'
            }
        );
    }
}
