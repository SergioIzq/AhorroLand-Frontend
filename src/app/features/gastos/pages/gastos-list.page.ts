import { Component, inject, ChangeDetectionStrategy, signal, ViewChild, OnDestroy } from '@angular/core';
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
import { MessageService, ConfirmationService } from 'primeng/api';
import { GastosStore } from '../stores/gastos.store';
import { Gasto } from '@/core/models';
import { GastoFormModalComponent } from '../components/gasto-form-modal.component';
import { BasePageComponent } from '@/shared/components';

@Component({
    selector: 'app-gastos-list-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        ToastModule,
        ConfirmDialogModule,
        TableModule,
        ToolbarModule,
        TagModule,
        InputIconModule,
        IconFieldModule,
        SkeletonModule,
        GastoFormModalComponent
    ],
    providers: [MessageService, ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card surface-ground px-4 py-5 md:px-6 lg:px-8">
            <div class="surface-card shadow-2 border-round p-6">
                <p-toast></p-toast>

                <p-toolbar styleClass="mb-6 gap-2 p-6">
                    <ng-template #start>
                        <p-button 
                            label="Nuevo Gasto" 
                            icon="pi pi-plus" 
                            severity="secondary" 
                            class="mr-2" 
                            (onClick)="openNew()" />
                        <p-button 
                            severity="secondary" 
                            label="Eliminar" 
                            icon="pi pi-trash" 
                            outlined 
                            (onClick)="deleteSelectedGastos()" 
                            [disabled]="!selectedGastos || !selectedGastos.length" />
                    </ng-template>

                    <ng-template #end>
                        <p-button 
                            icon="pi pi-refresh" 
                            severity="secondary" 
                            outlined
                            (onClick)="refreshTable()" 
                            pTooltip="Actualizar" 
                            class="mr-2" />
                        <p-button 
                            label="Exportar" 
                            icon="pi pi-upload" 
                            severity="secondary" 
                            (onClick)="exportCSV()" />
                    </ng-template>
                </p-toolbar>

                <p-table
                    #dt
                    [value]="gastosStore.gastos()"
                    [lazy]="true"
                    (onLazyLoad)="loadGastosLazy($event)"
                    [rows]="pageSize"
                    [totalRecords]="totalRecords"
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
                        <div class="flex items-center justify-between py-3 px-4">
                            <h5 class="m-0 font-semibold text-xl">Gestión de Gastos</h5>
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

                    <ng-template #body let-gasto>
                        <tr>
                            <td style="padding: 1rem">
                                <p-tableCheckbox [value]="gasto" />
                            </td>
                            <td style="padding: 1rem">
                                <div class="flex flex-col">
                                    <span class="font-semibold">{{ gasto.conceptoNombre }}</span>
                                    @if (gasto.descripcion) {
                                        <small class="text-500">{{ gasto.descripcion }}</small>
                                    }
                                </div>
                            </td>
                            <td style="padding: 1rem">
                                <p-tag 
                                    [value]="gasto.categoriaNombre || 'Sin categoría'" 
                                    [severity]="getCategorySeverity(gasto.categoriaNombre)" />
                            </td>
                            <td>{{ gasto.proveedorNombre || '-' }}</td>
                            <td>{{ gasto.fecha | date:'dd/MM/yyyy' }}</td>
                            <td>
                                <span class="font-bold text-red-500">{{ gasto.importe | currency:'EUR':'symbol':'1.2-2' }}</span>
                            </td>
                            <td>
                                <p-button 
                                    icon="pi pi-pencil" 
                                    class="mr-2" 
                                    [rounded]="true" 
                                    [outlined]="true" 
                                    (click)="editGasto(gasto)" />
                                <p-button 
                                    icon="pi pi-trash" 
                                    severity="danger" 
                                    [rounded]="true" 
                                    [outlined]="true" 
                                    (click)="deleteGasto(gasto)" />
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
                            <td colspan="7" style="padding: 2rem">
                                <div class="text-center py-8">
                                    <i class="pi pi-inbox text-500 text-5xl mb-3"></i>
                                    <p class="text-900 font-semibold text-xl mb-2">No hay gastos</p>
                                    <p class="text-600 mb-4">Comienza agregando tu primer gasto</p>
                                </div>
                            </td>
                        </tr>
                    </ng-template>
                </p-table>

                <!-- Nuevo componente de formulario modal con autocomplete -->
                <app-gasto-form-modal
                    [visible]="gastoDialog"
                    [gasto]="currentGasto"
                    (visibleChange)="gastoDialog = $event"
                    (save)="onSaveGasto($event)"
                    (cancel)="hideDialog()"
                />

                <p-confirmdialog [style]="{ width: '450px' }" />
            </div>
        </div>
    `
})
export class GastosListPage extends BasePageComponent implements OnDestroy {
    gastosStore = inject(GastosStore);

    @ViewChild('dt') dt!: Table;

    gastoDialog: boolean = false;
    selectedGastos: Gasto[] = [];
    currentGasto: Partial<Gasto> = {};
    
    pageSize: number = 10;
    pageNumber: number = 1;
    searchTerm: string = '';
    sortColumn: string = 'fecha';
    sortOrder: string = 'desc';
    
    // Subject para manejar búsqueda con debounce
    private searchSubject = new Subject<string>();
    
    constructor() {
        super();
        // Configurar búsqueda con debounce de 500ms
        this.searchSubject.pipe(
            debounceTime(500),
            distinctUntilChanged()
        ).subscribe(searchValue => {
            this.searchTerm = searchValue;
            this.pageNumber = 1; // Resetear a primera página en búsqueda
            this.reloadGastos();
        });
    }
    
    ngOnDestroy() {
        this.searchSubject.complete();
    }
    
    get totalRecords(): number {
        return this.gastosStore.totalRecords();
    }
    
    /**
     * Recargar gastos con los filtros actuales
     */
    private reloadGastos() {
        this.gastosStore.loadGastosPaginated({ 
            page: this.pageNumber, 
            pageSize: this.pageSize,
            searchTerm: this.searchTerm || undefined,
            sortColumn: this.sortColumn || undefined,
            sortOrder: this.sortOrder || undefined
        });
    }

    /**
     * Refrescar la tabla manualmente
     */
    refreshTable() {
        this.reloadGastos();
        this.showInfo('Datos actualizados', 'Actualización');
    }

    loadGastosLazy(event: any) {
        // Calcular página actual (PrimeNG usa first que es el índice del primer registro)
        this.pageNumber = Math.floor(event.first / event.rows) + 1;
        this.pageSize = event.rows;
        
        // Capturar ordenamiento si existe
        if (event.sortField) {
            this.sortColumn = event.sortField;
            // event.sortOrder: 1 = ASC, -1 = DESC
            this.sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';
        }
        
        // Cargar gastos
        this.reloadGastos();
    }

    onGlobalFilter(table: Table, event: Event) {
        const searchValue = (event.target as HTMLInputElement).value;
        console.log('Input de búsqueda:', searchValue);
        
        // Usar Subject para aplicar debounce (esperar 500ms después de dejar de escribir)
        this.searchSubject.next(searchValue);
    }

    openNew() {
        this.currentGasto = {};
        this.gastoDialog = true;
    }

    hideDialog() {
        this.gastoDialog = false;
        this.currentGasto = {};
    }

    async onSaveGasto(gasto: Partial<Gasto>) {
        if (gasto.id) {
            // Actualizar gasto existente
            try {
                await this.gastosStore.updateGasto({ id: gasto.id, gasto });
                this.showSuccess('Gasto actualizado correctamente');
                this.gastoDialog = false;
                this.currentGasto = {};
                this.reloadGastos();
            } catch (error: any) {
                this.showError(error.userMessage || 'Error al actualizar el gasto');
            }
        } else {
            // TODO: Implementar creación cuando el backend esté listo
            this.showInfo('La creación de gastos estará disponible cuando se conecten los endpoints de catálogos', 'Próximamente');
            this.gastoDialog = false;
            this.currentGasto = {};
        }
    }

    editGasto(gasto: Gasto) {
        this.currentGasto = { ...gasto };
        this.gastoDialog = true;
    }

    deleteGasto(gasto: Gasto) {
        this.confirmAction(
            `¿Estás seguro de eliminar el gasto "${gasto.conceptoNombre}"?`,
            async () => {
                try {
                    await this.gastosStore.deleteGasto(gasto.id);
                    this.showSuccess('Gasto eliminado correctamente');
                    this.reloadGastos();
                } catch (error: any) {
                    this.showError(error.userMessage || 'Error al eliminar el gasto');
                }
            },
            {
                header: 'Confirmar eliminación',
                acceptLabel: 'Sí, eliminar',
                rejectLabel: 'Cancelar'
            }
        );
    }

    deleteSelectedGastos() {
        this.confirmAction(
            '¿Estás seguro de eliminar los gastos seleccionados?',
            async () => {
                try {
                    const deletePromises = this.selectedGastos.map(gasto => 
                        this.gastosStore.deleteGasto(gasto.id)
                    );
                    
                    await Promise.all(deletePromises);
                    this.showSuccess('Gastos eliminados correctamente');
                    this.selectedGastos = [];
                    this.reloadGastos();
                } catch (error: any) {
                    this.showError(error.userMessage || 'Error al eliminar algunos gastos');
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
        const gastos = this.gastosStore.gastos();
        if (!gastos || gastos.length === 0) {
            this.showWarning('No hay datos para exportar');
            return;
        }

        // Crear CSV manualmente con BOM para UTF-8
        const headers = ['Concepto', 'Categoría', 'Proveedor', 'Fecha', 'Importe', 'Descripción'];
        const csvData = gastos.map(g => [
            g.conceptoNombre,
            g.categoriaNombre || '',
            g.proveedorNombre || '',
            g.fecha,
            g.importe,
            g.descripcion || ''
        ]);

        // Agregar BOM (Byte Order Mark) para UTF-8
        let csv = '\uFEFF';
        csv += headers.join(',') + '\n';
        csvData.forEach(row => {
            csv += row.map(field => `"${field}"`).join(',') + '\n';
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

    getCategorySeverity(categoria: string): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
        if (!categoria) return 'secondary';
        
        // Generar un hash simple del nombre de categoría para asignar color consistente
        const severities: Array<"success" | "info" | "warn" | "contrast" | "secondary"> = 
            ['success', 'info', 'warn', 'contrast', 'secondary'];
        
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

