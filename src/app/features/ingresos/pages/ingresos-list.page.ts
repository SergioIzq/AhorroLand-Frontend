import { Component, inject, ChangeDetectionStrategy, signal, computed, effect, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { Table, TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';
import { TagModule } from 'primeng/tag';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { SkeletonModule } from 'primeng/skeleton';
import { IngresosStore } from '../stores/ingresos.store';
import { Ingreso, IngresoCreate } from '@/core/models';
import { IngresoFormModalComponent } from '../components/ingreso-form-modal.component';
import { BasePageComponent, BasePageTemplateComponent } from '@/shared/components';

@Component({
    selector: 'app-ingresos-list-page',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, ToastModule, TableModule, ToolbarModule, TagModule, InputIconModule, IconFieldModule, SkeletonModule, IngresoFormModalComponent, BasePageTemplateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-base-page-template [loading]="ingresosStore.loading() && ingresosStore.ingresos().length === 0" [skeletonType]="'table'">
            <div class="card surface-ground px-4 py-5 md:px-6 lg:px-8">
                <div class="surface-card shadow-2 border-round p-6">
                    <p-toast></p-toast>

                    <p-toolbar styleClass="mb-6 gap-2 p-6">
                        <ng-template #start>
                            <p-button label="Nuevo Ingreso" icon="pi pi-plus" severity="secondary" class="mr-2" (onClick)="openNew()" />
                            <p-button severity="secondary" label="Eliminar" icon="pi pi-trash" outlined (onClick)="deleteSelectedIngresos()" [disabled]="!selectedIngresos() || !selectedIngresos().length" />
                        </ng-template>

                        <ng-template #end>
                            <p-button icon="pi pi-refresh" severity="secondary" outlined (onClick)="refreshTable()" pTooltip="Actualizar" class="mr-2" />
                            <p-button label="Exportar" icon="pi pi-upload" severity="secondary" (onClick)="exportCSV()" />
                        </ng-template>
                    </p-toolbar>

                    <p-table
                        #dt
                        [value]="ingresosStore.ingresos()"
                        [lazy]="true"
                        (onLazyLoad)="loadIngresosLazy($event)"
                        [rows]="pageSize()"
                        [totalRecords]="totalRecords()"
                        [paginator]="true"
                        [loading]="ingresosStore.loading()"
                        [loadingIcon]="'none'"
                        [globalFilterFields]="['conceptoNombre', 'categoriaNombre', 'proveedorNombre', 'descripcion']"
                        [tableStyle]="{ 'min-width': '75rem' }"
                        styleClass="p-datatable-gridlines p-datatable-loading-icon-none"
                        [selection]="selectedIngresos()"
                        (selectionChange)="selectedIngresos.set($event)"
                        [rowHover]="true"
                        dataKey="id"
                        currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} ingresos"
                        [showCurrentPageReport]="true"
                        [rowsPerPageOptions]="[10, 20, 30]"
                        sortField="fecha"
                        [sortOrder]="-1"
                    >
                        <ng-template #caption>
                            <div class="flex items-center justify-between py-3 px-4">
                                <h5 class="m-0 font-semibold text-xl">Gestión de Ingresos</h5>
                                <p-iconfield>
                                    <p-inputicon styleClass="pi pi-search" />
                                    <input pInputText type="text" (input)="onGlobalFilter(dt, $event)" placeholder="Buscar..." />
                                </p-iconfield>
                            </div>
                        </ng-template>

                        <ng-template #header>
                            <tr>
                                <th style="width: 3rem; padding: 1rem">
                                    <p-tableHeaderCheckbox />
                                </th>
                                <th pSortableColumn="conceptoNombre" style="min-width:16rem; padding: 1rem">
                                    Concepto
                                    <p-sortIcon field="conceptoNombre" />
                                </th>
                                <th pSortableColumn="categoriaNombre" style="min-width:12rem">
                                    Categoría
                                    <p-sortIcon field="categoriaNombre" />
                                </th>
                                <th pSortableColumn="proveedorNombre" style="min-width:12rem">
                                    Proveedor
                                    <p-sortIcon field="proveedorNombre" />
                                </th>
                                <th pSortableColumn="fecha" style="min-width:10rem">
                                    Fecha
                                    <p-sortIcon field="fecha" />
                                </th>
                                <th pSortableColumn="importe" style="min-width:10rem">
                                    Importe
                                    <p-sortIcon field="importe" />
                                </th>
                                <th style="min-width:10rem">Acciones</th>
                            </tr>
                        </ng-template>

                        <ng-template #body let-ingreso>
                            <tr>
                                <td style="padding: 1rem">
                                    <p-tableCheckbox [value]="ingreso" />
                                </td>
                                <td style="padding: 1rem">
                                    <div class="flex flex-col">
                                        <span class="font-semibold">{{ ingreso.conceptoNombre }}</span>
                                        @if (ingreso.descripcion) {
                                            <small class="text-500">{{ ingreso.descripcion }}</small>
                                        }
                                    </div>
                                </td>
                                <td style="padding: 1rem">
                                    <p-tag [value]="ingreso.categoriaNombre || 'Sin categoría'" [severity]="getCategorySeverity(ingreso.categoriaNombre)" />
                                </td>
                                <td>{{ ingreso.proveedorNombre || '-' }}</td>
                                <td>{{ ingreso.fecha | date: 'dd/MM/yyyy' }}</td>
                                <td>
                                    <span class="font-bold text-green-500">{{ ingreso.importe | number: '1.2-2' }} €</span>
                                </td>
                                <td>
                                    <p-button icon="pi pi-pencil" class="mr-2" [rounded]="true" [outlined]="true" (click)="editIngreso(ingreso)" />
                                    <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [outlined]="true" (click)="deleteIngreso(ingreso)" />
                                </td>
                            </tr>
                        </ng-template>

                        <ng-template #loadingbody>
                            <tr>
                                <td style="padding: 1rem"><p-skeleton /></td>
                                <td style="padding: 1rem">
                                    <div class="flex flex-col gap-2">
                                        <p-skeleton width="80%" />
                                        <p-skeleton width="60%" height=".8rem" />
                                    </div>
                                </td>
                                <td style="padding: 1rem"><p-skeleton width="6rem" height="2rem" /></td>
                                <td><p-skeleton width="70%" /></td>
                                <td><p-skeleton width="6rem" /></td>
                                <td><p-skeleton width="5rem" /></td>
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
                                        <p class="text-900 font-semibold text-xl mb-2">No hay ingresos</p>
                                        <p class="text-600 mb-4">Comienza agregando tu primer ingreso</p>
                                        <p-button label="Crear Ingreso" icon="pi pi-plus" (onClick)="openNew()" />
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>

                    <!-- Nuevo componente de formulario modal con autocomplete -->
                    <app-ingreso-form-modal [visible]="ingresoDialog()" [ingreso]="currentIngreso()" (visibleChange)="ingresoDialog.set($event)" (save)="onSaveIngreso($event)" (cancel)="hideDialog()" />
                </div>
            </div>
        </app-base-page-template>
    `
})
export class IngresosListPage extends BasePageComponent implements OnDestroy {
    ingresosStore = inject(IngresosStore);

    protected override loadingSignal = this.ingresosStore.loading;
    protected override skeletonType = 'table' as const;

    @ViewChild('dt') dt!: Table;

    ingresoDialog = signal<boolean>(false);
    selectedIngresos = signal<Ingreso[]>([]);
    currentIngreso = signal<Partial<Ingreso>>({});

    pageSize = signal<number>(10);
    pageNumber = signal<number>(1);
    searchTerm = signal<string>('');
    sortColumn = signal<string>('fecha');
    sortOrder = signal<string>('desc');

    // Computed signal para totalRecords
    totalRecords = computed(() => this.ingresosStore.totalRecords());

    // Subject para manejar búsqueda con debounce
    private searchSubject = new Subject<string>();

    constructor() {
        super();
        // Configurar búsqueda con debounce de 500ms
        this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe((searchValue) => {
            this.searchTerm.set(searchValue);
            this.pageNumber.set(1); // Resetear a primera página en búsqueda
            this.reloadIngresos();
        });

        // Effect para detectar sincronización automática
        effect(() => {
            const lastUpdate = this.ingresosStore.lastUpdated();
            if (lastUpdate) {
                console.log('✅ Ingresos sincronizados automáticamente en', new Date(lastUpdate).toISOString());
            }
        });
    }

    ngOnDestroy() {
        this.searchSubject.complete();
    }

    /**
     * Recargar ingresos con los filtros actuales
     */
    private reloadIngresos() {
        this.ingresosStore.loadIngresosPaginated({
            page: this.pageNumber(),
            pageSize: this.pageSize(),
            searchTerm: this.searchTerm() || undefined,
            sortColumn: this.sortColumn() || undefined,
            sortOrder: this.sortOrder() || undefined
        });
    }

    /**
     * Refrescar la tabla manualmente
     */
    refreshTable() {
        this.reloadIngresos();
        this.showInfo('Datos actualizados', 'Actualización');
    }

    loadIngresosLazy(event: any) {
        // Calcular página actual (PrimeNG usa first que es el índice del primer registro)
        this.pageNumber.set(Math.floor(event.first / event.rows) + 1);
        this.pageSize.set(event.rows);

        // Capturar ordenamiento si existe
        if (event.sortField) {
            this.sortColumn.set(event.sortField);
            // event.sortOrder: 1 = ASC, -1 = DESC
            this.sortOrder.set(event.sortOrder === 1 ? 'asc' : 'desc');
        }

        // Cargar ingresos
        this.reloadIngresos();
    }

    onGlobalFilter(table: Table, event: Event) {
        const searchValue = (event.target as HTMLInputElement).value;

        // Usar Subject para aplicar debounce (esperar 500ms después de dejar de escribir)
        this.searchSubject.next(searchValue);
    }

    openNew() {
        this.currentIngreso.set({});
        this.ingresoDialog.set(true);
    }

    hideDialog() {
        this.ingresoDialog.set(false);
        this.currentIngreso.set({});
    }

    async onSaveIngreso(ingreso: Partial<Ingreso>) {
        if (ingreso.id) {
            // Actualizar ingreso existente
            try {
                await this.ingresosStore.updateIngreso({ id: ingreso.id, ingreso });
                this.showSuccess('Ingreso actualizado correctamente');
                this.ingresoDialog.set(false);
                this.currentIngreso.set({});
                // No reloadIngresos() - optimistic update already syncs UI
            } catch (error: any) {
                this.showError(error.userMessage || 'Error al actualizar el ingreso');
            }
        } else {
            var ingresoCreate: IngresoCreate = {
                conceptoId: ingreso.conceptoId!,
                categoriaId: ingreso.categoriaId!,
                clienteId: ingreso.clienteId!,
                fecha: ingreso.fecha!,
                importe: ingreso.importe!,
                descripcion: ingreso.descripcion,
                formaPagoId: ingreso.formaPagoId!,
                personaId: ingreso.personaId!,
                cuentaId: ingreso.cuentaId!
            };

            this.ingresosStore.createIngreso(ingresoCreate).then(() => {
                this.showSuccess('Ingreso creado correctamente');
                // No reloadIngresos() - optimistic update already syncs UI
            });
            this.ingresoDialog.set(false);
            this.currentIngreso.set({});
        }
    }

    editIngreso(ingreso: Ingreso) {
        this.currentIngreso.set({ ...ingreso });
        this.ingresoDialog.set(true);
    }

    deleteIngreso(ingreso: Ingreso) {
        this.confirmAction(
            `¿Estás seguro de eliminar el gasto "${ingreso.conceptoNombre}"?`,
            () => {
                this.ingresosStore.deleteIngreso(ingreso.id);
            },
            {
                header: 'Confirmar eliminación',
                acceptLabel: 'Sí, eliminar',
                rejectLabel: 'Cancelar',
                successMessage: 'Ingreso eliminado correctamente'
            }
        );
    }

    deleteSelectedIngresos() {
        this.confirmAction(
            '¿Estás seguro de eliminar los ingresos seleccionados?',
            async () => {
                try {
                    const deletePromises = this.selectedIngresos().map((ingreso) => this.ingresosStore.deleteIngreso(ingreso.id));

                    await Promise.all(deletePromises);
                    this.showSuccess('Ingresos eliminados correctamente');
                    this.selectedIngresos.set([]);
                    // No reloadIngresos() - optimistic updates already sync UI
                } catch (error: any) {
                    this.showError(error.userMessage || 'Error al eliminar algunos ingresos');
                }
            },
            {
                header: 'Confirmar',
                acceptLabel: 'Sí, eliminar',
                rejectLabel: 'Cancelar'
            }
        );
    }

    exportCSV() {
        // En lazy mode, exportar los datos actuales del store
        const ingresos = this.ingresosStore.ingresos();
        if (!ingresos || ingresos.length === 0) {
            this.showWarning('No hay datos para exportar');
            return;
        }

        // Crear CSV manualmente con BOM para UTF-8
        const headers = ['Concepto', 'Categoría', 'Proveedor', 'Fecha', 'Importe', 'Descripción'];
        const csvData = ingresos.map((g) => [g.conceptoNombre, g.categoriaNombre || '', g.clienteNombre || '', g.fecha, g.importe, g.descripcion || '']);

        // Agregar BOM (Byte Order Mark) para UTF-8
        let csv = '\uFEFF';
        csv += headers.join(',') + '\n';
        csvData.forEach((row) => {
            csv += row.map((field) => `"${field}"`).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `ingresos_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    getCategorySeverity(categoria: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined {
        if (!categoria) return 'secondary';

        // Generar un hash simple del nombre de categoría para asignar color consistente
        const severities: Array<'success' | 'info' | 'warn' | 'contrast' | 'secondary'> = ['success', 'info', 'warn', 'contrast', 'secondary'];

        let hash = 0;
        for (let i = 0; i < categoria.length; i++) {
            hash = categoria.charCodeAt(i) + ((hash << 5) - hash);
        }

        const index = Math.abs(hash) % severities.length;
        return severities[index];
    }

    selectIngreso(ingreso: Ingreso) {
        this.ingresosStore.selectIngreso(ingreso);
    }
}
