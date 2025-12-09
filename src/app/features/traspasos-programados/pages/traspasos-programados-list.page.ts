import { Component, inject, ChangeDetectionStrategy, ViewChild, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Table, TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { TraspasosProgramadosStore } from '../stores/traspasos-programados.store';
import { TraspasoProgramado } from '@/core/models/traspaso-programado.model';
import { BasePageTemplateComponent } from '@/shared/components';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { TraspasoProgramadoFormModalComponent } from '../components/traspaso-programado-form-modal.component';

@Component({
    selector: 'app-traspasos-programados-list-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        ToastModule,
        TableModule,
        ToolbarModule,
        InputIconModule,
        IconFieldModule,
        SkeletonModule,
        TagModule,
        ConfirmDialogModule,
        TooltipModule,
        BasePageTemplateComponent,
        TraspasoProgramadoFormModalComponent
    ],
    providers: [MessageService, ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-base-page-template [loading]="traspasosStore.loading()" [skeletonType]="'table'">
            <div class="card surface-ground px-4 py-5 md:px-6 lg:px-8">
                <div class="surface-card shadow-2 border-round p-6">
                    <p-toast></p-toast>
                    <p-confirmDialog></p-confirmDialog>

                    <p-toolbar styleClass="mb-6 gap-2 p-6">
                        <ng-template #start>
                            <p-button 
                                label="Nuevo Traspaso Programado" 
                                icon="pi pi-plus" 
                                severity="secondary" 
                                class="mr-2" 
                                (onClick)="openNew()" />
                        </ng-template>

                        <ng-template #end>
                            <p-button 
                                icon="pi pi-refresh" 
                                severity="secondary" 
                                outlined 
                                (onClick)="refreshTable()" 
                                pTooltip="Actualizar" />
                        </ng-template>
                    </p-toolbar>

                    <p-table
                        #dt
                        [value]="traspasosStore.traspasos()"
                        [loading]="traspasosStore.loading()"
                        [lazy]="true"
                        (onLazyLoad)="onLazyLoad($event)"
                        [paginator]="true"
                        [rows]="pageSize()"
                        [totalRecords]="traspasosStore.totalRecords()"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} traspasos programados"
                        [rowsPerPageOptions]="[10, 25, 50]"
                        [tableStyle]="{ 'min-width': '50rem' }"
                        styleClass="p-datatable-gridlines"
                        [rowHover]="true"
                        dataKey="id"
                    >
                        <ng-template #caption>
                            <div class="flex items-center justify-between py-3 px-4">
                                <h5 class="m-0 font-semibold text-xl">Gestión de Traspasos Programados</h5>
                                <p-iconfield>
                                    <p-inputicon styleClass="pi pi-search" />
                                    <input 
                                        pInputText 
                                        type="text" 
                                        [ngModel]="searchTerm()" 
                                        (ngModelChange)="onSearchChange($event)" 
                                        placeholder="Buscar traspasos..." />
                                </p-iconfield>
                            </div>
                        </ng-template>

                        <ng-template #header>
                            <tr>
                                <th pSortableColumn="cuentaOrigenNombre" style="min-width:12rem; padding: 1rem">
                                    Cuenta Origen
                                    <p-sortIcon field="cuentaOrigenNombre" />
                                </th>
                                <th style="min-width:4rem; text-align: center">
                                    <i class="pi pi-arrow-right text-blue-500"></i>
                                </th>
                                <th pSortableColumn="cuentaDestinoNombre" style="min-width:12rem">
                                    Cuenta Destino
                                    <p-sortIcon field="cuentaDestinoNombre" />
                                </th>
                                <th pSortableColumn="importe" style="min-width:10rem">
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

                        <ng-template #body let-traspaso>
                            <tr>
                                <td style="padding: 1rem">
                                    <div class="flex items-center gap-2">
                                        <i class="pi pi-wallet text-red-500"></i>
                                        <span class="font-semibold">{{ traspaso.cuentaOrigenNombre }}</span>
                                    </div>
                                </td>
                                <td class="text-center">
                                    <i class="pi pi-arrow-right text-blue-500 font-bold"></i>
                                </td>
                                <td>
                                    <div class="flex items-center gap-2">
                                        <i class="pi pi-wallet text-green-500"></i>
                                        <span class="font-semibold">{{ traspaso.cuentaDestinoNombre }}</span>
                                    </div>
                                </td>
                                <td>
                                    <span class="font-bold text-blue-600">{{ traspaso.importe | number: '1.2-2' }} €</span>
                                </td>
                                <td>
                                    <p-tag [value]="traspaso.frecuencia" [severity]="getFrecuenciaSeverity(traspaso.frecuencia)" />
                                </td>
                                <td>
                                    {{ traspaso.fechaEjecucion | date: 'dd/MM/yyyy HH:mm' }}
                                </td>
                                <td>
                                    <p-tag 
                                        [value]="traspaso.activo ? 'Activo' : 'Inactivo'" 
                                        [severity]="traspaso.activo ? 'success' : 'danger'" />
                                </td>
                                <td>
                                    <div class="flex gap-2">
                                        <p-button 
                                            [icon]="traspaso.activo ? 'pi pi-pause' : 'pi pi-play'"
                                            [rounded]="true"
                                            [outlined]="true"
                                            [severity]="traspaso.activo ? 'warn' : 'success'"
                                            (onClick)="toggleActivo(traspaso)"
                                            [pTooltip]="traspaso.activo ? 'Desactivar' : 'Activar'"
                                        />
                                        <p-button 
                                            icon="pi pi-pencil" 
                                            [rounded]="true" 
                                            [outlined]="true" 
                                            (onClick)="editTraspaso(traspaso)" 
                                            pTooltip="Editar" />
                                        <p-button 
                                            icon="pi pi-trash" 
                                            severity="danger" 
                                            [rounded]="true" 
                                            [outlined]="true" 
                                            (onClick)="deleteTraspaso(traspaso)" 
                                            pTooltip="Eliminar" />
                                    </div>
                                </td>
                            </tr>
                        </ng-template>

                        <ng-template #loadingbody>
                            <tr>
                                <td style="padding: 1rem"><p-skeleton width="80%" /></td>
                                <td><p-skeleton width="20px" /></td>
                                <td><p-skeleton width="80%" /></td>
                                <td><p-skeleton width="70%" /></td>
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
                                        <p class="text-900 font-semibold text-xl mb-2">No hay traspasos programados</p>
                                        <p class="text-600 mb-4">Comienza agregando tu primer traspaso programado</p>
                                        <p-button 
                                            label="Crear Traspaso Programado" 
                                            icon="pi pi-plus" 
                                            (onClick)="openNew()" />
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            </div>
        </app-base-page-template>

        <!-- Modal de Formulario -->
        <app-traspaso-programado-form-modal
            [visible]="dialog()"
            [traspasoProgramado]="currentTraspaso()"
            (save)="saveTraspaso($event)"
            (cancel)="hideDialog()"
        />
    `
})
export class TraspasosProgramadosListPage {
    traspasosStore = inject(TraspasosProgramadosStore);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    @ViewChild('dt') dt!: Table;

    private searchSubject = new Subject<string>();

    // Signals para estado del componente
    pageSize = signal(10);
    pageNumber = signal(1);
    searchTerm = signal('');
    sortColumn = signal('fechaEjecucion');
    sortOrder = signal('desc');

    // Signals para el modal
    dialog = signal(false);
    currentTraspaso = signal<Partial<TraspasoProgramado> | null>(null);

    // Computed para el título del modal
    dialogTitle = computed(() => 
        this.currentTraspaso() ? 'Editar Traspaso Programado' : 'Nuevo Traspaso Programado'
    );

    constructor() {
        // Detectar sincronización instantánea
        effect(() => {
            const syncing = this.traspasosStore.isSyncing();
            const lastUpdate = this.traspasosStore.lastUpdated();
            
            if (syncing && lastUpdate > 0) {
                console.log('🔄 Sincronizando traspasos programados (47ms API response)');
            }
        });

        // Debounce para búsqueda
        this.searchSubject
            .pipe(debounceTime(500), distinctUntilChanged())
            .subscribe((searchValue) => {
                this.searchTerm.set(searchValue);
                this.pageNumber.set(1);
                this.reloadTraspasos();
            });

        // Carga inicial
        this.reloadTraspasos();
    }

    onLazyLoad(event: TableLazyLoadEvent) {
        this.pageNumber.set((event.first! / event.rows!) + 1);
        this.pageSize.set(event.rows!);
        
        if (event.sortField) {
            this.sortColumn.set(event.sortField as string);
            this.sortOrder.set(event.sortOrder === 1 ? 'asc' : 'desc');
        }
        
        this.reloadTraspasos();
    }

    onSearchChange(value: string) {
        this.searchSubject.next(value);
    }

    reloadTraspasos() {
        this.traspasosStore.loadTraspasosProgramadosPaginated({
            page: this.pageNumber(),
            pageSize: this.pageSize(),
            searchTerm: this.searchTerm(),
            sortColumn: this.sortColumn(),
            sortOrder: this.sortOrder()
        });
    }

    refreshTable() {
        this.traspasosStore.clearCache();
        this.reloadTraspasos();
        this.messageService.add({
            severity: 'info',
            summary: 'Actualizado',
            detail: 'Lista de traspasos programados actualizada'
        });
    }

    openNew() {
        this.currentTraspaso.set(null);
        this.dialog.set(true);
    }

    editTraspaso(traspaso: TraspasoProgramado) {
        this.currentTraspaso.set({ ...traspaso });
        this.dialog.set(true);
    }

    hideDialog() {
        this.dialog.set(false);
        this.currentTraspaso.set(null);
    }

    saveTraspaso(traspaso: Partial<TraspasoProgramado>) {
        if (traspaso.id) {
            // Actualizar
            const { id, ...updateData } = traspaso;
            this.traspasosStore.updateTraspaso({ id, traspaso: updateData });
            this.messageService.add({
                severity: 'success',
                summary: 'Actualizado',
                detail: 'Traspaso programado actualizado correctamente'
            });
        } else {
            // Crear
            this.traspasosStore.createTraspaso(traspaso as any);
            this.messageService.add({
                severity: 'success',
                summary: 'Creado',
                detail: 'Traspaso programado creado correctamente'
            });
        }
        
        this.hideDialog();
        setTimeout(() => this.reloadTraspasos(), 100);
    }

    deleteTraspaso(traspaso: TraspasoProgramado) {
        this.confirmationService.confirm({
            message: `¿Está seguro de eliminar el traspaso programado de ${traspaso.cuentaOrigenNombre} a ${traspaso.cuentaDestinoNombre}?`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.traspasosStore.deleteTraspaso(traspaso.id);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Eliminado',
                    detail: 'Traspaso programado eliminado correctamente'
                });
                setTimeout(() => this.reloadTraspasos(), 100);
            }
        });
    }

    toggleActivo(traspaso: TraspasoProgramado) {
        const nuevoEstado = !traspaso.activo;
        this.traspasosStore.toggleActivo({ id: traspaso.id, activo: nuevoEstado });
        this.messageService.add({
            severity: 'info',
            summary: nuevoEstado ? 'Activado' : 'Desactivado',
            detail: `Traspaso programado ${nuevoEstado ? 'activado' : 'desactivado'} correctamente`
        });
    }

    getFrecuenciaSeverity(frecuencia: string): 'success' | 'info' | 'warn' | 'danger' {
        const severityMap: Record<string, 'success' | 'info' | 'warn' | 'danger'> = {
            'DIARIO': 'danger',
            'SEMANAL': 'warn',
            'MENSUAL': 'info',
            'ANUAL': 'success'
        };
        return severityMap[frecuencia] || 'info';
    }
}
