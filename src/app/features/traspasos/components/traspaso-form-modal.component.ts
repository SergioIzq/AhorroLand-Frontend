import { Component, inject, input, output, effect, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { Traspaso } from '@/core/models/traspaso.model';
import { Cuenta } from '@/core/models/cuenta.model';
import { CuentaCreateModalComponent } from '@/shared/components';
import { CuentaStore } from '@/features/cuentas/store/cuenta.store';

interface CatalogItem {
    id: string;
    nombre: string;
}

interface TraspasoFormData extends Omit<Partial<Traspaso>, 'fecha'> {
    fecha?: Date | string;
}

@Component({
    selector: 'app-traspaso-form-modal',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DrawerModule,
        ButtonModule,
        InputNumberModule,
        TextareaModule,
        DatePickerModule,
        AutoCompleteModule,
        TooltipModule,
        CuentaCreateModalComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-drawer [(visible)]="isVisible" position="right" [style]="{ width: '600px', maxWidth: '100vw' }" [modal]="true" [blockScroll]="true" (onHide)="onCancel()" styleClass="p-sidebar-md surface-ground">
            <ng-template pTemplate="header">
                <div class="flex align-items-center gap-2">
                    <span class="font-bold text-xl text-900">{{ isEditMode() ? 'Editar Traspaso' : 'Nuevo Traspaso' }}</span>
                </div>
            </ng-template>

            <div class="grid grid-cols-12 gap-4 p-fluid py-2">
                <div class="col-span-12 field">
                    <label for="cuentaOrigen" class="font-semibold text-gray-700 block mb-2">Cuenta Origen *</label>
                    <div class="flex align-items-center gap-2">
                        <p-autoComplete
                            [(ngModel)]="selectedCuentaOrigen"
                            [suggestions]="filteredCuentasOrigen()"
                            (completeMethod)="searchCuentasOrigen($event)"
                            [showClear]="true"
                            (onClear)="onCuentaOrigenClear()"
                            optionLabel="nombre"
                            [dropdown]="true"
                            placeholder="Buscar o seleccionar cuenta origen..."
                            [forceSelection]="true"
                            (onSelect)="onCuentaOrigenSelect($event)"
                            class="flex-1 w-full"
                            styleClass="w-full"
                        />
                        <button pButton icon="pi pi-plus" [rounded]="true" [text]="true" severity="primary" (click)="openCreateCuentaOrigen()" pTooltip="Crear nueva cuenta"></button>
                    </div>
                    @if (submitted() && !selectedCuentaOrigen) {
                        <small class="text-red-500 block mt-1">La cuenta origen es requerida.</small>
                    }
                </div>

                <div class="col-span-12 field">
                    <label for="cuentaDestino" class="font-semibold text-gray-700 block mb-2">Cuenta Destino *</label>
                    <div class="flex align-items-center gap-2">
                        <p-autoComplete
                            [(ngModel)]="selectedCuentaDestino"
                            [suggestions]="filteredCuentasDestino()"
                            (completeMethod)="searchCuentasDestino($event)"
                            [showClear]="true"
                            (onClear)="onCuentaDestinoClear()"
                            optionLabel="nombre"
                            [dropdown]="true"
                            placeholder="Buscar o seleccionar cuenta destino..."
                            [forceSelection]="true"
                            (onSelect)="onCuentaDestinoSelect($event)"
                            class="flex-1 w-full"
                            styleClass="w-full"
                        />
                        <button pButton icon="pi pi-plus" [rounded]="true" [text]="true" severity="primary" (click)="openCreateCuentaDestino()" pTooltip="Crear nueva cuenta"></button>
                    </div>
                    @if (submitted() && !selectedCuentaDestino) {
                        <small class="text-red-500 block mt-1">La cuenta destino es requerida.</small>
                    }
                    @if (submitted() && selectedCuentaOrigen && selectedCuentaDestino && selectedCuentaOrigen.id === selectedCuentaDestino.id) {
                        <small class="text-red-500 block mt-1">La cuenta origen y destino deben ser diferentes.</small>
                    }
                </div>

                <div class="col-span-12 md:col-span-6 field">
                    <label for="importe" class="font-semibold text-gray-700 block mb-2">Importe *</label>
                    <p-inputNumber
                        id="importe"
                        [(ngModel)]="formData.importe"
                        mode="currency"
                        currency="EUR"
                        locale="es-ES"
                        [min]="0.01"
                        placeholder="0,00 €"
                        inputStyleClass="text-right font-bold text-xl text-blue-600"
                        class="w-full"
                        styleClass="w-full"
                    />
                    @if (submitted() && (!formData.importe || formData.importe <= 0)) {
                        <small class="text-red-500 block mt-1">El importe es requerido y debe ser mayor a 0.</small>
                    }
                </div>

                <div class="col-span-12 md:col-span-6 field">
                    <label for="fecha" class="font-semibold text-gray-700 block mb-2">Fecha *</label>
                    <p-datePicker [(ngModel)]="formData.fecha" dateFormat="dd/mm/yy" [showIcon]="true" appendTo="body" styleClass="w-full" class="w-full" />
                    @if (submitted() && !formData.fecha) {
                        <small class="text-red-500 block mt-1">La fecha es requerida.</small>
                    }
                </div>

                <div class="col-span-12 field mt-3">
                    <label for="descripcion" class="font-semibold text-gray-700 block mb-2">Descripción / Notas</label>
                    <textarea id="descripcion" pTextarea [(ngModel)]="formData.descripcion" rows="3" class="w-full" styleClass="w-full" placeholder="Descripción opcional del traspaso..."></textarea>
                </div>
            </div>

            <ng-template pTemplate="footer">
                <div class="flex justify-end gap-2 p-3 surface-border border-top-1">
                    <p-button label="Cancelar" icon="pi pi-times" [text]="true" severity="secondary" (onClick)="onCancel()" />
                    <p-button label="Guardar Traspaso" icon="pi pi-check" (onClick)="onSave()" />
                </div>
            </ng-template>
        </p-drawer>

        <app-cuenta-create-modal 
            [visible]="showCuentaCreateModal" 
            (visibleChange)="showCuentaCreateModal = $event" 
            (created)="onCuentaCreated($event)" 
            (cancel)="showCuentaCreateModal = false" 
        />
    `,
    styles: [
        `
            :host ::ng-deep {
                .p-sidebar {
                    background: #ffffff;
                }
                .p-autocomplete {
                    width: 100%;
                }
                .p-button.p-button-icon-only.p-button-rounded {
                    width: 2.5rem;
                    height: 2.5rem;
                    flex-shrink: 0;
                }
            }
        `
    ]
})
export class TraspasoFormModalComponent {
    private messageService = inject(MessageService);
    private cuentaStore = inject(CuentaStore);

    // Inputs/Outputs
    visible = input<boolean>(false);
    traspaso = input<Partial<Traspaso> | null>(null);
    visibleChange = output<boolean>();
    save = output<Partial<Traspaso>>();
    cancel = output<void>();

    // Estado del formulario
    formData: TraspasoFormData = {};
    submitted = signal(false);

    // Selectores asíncronos
    selectedCuentaOrigen: CatalogItem | null = null;
    selectedCuentaDestino: CatalogItem | null = null;

    filteredCuentasOrigen = signal<CatalogItem[]>([]);
    filteredCuentasDestino = signal<CatalogItem[]>([]);

    // Control de modales inline
    showCuentaCreateModal = false;
    // Variable para saber qué cuenta se está creando (origen o destino)
    private creatingCuentaFor: 'origen' | 'destino' = 'origen';

    constructor() {
        // Sincronizar visible con isVisible interno
        effect(() => {
            this.isVisible = this.visible();
        });

        // Cargar datos cuando cambia el traspaso
        effect(() => {
            const traspasoData = this.traspaso();
            if (traspasoData !== undefined) {
                this.loadFormData();
            }
        });
    }

    isVisible = false;

    isEditMode = signal(false);

    private loadFormData() {
        const traspasoData = this.traspaso();

        if (traspasoData?.id) {
            // Modo edición
            this.isEditMode.set(true);
            this.formData = {
                ...traspasoData,
                fecha: traspasoData.fecha ? new Date(traspasoData.fecha) : new Date()
            };

            // Cargar valores seleccionados en autocompletes
            this.selectedCuentaOrigen = traspasoData.cuentaOrigenId && traspasoData.cuentaOrigenNombre
                ? { id: traspasoData.cuentaOrigenId, nombre: traspasoData.cuentaOrigenNombre }
                : null;

            this.selectedCuentaDestino = traspasoData.cuentaDestinoId && traspasoData.cuentaDestinoNombre
                ? { id: traspasoData.cuentaDestinoId, nombre: traspasoData.cuentaDestinoNombre }
                : null;
        } else {
            // Modo creación
            this.isEditMode.set(false);
            this.formData = {
                importe: 0,
                fecha: new Date(),
                descripcion: ''
            };
            this.selectedCuentaOrigen = null;
            this.selectedCuentaDestino = null;
        }

        this.submitted.set(false);
    }

    // Métodos de búsqueda asíncrona para cuenta origen
    searchCuentasOrigen(event: AutoCompleteCompleteEvent) {
        const query = event.query;

        if (!query || query.length < 2) {
            this.cuentaStore
                .getRecent(5)
                .then((cuentas) => {
                    // Filtrar la cuenta destino si ya está seleccionada
                    const filtered = this.selectedCuentaDestino
                        ? cuentas.filter(c => c.id !== this.selectedCuentaDestino!.id)
                        : cuentas;
                    this.filteredCuentasOrigen.set(filtered);
                })
                .catch((err) => {
                    console.error('Error cargando cuentas:', err);
                    this.filteredCuentasOrigen.set([]);
                });
        } else {
            this.cuentaStore
                .search(query, 10)
                .then((cuentas) => {
                    // Filtrar la cuenta destino si ya está seleccionada
                    const filtered = this.selectedCuentaDestino
                        ? cuentas.filter(c => c.id !== this.selectedCuentaDestino!.id)
                        : cuentas;
                    this.filteredCuentasOrigen.set(filtered);
                })
                .catch((err) => {
                    console.error('Error buscando cuentas:', err);
                    this.filteredCuentasOrigen.set([]);
                });
        }
    }

    // Métodos de búsqueda asíncrona para cuenta destino
    searchCuentasDestino(event: AutoCompleteCompleteEvent) {
        const query = event.query;

        if (!query || query.length < 2) {
            this.cuentaStore
                .getRecent(5)
                .then((cuentas) => {
                    // Filtrar la cuenta origen si ya está seleccionada
                    const filtered = this.selectedCuentaOrigen
                        ? cuentas.filter(c => c.id !== this.selectedCuentaOrigen!.id)
                        : cuentas;
                    this.filteredCuentasDestino.set(filtered);
                })
                .catch((err) => {
                    console.error('Error cargando cuentas:', err);
                    this.filteredCuentasDestino.set([]);
                });
        } else {
            this.cuentaStore
                .search(query, 10)
                .then((cuentas) => {
                    // Filtrar la cuenta origen si ya está seleccionada
                    const filtered = this.selectedCuentaOrigen
                        ? cuentas.filter(c => c.id !== this.selectedCuentaOrigen!.id)
                        : cuentas;
                    this.filteredCuentasDestino.set(filtered);
                })
                .catch((err) => {
                    console.error('Error buscando cuentas:', err);
                    this.filteredCuentasDestino.set([]);
                });
        }
    }

    // Eventos de selección
    onCuentaOrigenSelect(event: any) {
        this.formData.cuentaOrigenId = event.id;
        this.formData.cuentaOrigenNombre = event.nombre;

        // Si la cuenta destino es la misma, limpiarla
        if (this.selectedCuentaDestino && this.selectedCuentaDestino.id === event.id) {
            this.selectedCuentaDestino = null;
            this.formData.cuentaDestinoId = undefined;
            this.formData.cuentaDestinoNombre = undefined;
            this.messageService.add({
                severity: 'warn',
                summary: 'Cuenta destino limpiada',
                detail: 'La cuenta origen y destino deben ser diferentes'
            });
        }
    }

    onCuentaDestinoSelect(event: any) {
        this.formData.cuentaDestinoId = event.id;
        this.formData.cuentaDestinoNombre = event.nombre;

        // Si la cuenta origen es la misma, limpiarla
        if (this.selectedCuentaOrigen && this.selectedCuentaOrigen.id === event.id) {
            this.selectedCuentaOrigen = null;
            this.formData.cuentaOrigenId = undefined;
            this.formData.cuentaOrigenNombre = undefined;
            this.messageService.add({
                severity: 'warn',
                summary: 'Cuenta origen limpiada',
                detail: 'La cuenta origen y destino deben ser diferentes'
            });
        }
    }

    // Handlers para limpiar autocompletes
    onCuentaOrigenClear() {
        this.selectedCuentaOrigen = null;
        this.formData.cuentaOrigenId = undefined;
        this.formData.cuentaOrigenNombre = undefined;
        this.filteredCuentasOrigen.set([]);
    }

    onCuentaDestinoClear() {
        this.selectedCuentaDestino = null;
        this.formData.cuentaDestinoId = undefined;
        this.formData.cuentaDestinoNombre = undefined;
        this.filteredCuentasDestino.set([]);
    }

    // Abrir modales de creación inline
    openCreateCuentaOrigen() {
        this.creatingCuentaFor = 'origen';
        this.showCuentaCreateModal = true;
    }

    openCreateCuentaDestino() {
        this.creatingCuentaFor = 'destino';
        this.showCuentaCreateModal = true;
    }

    // Handler cuando se crea una nueva cuenta
    onCuentaCreated(nuevaCuenta: Cuenta) {
        this.showCuentaCreateModal = false;

        const cuentaItem: CatalogItem = {
            id: nuevaCuenta.id,
            nombre: nuevaCuenta.nombre
        };

        if (this.creatingCuentaFor === 'origen') {
            // Seleccionar automáticamente como cuenta origen
            this.selectedCuentaOrigen = cuentaItem;
            this.formData.cuentaOrigenId = cuentaItem.id;
            this.formData.cuentaOrigenNombre = cuentaItem.nombre;
            this.filteredCuentasOrigen.set([cuentaItem, ...this.filteredCuentasOrigen()]);
        } else {
            // Seleccionar automáticamente como cuenta destino
            this.selectedCuentaDestino = cuentaItem;
            this.formData.cuentaDestinoId = cuentaItem.id;
            this.formData.cuentaDestinoNombre = cuentaItem.nombre;
            this.filteredCuentasDestino.set([cuentaItem, ...this.filteredCuentasDestino()]);
        }

        this.messageService.add({
            severity: 'success',
            summary: 'Cuenta creada',
            detail: `Cuenta "${nuevaCuenta.nombre}" creada y seleccionada correctamente`
        });
    }

    onSave() {
        this.submitted.set(true);

        // Validaciones
        if (!this.selectedCuentaOrigen ||
            !this.selectedCuentaDestino ||
            !this.formData.importe ||
            this.formData.importe <= 0 ||
            !this.formData.fecha) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Por favor complete todos los campos requeridos'
            });
            return;
        }

        // Validación de dominio: cuentas diferentes
        if (this.selectedCuentaOrigen.id === this.selectedCuentaDestino.id) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error de validación',
                detail: 'La cuenta de origen y destino deben ser diferentes'
            });
            return;
        }

        // Preparar datos para guardar
        const traspasoToSave: Partial<Traspaso> = {
            ...this.formData,
            cuentaOrigenId: this.selectedCuentaOrigen.id,
            cuentaOrigenNombre: this.selectedCuentaOrigen.nombre,
            cuentaDestinoId: this.selectedCuentaDestino.id,
            cuentaDestinoNombre: this.selectedCuentaDestino.nombre,
            fecha: typeof this.formData.fecha === 'string'
                ? this.formData.fecha
                : new Date(this.formData.fecha!).toISOString().split('T')[0]
        };

        this.save.emit(traspasoToSave);
        this.closeModal();
    }

    onCancel() {
        this.cancel.emit();
        this.closeModal();
    }

    private closeModal() {
        this.isVisible = false;
        this.visibleChange.emit(false);
        this.submitted.set(false);
    }
}
