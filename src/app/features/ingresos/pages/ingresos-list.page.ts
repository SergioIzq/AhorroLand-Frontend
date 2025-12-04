import { Component, inject, ChangeDetectionStrategy, ViewChild, OnDestroy } from '@angular/core';
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
import { IngresosStore } from '../stores/ingresos.store';
import { Ingreso } from '@/core/models';
import { IngresoFormModalComponent } from '../components/ingreso-form-modal.component';
import { BasePageComponent } from '@/shared/components/base-page.component';

@Component({
    selector: 'app-ingresos-list-page',
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
        IngresoFormModalComponent
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
                            label="Nuevo Ingreso" 
                            icon="pi pi-plus" 
                            severity="secondary" 
                            class="mr-2" 
                            (onClick)="openNew()" />
                        <p-button 
                            severity="secondary" 
                            label="Eliminar" 
                            icon="pi pi-trash" 
                            outlined 
                            (onClick)="deleteSelectedIngresos()" 
                            [disabled]="!selectedIngresos || !selectedIngresos.length" />
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
                    [value]="ingresosStore.ingresos()"
                    [lazy]="true"
                    (onLazyLoad)="loadIngresosLazy($event)"
                    [rows]="pageSize"
                    [totalRecords]="totalRecords"
                    [paginator]="true"
                    [loading]="ingresosStore.loading()"
                    [loadingIcon]="'none'"
                    [globalFilterFields]="['conceptoNombre', 'categoriaNombre', 'clienteNombre', 'descripcion']"
                    [tableStyle]="{ 'min-width': '75rem' }"
                    styleClass="p-datatable-gridlines p-datatable-loading-icon-none"
                    [(selection)]="selectedIngresos"
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
                            <th pSortableColumn="clienteNombre" style="min-width:12rem">
                                Cliente
                                <p-sortIcon field="clienteNombre" />
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
                                <p-tag 
                                    [value]="ingreso.categoriaNombre || 'Sin categoría'" 
                                    [severity]="getCategorySeverity(ingreso.categoriaNombre)" />
                            </td>
                            <td>{{ ingreso.clienteNombre || '-' }}</td>
                            <td>{{ ingreso.fecha | date:'dd/MM/yyyy' }}</td>
                            <td>
                                <span class="font-bold text-green-500">{{ ingreso.importe | currency:'EUR':'symbol':'1.2-2' }}</span>
                            </td>
                            <td>
                                <p-button 
                                    icon="pi pi-pencil" 
                                    class="mr-2" 
                                    [rounded]="true" 
                                    [outlined]="true" 
                                    (click)="editIngreso(ingreso)" />
                                <p-button 
                                    icon="pi pi-trash" 
                                    severity="danger" 
                                    [rounded]="true" 
                                    [outlined]="true" 
                                    (click)="deleteIngreso(ingreso)" />
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
                                    <p class="text-900 font-semibold text-xl mb-2">No hay ingresos</p>
                                    <p class="text-600 mb-4">Comienza agregando tu primer ingreso</p>
                                </div>
                            </td>
                        </tr>
                    </ng-template>
                </p-table>

                <!-- Nuevo componente de formulario modal con autocomplete -->
                <app-ingreso-form-modal
                    [visible]="ingresoDialog"
                    [ingreso]="currentIngreso"
                    (visibleChange)="ingresoDialog = $event"
                    (save)="onSaveIngreso($event)"
                    (cancel)="hideDialog()"
                />

                <p-confirmdialog [style]="{ width: '450px' }" />
            </div>
        </div>
    `
})
export class IngresosListPage extends BasePageComponent implements OnDestroy {
    ingresosStore: InstanceType<typeof IngresosStore> = inject(IngresosStore);

    @ViewChild('dt') dt!: Table;

    ingresoDialog: boolean = false;
    selectedIngresos: Ingreso[] = [];
    currentIngreso: Partial<Ingreso> = {};
    
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
            this.reloadIngresos();
        });
    }
    
    ngOnDestroy() {
        this.searchSubject.complete();
    }
    
    get totalRecords(): number {
        return this.ingresosStore.totalRecords();
    }
    
    /**
     * Recargar ingresos con los filtros actuales
     */
    private reloadIngresos() {
        this.ingresosStore.loadIngresosPaginated({ 
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
        this.reloadIngresos();
        this.showInfo('Datos actualizados', 'Actualización');
    }

    loadIngresosLazy(event: any) {
        // Calcular página actual (PrimeNG usa first que es el índice del primer registro)
        this.pageNumber = Math.floor(event.first / event.rows) + 1;
        this.pageSize = event.rows;
        
        // Capturar ordenamiento si existe
        if (event.sortField) {
            this.sortColumn = event.sortField;
            // event.sortOrder: 1 = ASC, -1 = DESC
            this.sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';
        }
        
        console.log('loadIngresosLazy llamado - event:', event);
        console.log('Calculado:', { 
            page: this.pageNumber, 
            pageSize: this.pageSize,
            sortColumn: this.sortColumn,
            sortOrder: this.sortOrder,
            searchTerm: this.searchTerm
        });
        
        // Cargar ingresos
        this.reloadIngresos();
    }

    onGlobalFilter(table: Table, event: Event) {
        const searchValue = (event.target as HTMLInputElement).value;
        console.log('Input de búsqueda:', searchValue);
        
        // Usar Subject para aplicar debounce (esperar 500ms después de dejar de escribir)
        this.searchSubject.next(searchValue);
    }

    openNew() {
        this.currentIngreso = {};
        this.ingresoDialog = true;
    }

    hideDialog() {
        this.ingresoDialog = false;
        this.currentIngreso = {};
    }

    async onSaveIngreso(ingreso: Partial<Ingreso>) {
        if (ingreso.id) {
            // Actualizar ingreso existente
            try {
                await this.ingresosStore.updateIngreso({ id: ingreso.id, ingreso });
                this.showSuccess('Ingreso actualizado correctamente');
                this.ingresoDialog = false;
                this.currentIngreso = {};
                this.reloadIngresos();
            } catch (error: any) {
                this.showError(error.userMessage || 'Error al actualizar el ingreso');
            }
        } else {
            // TODO: Implementar creación cuando el backend esté listo
            this.showInfo('La creación de ingresos estará disponible cuando se conecten los endpoints de catálogos', 'Próximamente');
            this.ingresoDialog = false;
            this.currentIngreso = {};
        }
    }

    editIngreso(ingreso: Ingreso) {
        this.currentIngreso = { ...ingreso };
        this.ingresoDialog = true;
    }

    deleteIngreso(ingreso: Ingreso) {
        this.confirmAction(
            `¿Estás seguro de eliminar el ingreso "${ingreso.conceptoNombre}"?`,
            async () => {
                try {
                    await this.ingresosStore.deleteIngreso(ingreso.id);
                    this.showSuccess('Ingreso eliminado correctamente');
                    this.reloadIngresos();
                } catch (error: any) {
                    this.showError(error.userMessage || 'Error al eliminar el ingreso');
                }
            },
            {
                header: 'Confirmar eliminación',
                acceptLabel: 'Sí, eliminar',
                rejectLabel: 'Cancelar'
            }
        );
    }

    deleteSelectedIngresos() {
        this.confirmAction(
            '¿Estás seguro de eliminar los ingresos seleccionados?',
            async () => {
                try {
                    const deletePromises = this.selectedIngresos.map(ingreso => 
                        this.ingresosStore.deleteIngreso(ingreso.id)
                    );
                    
                    await Promise.all(deletePromises);
                    this.showSuccess('Ingresos eliminados correctamente');
                    this.selectedIngresos = [];
                    this.reloadIngresos();
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
        const headers = ['Concepto', 'Categoría', 'Cliente', 'Fecha', 'Importe', 'Descripción'];
        const csvData = ingresos.map((i: Ingreso) => [
            i.conceptoNombre,
            i.categoriaNombre || '',
            i.clienteNombre || '',
            i.fecha,
            i.importe,
            i.descripcion || ''
        ]);

        // Agregar BOM (Byte Order Mark) para UTF-8
        let csv = '\uFEFF';
        csv += headers.join(',') + '\n';
        csvData.forEach((row: any[]) => {
            csv += row.map((field: any) => `"${field}"`).join(',') + '\n';
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
}
