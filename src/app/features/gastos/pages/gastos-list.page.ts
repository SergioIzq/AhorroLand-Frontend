import { Component, inject, ChangeDetectionStrategy, signal, ViewChild, OnDestroy, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Table, TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';
import { TagModule } from 'primeng/tag';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { SkeletonModule } from 'primeng/skeleton';
import { GastosStore } from '../stores/gastos.store';
import { Gasto, GastoCreate } from '@/core/models';
import { GastoFormModalComponent } from '../components/gasto-form-modal.component';
import { BasePageComponent, BasePageTemplateComponent } from '@/shared/components';

@Component({
    selector: 'app-gastos-list-page',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, TableModule, ToolbarModule, TagModule, InputIconModule, IconFieldModule, SkeletonModule, GastoFormModalComponent, BasePageTemplateComponent],
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
        <app-base-page-template [loading]="gastosStore.loading() && gastosStore.gastos().length === 0" [skeletonType]="'table'">
            <div class="card surface-ground px-4 py-5 md:px-6 lg:px-8">
                <div class="surface-card shadow-2 border-round p-6">
                    <p-toolbar class="mb-6 gap-2 p-6">
                        <ng-template #start>
                            <p-button label="Nuevo Gasto" icon="pi pi-plus" severity="secondary" class="mr-2" (onClick)="openNew()" />
                        </ng-template>

                        <ng-template #end>
                            <p-button icon="pi pi-refresh" severity="secondary" outlined (onClick)="refreshTable()" pTooltip="Actualizar" class="mr-2" />
                            <p-button label="Exportar" icon="pi pi-upload" severity="secondary" (onClick)="exportCSV()" />
                        </ng-template>
                    </p-toolbar>

                    <p-table
                        #dt
                        [value]="gastosStore.gastos()"
                        [lazy]="true"
                        (onLazyLoad)="loadGastosLazy($event)"
                        [rows]="pageSize()"
                        [totalRecords]="totalRecords()"
                        [paginator]="true"
                        [loading]="gastosStore.loading()"
                        [loadingIcon]="'none'"
                        [globalFilterFields]="['conceptoNombre', 'categoriaNombre', 'proveedorNombre', 'descripcion']"
                        [tableStyle]="{ 'min-width': '75rem' }"
                        styleClass="p-datatable-gridlines p-datatable-loading-icon-none"
                        [(selection)]="selectedGastos"
                        [rowHover]="true"
                        dataKey="id"
                        currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} gastos"
                        [showCurrentPageReport]="true"
                        [rowsPerPageOptions]="[10, 20, 30]"
                        sortField="fecha"
                        [sortOrder]="-1"
                    >
                        <ng-template #caption>
                            <div class="flex flex-col md:flex-row items-center justify-between gap-3 py-3 px-4">
                                <h5 class="m-0 font-semibold text-xl">Gestión de Gastos</h5>
                                <p-iconfield class="w-full md:w-auto">
                                    <p-inputicon styleClass="pi pi-search" />
                                    <input pInputText type="text" (input)="onGlobalFilter(dt, $event)" placeholder="Buscar..." class="w-full" />
                                </p-iconfield>
                            </div>
                        </ng-template>

                        <ng-template #header>
                            <tr>
                                <th pSortableColumn="fecha" style="min-width:10rem; padding: 1rem">
                                    Fecha
                                    <p-sortIcon field="fecha" />
                                </th>
                                <th pSortableColumn="personaNombre" style="min-width:12rem">
                                    Persona
                                    <p-sortIcon field="personaNombre" />
                                </th>
                                <th pSortableColumn="formaPagoNombre" style="min-width:12rem">
                                    Forma de Pago
                                    <p-sortIcon field="formaPagoNombre" />
                                </th>
                                <th pSortableColumn="proveedorNombre" style="min-width:12rem">
                                    Proveedor
                                    <p-sortIcon field="proveedorNombre" />
                                </th>
                                <th pSortableColumn="conceptoNombre" style="min-width:14rem">
                                    Concepto
                                    <p-sortIcon field="conceptoNombre" />
                                </th>
                                <th pSortableColumn="cuentaNombre" style="min-width:12rem">
                                    Cuenta
                                    <p-sortIcon field="cuentaNombre" />
                                </th>
                                <th pSortableColumn="importe" style="min-width:10rem">
                                    Importe
                                    <p-sortIcon field="importe" />
                                </th>
                                <th style="min-width:10rem">Acciones</th>
                            </tr>
                        </ng-template>

                        <ng-template #body let-gasto>
                            <tr>
                                <td style="padding: 1rem">{{ gasto.fecha | date: 'dd/MM/yyyy' }}</td>
                                <td>{{ gasto.personaNombre || '-' }}</td>
                                <td>{{ gasto.formaPagoNombre || '-' }}</td>
                                <td>{{ gasto.proveedorNombre || '-' }}</td>
                                <td style="padding: 1rem">
                                    <div class="flex flex-col">
                                        <span class="font-semibold">{{ gasto.conceptoNombre }}</span>
                                        @if (gasto.descripcion) {
                                            <small class="text-500">{{ gasto.descripcion }}</small>
                                        }
                                    </div>
                                </td>
                                <td>{{ gasto.cuentaNombre || '-' }}</td>
                                <td>
                                    <span class="font-bold text-red-500">{{ gasto.importe | number: '1.2-2' : 'es-ES' }} €</span>
                                </td>
                                <td>
                                    <p-button icon="pi pi-pencil" class="mr-2" [rounded]="true" [outlined]="true" (click)="editGasto(gasto)" />
                                    <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [outlined]="true" (click)="deleteGasto(gasto)" />
                                </td>
                            </tr>
                        </ng-template>

                        <ng-template #loadingbody>
                            <tr>
                                <td style="padding: 1rem"><p-skeleton /></td>
                                <td style="padding: 1rem"><p-skeleton width="6rem" /></td>
                                <td><p-skeleton width="70%" /></td>
                                <td><p-skeleton width="70%" /></td>
                                <td><p-skeleton width="70%" /></td>
                                <td style="padding: 1rem">
                                    <div class="flex flex-col gap-2">
                                        <p-skeleton width="80%" />
                                        <p-skeleton width="60%" height=".8rem" />
                                    </div>
                                </td>
                                <td><p-skeleton width="70%" /></td>
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
                                <td colspan="10" style="padding: 2rem">
                                    <div class="text-center py-8">
                                        <i class="pi pi-inbox text-500 text-5xl mb-3"></i>
                                        <p class="text-900 font-semibold text-xl mb-2">No hay gastos</p>
                                        <p class="text-600 mb-4">Comienza agregando tu primer gasto</p>
                                        <p-button label="Crear Gasto" icon="pi pi-plus" (onClick)="openNew()" />
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>

                    <!-- Nuevo componente de formulario modal con autocomplete -->
                    <app-gasto-form-modal [visible]="gastoDialog()" [gasto]="currentGasto()" (visibleChange)="gastoDialog.set($event)" (save)="onSaveGasto($event)" (cancel)="hideDialog()" />
                </div>
            </div>
        </app-base-page-template>
    `
})
export class GastosListPage extends BasePageComponent implements OnDestroy {
    gastosStore = inject(GastosStore);

    protected override loadingSignal = this.gastosStore.loading;
    protected override skeletonType = 'table' as const;

    @ViewChild('dt') dt!: Table;

    gastoDialog = signal(false);
    selectedGastos = signal<Gasto[]>([]);
    currentGasto = signal<Partial<Gasto>>({});

    // Signals para paginación y filtros
    pageSize = signal(10);
    pageNumber = signal(1);
    searchTerm = signal('');
    sortColumn = signal('fecha');
    sortOrder = signal('desc');

    // Computed signal para total records
    totalRecords = computed(() => this.gastosStore.totalRecords());

    // Subject para manejar búsqueda con debounce
    private searchSubject = new Subject<string>();

    constructor() {
        super();

        // Configurar búsqueda con debounce de 500ms
        this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe((searchValue) => {
            this.searchTerm.set(searchValue);
            this.pageNumber.set(1);
            this.reloadGastos();
        });

        // Effect para sincronización automática cuando cambian los datos
        effect(() => {
            const lastUpdated = this.gastosStore.lastUpdated();
            if (lastUpdated) {
            }
        });
    }

    ngOnDestroy() {
        this.searchSubject.complete();
    }

    /**
     * Recargar gastos con los filtros actuales
     * @param bypassCache Si es true, añade un timestamp para evitar la caché del navegador
     */
    private reloadGastos(bypassCache: boolean = false) {
        const params: any = {
            page: this.pageNumber(),
            pageSize: this.pageSize(),
            searchTerm: this.searchTerm() || undefined,
            sortColumn: this.sortColumn() || undefined,
            sortOrder: this.sortOrder() || undefined
        };

        if (bypassCache) {
            params['timestamp'] = Date.now();
        }

        this.gastosStore.loadGastosPaginated(params);
    }

    /**
     * Refrescar la tabla manualmente
     */
    refreshTable() {
        this.reloadGastos(true);
        this.showInfo('Datos actualizados', 'Actualización');
    }

    loadGastosLazy(event: any) {
        this.pageNumber.set(Math.floor(event.first / event.rows) + 1);
        this.pageSize.set(event.rows);

        if (event.sortField) {
            this.sortColumn.set(event.sortField);
            this.sortOrder.set(event.sortOrder === 1 ? 'asc' : 'desc');
        }

        this.reloadGastos();
    }

    onGlobalFilter(table: Table, event: Event) {
        const searchValue = (event.target as HTMLInputElement).value;
        this.searchSubject.next(searchValue);
    }

    openNew() {
        this.currentGasto.set({});
        this.gastoDialog.set(true);
    }

    hideDialog() {
        this.gastoDialog.set(false);
        this.currentGasto.set({});
    }

    async onSaveGasto(gasto: Partial<Gasto>) {
        if (gasto.id) {
            // Actualizar gasto existente
            try {
                await this.gastosStore.updateGasto({ id: gasto.id, gasto });
                this.showSuccess('Gasto actualizado correctamente');
                this.gastoDialog.set(false);
                this.currentGasto.set({});
                // No reloadGastos() - optimistic update already syncs UI
            } catch (error: any) {
                this.showError(error.userMessage || 'Error al actualizar el gasto');
            }
        } else {
            var gastoCreate: GastoCreate = {
                conceptoId: gasto.conceptoId!,
                categoriaId: gasto.categoriaId!,
                proveedorId: gasto.proveedorId!,
                fecha: gasto.fecha!,
                importe: gasto.importe!,
                descripcion: gasto.descripcion,
                formaPagoId: gasto.formaPagoId!,
                personaId: gasto.personaId!,
                cuentaId: gasto.cuentaId!
            };

            const displayData: Partial<Gasto> = {
                conceptoNombre: gasto.conceptoNombre,
                categoriaNombre: gasto.categoriaNombre,
                cuentaNombre: gasto.cuentaNombre,
                formaPagoNombre: gasto.formaPagoNombre,
                proveedorNombre: gasto.proveedorNombre,
                personaNombre: gasto.personaNombre
            };

            this.gastosStore.createGasto(gastoCreate, displayData).then(() => {
                this.showSuccess('Gasto creado correctamente');
            });
            
            this.gastoDialog.set(false);
            this.currentGasto.set({});
        }
    }

    editGasto(gasto: Gasto) {
        this.currentGasto.set({ ...gasto });
        this.gastoDialog.set(true);
    }

    deleteGasto(gasto: Gasto) {
        this.confirmAction(
            `¿Estás seguro de eliminar el gasto "${gasto.conceptoNombre}"?`,
            () => {
                this.gastosStore.deleteGasto(gasto.id);
            },
            {
                header: 'Confirmar eliminación',
                acceptLabel: 'Sí, eliminar',
                rejectLabel: 'Cancelar',
                successMessage: 'Gasto eliminado correctamente'
            }
        );
    }

    deleteSelectedGastos() {
        this.confirmAction(
            '¿Estás seguro de eliminar los gastos seleccionados?',
            async () => {
                const deletePromises = this.selectedGastos().map((gasto) => this.gastosStore.deleteGasto(gasto.id));

                await Promise.all(deletePromises);
                this.selectedGastos.set([]);
            },
            {
                header: 'Confirmar',
                acceptLabel: 'Sí, eliminar',
                rejectLabel: 'Cancelar',
                successMessage: 'Gastos eliminados correctamente'
            }
        );
    }

    exportCSV() {
        // En lazy mode, exportar los datos actuales del store
        const gastos = this.gastosStore.gastos();
        if (!gastos || gastos.length === 0) {
            this.showWarning('No hay datos para exportar');
            return;
        }

        // Crear CSV manualmente con BOM para UTF-8
        const headers = ['Concepto', 'Categoría', 'Proveedor', 'Fecha', 'Importe', 'Descripción'];
        const csvData = gastos.map((g) => [g.conceptoNombre, g.categoriaNombre || '', g.proveedorNombre || '', g.fecha, g.importe, g.descripcion || '']);

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
        link.setAttribute('download', `gastos_${new Date().toISOString().split('T')[0]}.csv`);
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

    selectGasto(gasto: Gasto) {
        this.gastosStore.selectGasto(gasto);
    }
}
