import { Component, inject, input, output, effect, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

// Modelos
import { Ingreso } from '@/core/models';
import { Cliente } from '@/core/models/cliente.model';
import { Persona } from '@/core/models/persona.model';
import { Concepto } from '@/core/models/concepto.model';
import { Categoria } from '@/core/models/categoria.model';
import { FormaPago } from '@/core/models/forma-pago.model';
import { Cuenta } from '@/core/models/cuenta.model';

// Componentes de creación rápida
import { CategoriaCreateModalComponent, ClienteCreateModalComponent, PersonaCreateModalComponent, CuentaCreateModalComponent, FormaPagoCreateModalComponent } from '@/shared/components';
import { ConceptoCreateModalComponent } from '@/features/conceptos/components/concepto-create-modal.component';

// Stores
import { ClienteStore } from '@/features/clientes/store/cliente.store';
import { FormaPagoStore } from '@/features/formas-pago/store/forma-pago.store';
import { CuentaStore } from '@/features/cuentas/store/cuenta.store';
import { ConceptoStore } from '@/features/conceptos/store/concepto.store';
import { CategoriaStore } from '@/features/categorias/store/categoria.store';
import { PersonaStore } from '@/features/personas/store/persona.store';

interface CatalogItem {
    id: string;
    nombre: string;
}

interface IngresoFormData extends Omit<Partial<Ingreso>, 'fecha'> {
    fecha?: Date | string;
}

@Component({
    selector: 'app-ingreso-form-modal',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DrawerModule, // Usamos Drawer en lugar de Dialog
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        TextareaModule,
        DatePickerModule,
        AutoCompleteModule,
        TooltipModule,
        ConceptoCreateModalComponent,
        CategoriaCreateModalComponent,
        ClienteCreateModalComponent,
        PersonaCreateModalComponent,
        CuentaCreateModalComponent,
        FormaPagoCreateModalComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-drawer [(visible)]="isVisible" position="right" [style]="{ width: '600px', maxWidth: '100vw' }" [modal]="true" [blockScroll]="true" (onHide)="onCancel()" styleClass="p-sidebar-md surface-ground">
            <ng-template pTemplate="header">
                <div class="flex align-items-center gap-2">
                    <span class="font-bold text-xl text-900">{{ isEditMode() ? 'Editar Ingreso' : 'Nuevo Ingreso' }}</span>
                </div>
            </ng-template>

            <div class="grid grid-cols-12 gap-4 p-fluid py-2">
                <div class="col-span-12 field">
                    <label for="concepto" class="font-semibold text-gray-700 block mb-2">Concepto *</label>
                    <div class="flex align-items-center gap-2">
                        <p-autoComplete
                            [(ngModel)]="selectedConcepto"
                            [placeholder]="getConceptoPlaceholder()"
                            [suggestions]="filteredConceptos()"
                            (completeMethod)="searchConceptos($event)"
                            [showClear]="true"
                            (onClear)="onConceptoClear()"
                            optionLabel="nombre"
                            [dropdown]="true"
                            class="flex-1 w-full"
                            styleClass="w-full"
                            [forceSelection]="true"
                            (onSelect)="onConceptoSelect($event)"
                            inputStyleClass="font-semibold"
                        />
                        <button pButton icon="pi pi-plus" [rounded]="true" [text]="true" severity="primary" (click)="openCreateConcepto()" pTooltip="Crear concepto"></button>
                    </div>
                    @if (submitted() && !selectedConcepto) {
                        <small class="text-red-500 block mt-1">El concepto es requerido.</small>
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
                        [min]="0"
                        placeholder="0,00 €"
                        inputStyleClass="text-right font-bold text-xl text-green-600"
                        class="w-full"
                        styleClass="w-full"
                    />
                    @if (submitted() && !formData.importe) {
                        <small class="text-red-500 block mt-1">Requerido.</small>
                    }
                </div>

                <div class="col-span-12 md:col-span-6 field">
                    <label for="fecha" class="font-semibold text-gray-700 block mb-2">Fecha *</label>
                    <p-datePicker [(ngModel)]="formData.fecha" dateFormat="dd/mm/yy" [showIcon]="true" appendTo="body" styleClass="w-full" class="w-full" />
                </div>

                <div class="col-span-12 mt-4">
                    <h5 class="text-xs font-bold text-500 uppercase tracking-wider border-b border-gray-200 pb-2 mb-2">Clasificación Financiera</h5>
                </div>

                <div class="col-span-12 md:col-span-6 field">
                    <label class="font-medium text-gray-700 block mb-2 text-sm">Categoría</label>
                    <div class="flex align-items-center gap-2">
                        <p-autoComplete
                            [(ngModel)]="selectedCategoria"
                            [suggestions]="filteredCategorias()"
                            (completeMethod)="searchCategorias($event)"
                            [showClear]="true"
                            (onClear)="onCategoriaClear()"
                            optionLabel="nombre"
                            [dropdown]="true"
                            placeholder="Seleccionar..."
                            [forceSelection]="false"
                            (onSelect)="onCategoriaSelect($event)"
                            class="flex-1 w-full"
                            styleClass="w-full"
                        />
                        <button pButton icon="pi pi-plus" [rounded]="true" [text]="true" severity="primary" (click)="openCreateCategoria()"></button>
                    </div>
                    @if (submitted() && !selectedCategoria) {
                        <small class="text-red-500 block mt-1">Requerida.</small>
                    }
                </div>

                <div class="col-span-12 md:col-span-6 field">
                    <label class="font-medium text-gray-700 block mb-2 text-sm">Forma de Pago *</label>
                    <div class="flex align-items-center gap-2">
                        <p-autoComplete
                            [(ngModel)]="selectedFormaPago"
                            [suggestions]="filteredFormasPago()"
                            (completeMethod)="searchFormasPago($event)"
                            optionLabel="nombre"
                            [dropdown]="true"
                            placeholder="Seleccionar..."
                            [forceSelection]="true"
                            (onSelect)="onFormaPagoSelect($event)"
                            class="flex-1 w-full"
                            styleClass="w-full"
                        />
                        <button pButton icon="pi pi-plus" [rounded]="true" [text]="true" severity="primary" (click)="openCreateFormaPago()"></button>
                    </div>
                    @if (submitted() && !selectedFormaPago) {
                        <small class="text-red-500 block mt-1">Requerida.</small>
                    }
                </div>

                <div class="col-span-12 field">
                    <label class="font-medium text-gray-700 block mb-2 text-sm">Cuenta de Destino *</label>
                    <div class="flex align-items-center gap-2">
                        <p-autoComplete
                            [(ngModel)]="selectedCuenta"
                            [suggestions]="filteredCuentas()"
                            (completeMethod)="searchCuentas($event)"
                            optionLabel="nombre"
                            [dropdown]="true"
                            placeholder="Seleccionar cuenta bancaria / caja..."
                            [forceSelection]="true"
                            (onSelect)="onCuentaSelect($event)"
                            class="flex-1 w-full"
                            styleClass="w-full"
                        />
                        <button pButton icon="pi pi-plus" [rounded]="true" [text]="true" severity="primary" (click)="openCreateCuenta()"></button>
                    </div>
                    @if (submitted() && !selectedCuenta) {
                        <small class="text-red-500 block mt-1">Requerida.</small>
                    }
                </div>

                <div class="col-span-12 mt-4">
                    <h5 class="text-xs font-bold text-500 uppercase tracking-wider border-b border-gray-200 pb-2 mb-2">Terceros</h5>
                </div>

                <div class="col-span-12 md:col-span-6 field">
                    <label class="font-medium text-gray-700 block mb-2 text-sm">Cliente *</label>
                    <div class="flex align-items-center gap-2">
                        <p-autoComplete
                            [(ngModel)]="selectedCliente"
                            [suggestions]="filteredClientees()"
                            (completeMethod)="searchClientees($event)"
                            optionLabel="nombre"
                            [dropdown]="true"
                            placeholder="Buscar cliente..."
                            [forceSelection]="false"
                            (onSelect)="onClienteSelect($event)"
                            class="flex-1 w-full"
                            styleClass="w-full"
                        />
                        <button pButton icon="pi pi-plus" [rounded]="true" [text]="true" severity="primary" (click)="openCreateCliente()"></button>
                    </div>
                    @if (submitted() && !selectedCliente) {
                        <small class="text-red-500 block mt-1">Requerido.</small>
                    }
                </div>

                <div class="col-span-12 md:col-span-6 field">
                    <label class="font-medium text-gray-700 block mb-2 text-sm">Persona *</label>
                    <div class="flex align-items-center gap-2">
                        <p-autoComplete
                            [(ngModel)]="selectedPersona"
                            [suggestions]="filteredPersonas()"
                            (completeMethod)="searchPersonas($event)"
                            optionLabel="nombre"
                            [dropdown]="true"
                            placeholder="Buscar persona..."
                            [forceSelection]="false"
                            (onSelect)="onPersonaSelect($event)"
                            class="flex-1 w-full"
                            styleClass="w-full"
                        />
                        <button pButton icon="pi pi-plus" [rounded]="true" [text]="true" severity="primary" (click)="openCreatePersona()"></button>
                    </div>
                    @if (submitted() && !selectedPersona) {
                        <small class="text-red-500 block mt-1">Requerida.</small>
                    }
                </div>

                <div class="col-span-12 field mt-3">
                    <label for="descripcion" class="font-semibold text-gray-700 block mb-2">Descripción / Notas</label>
                    <textarea id="descripcion" pTextarea [(ngModel)]="formData.descripcion" rows="3" class="w-full" styleClass="w-full" placeholder="Añadir detalles adicionales..."></textarea>
                </div>
            </div>

            <ng-template pTemplate="footer">
                <div class="flex justify-end gap-2 p-3 surface-border border-top-1">
                    <p-button label="Cancelar" icon="pi pi-times" [text]="true" severity="secondary" (onClick)="onCancel()" />
                    <p-button label="Guardar Ingreso" icon="pi pi-check" (onClick)="onSave()" />
                </div>
            </ng-template>
        </p-drawer>

        <app-concepto-create-modal [visible]="showConceptoCreateModal" (visibleChange)="showConceptoCreateModal = $event" (created)="onConceptoCreated($event)" (cancel)="showConceptoCreateModal = false" />
        <app-categoria-create-modal [visible]="showCategoriaCreateModal" (visibleChange)="showCategoriaCreateModal = $event" (created)="onCategoriaCreated($event)" (cancel)="showCategoriaCreateModal = false" />
        <app-cliente-create-modal [visible]="showClienteCreateModal" (visibleChange)="showClienteCreateModal = $event" (created)="onClienteCreated($event)" (cancel)="showClienteCreateModal = false" />
        <app-persona-create-modal [visible]="showPersonaCreateModal" (visibleChange)="showPersonaCreateModal = $event" (created)="onPersonaCreated($event)" (cancel)="showPersonaCreateModal = false" />
        <app-forma-pago-create-modal [visible]="showFormaPagoCreateModal" (visibleChange)="showFormaPagoCreateModal = $event" (created)="onFormaPagoCreated($event)" (cancel)="showFormaPagoCreateModal = false" />
        <app-cuenta-create-modal [visible]="showCuentaCreateModal" (visibleChange)="showCuentaCreateModal = $event" (created)="onCuentaCreated($event)" (cancel)="showCuentaCreateModal = false" />
    `,
    styles: [
        `
            :host ::ng-deep {
                .p-sidebar {
                    background: #ffffff; /* Fondo blanco limpio en lugar de gris */
                }
                .p-autocomplete {
                    width: 100%;
                }
                /* Ajuste para que los botones circulares no se deformen */
                .p-button.p-button-icon-only.p-button-rounded {
                    width: 2.5rem;
                    height: 2.5rem;
                    flex-shrink: 0;
                }
            }
        `
    ]
})
export class IngresoFormModalComponent {
    private messageService = inject(MessageService);
    private conceptoStore = inject(ConceptoStore);
    private categoriaStore = inject(CategoriaStore);
    private clienteStore = inject(ClienteStore);
    private personaStore = inject(PersonaStore);
    private cuentaStore = inject(CuentaStore);
    private formaPagoStore = inject(FormaPagoStore);

    // Inputs/Outputs
    visible = input<boolean>(false);
    ingreso = input<Partial<Ingreso> | null>(null);
    visibleChange = output<boolean>();
    save = output<Partial<Ingreso>>();
    cancel = output<void>();

    // Estado del formulario
    formData: IngresoFormData = {};
    submitted = signal(false);

    // Selectores asíncronos
    selectedConcepto: CatalogItem | null = null;
    selectedCategoria: CatalogItem | null = null;
    selectedCliente: CatalogItem | null = null;
    selectedPersona: CatalogItem | null = null;
    selectedCuenta: CatalogItem | null = null;
    selectedFormaPago: CatalogItem | null = null;

    filteredConceptos = signal<CatalogItem[]>([]);
    filteredCategorias = signal<CatalogItem[]>([]);
    filteredClientees = signal<CatalogItem[]>([]);
    filteredPersonas = signal<CatalogItem[]>([]);
    filteredCuentas = signal<CatalogItem[]>([]);
    filteredFormasPago = signal<CatalogItem[]>([]);

    // Control de modales inline
    showConceptoCreateModal = false;
    showCategoriaCreateModal = false;
    showClienteCreateModal = false;
    showPersonaCreateModal = false;
    showFormaPagoCreateModal = false;
    showCuentaCreateModal = false;

    constructor() {
        effect(() => {
            this.isVisible = this.visible();
        });

        effect(() => {
            const ingresoData = this.ingreso();
            if (ingresoData) {
                this.loadFormData();
            }
        });
    }

    isVisible = false;
    isEditMode = signal(false);

    private loadFormData() {
        const ingresoData = this.ingreso();

        if (ingresoData?.id) {
            // Modo edición
            this.isEditMode.set(true);
            this.formData = {
                ...ingresoData,
                fecha: ingresoData.fecha ? new Date(ingresoData.fecha) : new Date()
            };

            this.selectedConcepto = ingresoData.conceptoId && ingresoData.conceptoNombre ? { id: ingresoData.conceptoId, nombre: ingresoData.conceptoNombre } : null;
            this.selectedCategoria = ingresoData.categoriaId && ingresoData.categoriaNombre ? { id: ingresoData.categoriaId, nombre: ingresoData.categoriaNombre } : null;
            this.selectedCliente = ingresoData.clienteId && ingresoData.clienteNombre ? { id: ingresoData.clienteId, nombre: ingresoData.clienteNombre } : null;
            this.selectedPersona = ingresoData.personaId && ingresoData.personaNombre ? { id: ingresoData.personaId, nombre: ingresoData.personaNombre } : null;
            this.selectedCuenta = ingresoData.cuentaId && ingresoData.cuentaNombre ? { id: ingresoData.cuentaId, nombre: ingresoData.cuentaNombre } : null;
            this.selectedFormaPago = ingresoData.formaPagoId && ingresoData.formaPagoNombre ? { id: ingresoData.formaPagoId, nombre: ingresoData.formaPagoNombre } : null;
        } else {
            // Modo creación
            this.isEditMode.set(false);
            this.formData = {
                fecha: new Date(),
                descripcion: ''
            };
            this.selectedConcepto = null;
            this.selectedCategoria = null;
            this.selectedCliente = null;
            this.selectedPersona = null;
            this.selectedCuenta = null;
            this.selectedFormaPago = null;
        }
        this.submitted.set(false);
    }

    // --- Métodos de búsqueda (Search) ---
    searchConceptos(event: AutoCompleteCompleteEvent) {
        const query = event.query;
        const categoriaId = this.selectedCategoria?.id;
        if (!query || query.length < 2) {
            this.conceptoStore
                .getRecent(5, categoriaId)
                .then((data) => this.filteredConceptos.set(data))
                .catch(() => this.filteredConceptos.set([]));
        } else {
            this.conceptoStore
                .search(query, 10, categoriaId)
                .then((data) => this.filteredConceptos.set(data))
                .catch(() => this.filteredConceptos.set([]));
        }
    }

    searchCategorias(event: AutoCompleteCompleteEvent) {
        const query = event.query;
        if (!query || query.length < 2) {
            this.categoriaStore
                .getRecent(5)
                .then((data) => this.filteredCategorias.set(data))
                .catch(() => this.filteredCategorias.set([]));
        } else {
            this.categoriaStore
                .search(query, 10)
                .then((data) => this.filteredCategorias.set(data))
                .catch(() => this.filteredCategorias.set([]));
        }
    }

    searchClientees(event: AutoCompleteCompleteEvent) {
        const query = event.query;
        if (!query || query.length < 2) {
            this.clienteStore
                .getRecent(5)
                .then((data) => this.filteredClientees.set(data))
                .catch(() => this.filteredClientees.set([]));
        } else {
            this.clienteStore
                .search(query, 10)
                .then((data) => this.filteredClientees.set(data))
                .catch(() => this.filteredClientees.set([]));
        }
    }

    searchPersonas(event: AutoCompleteCompleteEvent) {
        const query = event.query;
        if (!query || query.length < 2) {
            this.personaStore
                .getRecent(5)
                .then((data) => this.filteredPersonas.set(data))
                .catch(() => this.filteredPersonas.set([]));
        } else {
            this.personaStore
                .search(query, 10)
                .then((data) => this.filteredPersonas.set(data))
                .catch(() => this.filteredPersonas.set([]));
        }
    }

    searchCuentas(event: AutoCompleteCompleteEvent) {
        const query = event.query;
        if (!query || query.length < 2) {
            this.cuentaStore
                .getRecent(5)
                .then((data) => this.filteredCuentas.set(data))
                .catch(() => this.filteredCuentas.set([]));
        } else {
            this.cuentaStore
                .search(query, 10)
                .then((data) => this.filteredCuentas.set(data))
                .catch(() => this.filteredCuentas.set([]));
        }
    }

    searchFormasPago(event: AutoCompleteCompleteEvent) {
        const query = event.query;
        if (!query || query.length < 2) {
            this.formaPagoStore
                .getRecent(5)
                .then((data) => this.filteredFormasPago.set(data))
                .catch(() => this.filteredFormasPago.set([]));
        } else {
            this.formaPagoStore
                .search(query, 10)
                .then((data) => this.filteredFormasPago.set(data))
                .catch(() => this.filteredFormasPago.set([]));
        }
    }

    // --- Eventos de selección y limpieza ---
    onConceptoSelect(event: any) {
        let value = event.value;
        this.formData.conceptoId = value.id;
        this.formData.conceptoNombre = value.nombre;

        // Auto-asignación de categoría si el concepto la tiene
        if (value.categoriaId && value.categoriaNombre) {
            const categoriaAsociada: CatalogItem = { id: value.categoriaId, nombre: value.categoriaNombre };
            this.selectedCategoria = categoriaAsociada;
            this.formData.categoriaId = categoriaAsociada.id;
            this.formData.categoriaNombre = categoriaAsociada.nombre;
            this.messageService.add({ severity: 'info', summary: 'Info', detail: `Categoría ${value.categoriaNombre} asignada` });
        }
    }

    onCategoriaSelect(event: any) {
        this.formData.categoriaId = event.id;
        this.formData.categoriaNombre = event.nombre;
        // Limpiar concepto para forzar selección válida en la nueva categoría
        this.selectedConcepto = null;
        this.formData.conceptoId = undefined;
        this.formData.conceptoNombre = undefined;
    }

    onClienteSelect(event: any) {
        this.formData.clienteId = event.id;
        this.formData.clienteNombre = event.nombre;
    }
    onPersonaSelect(event: any) {
        this.formData.personaId = event.id;
        this.formData.personaNombre = event.nombre;
    }
    onCuentaSelect(event: any) {
        this.formData.cuentaId = event.id;
        this.formData.cuentaNombre = event.nombre;
    }
    onFormaPagoSelect(event: any) {
        this.formData.formaPagoId = event.id;
        this.formData.formaPagoNombre = event.nombre;
    }

    onConceptoClear() {
        this.selectedConcepto = null;
        this.formData.conceptoId = undefined;
        this.formData.conceptoNombre = undefined;
        this.filteredConceptos.set([]);
    }
    onCategoriaClear() {
        this.selectedCategoria = null;
        this.formData.categoriaId = undefined;
        this.formData.categoriaNombre = undefined;
        this.filteredConceptos.set([]);
    }
    onClienteClear() {
        this.selectedCliente = null;
        this.formData.clienteId = undefined;
        this.formData.clienteNombre = undefined;
        this.filteredClientees.set([]);
    }
    onPersonaClear() {
        this.selectedPersona = null;
        this.formData.personaId = undefined;
        this.formData.personaNombre = undefined;
        this.filteredPersonas.set([]);
    }
    onCuentaClear() {
        this.selectedCuenta = null;
        this.formData.cuentaId = undefined;
        this.formData.cuentaNombre = undefined;
        this.filteredCuentas.set([]);
    }
    onFormaPagoClear() {
        this.selectedFormaPago = null;
        this.formData.formaPagoId = undefined;
        this.formData.formaPagoNombre = undefined;
        this.filteredFormasPago.set([]);
    }

    // --- Apertura de Modales Inline ---
    openCreateConcepto() {
        this.showConceptoCreateModal = true;
    }
    openCreateCategoria() {
        this.showCategoriaCreateModal = true;
    }
    openCreateCliente() {
        this.showClienteCreateModal = true;
    }
    openCreatePersona() {
        this.showPersonaCreateModal = true;
    }
    openCreateFormaPago() {
        this.showFormaPagoCreateModal = true;
    }
    openCreateCuenta() {
        this.showCuentaCreateModal = true;
    }

    // --- Callbacks de Creación (actualizan autocomplete) ---
    onConceptoCreated(nuevo: Concepto) {
        this.showConceptoCreateModal = false;
        const item: CatalogItem = { id: nuevo.id, nombre: nuevo.nombre };
        this.selectedConcepto = item;
        this.formData.conceptoId = item.id;
        this.formData.conceptoNombre = item.nombre;
        this.filteredConceptos.set([item, ...this.filteredConceptos()]);
        this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Concepto creado y seleccionado' });
    }

    onCategoriaCreated(nuevo: Categoria) {
        this.showCategoriaCreateModal = false;
        const item = { id: nuevo.id, nombre: nuevo.nombre };
        this.selectedCategoria = item;
        this.formData.categoriaId = nuevo.id;
        this.formData.categoriaNombre = nuevo.nombre;
        this.filteredCategorias.set([item, ...this.filteredCategorias()]);
        this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Categoría creada y seleccionada' });
    }

    onClienteCreated(nuevo: Cliente) {
        this.showClienteCreateModal = false;
        const item = { id: nuevo.id, nombre: nuevo.nombre };
        this.selectedCliente = item;
        this.formData.clienteId = item.id;
        this.formData.clienteNombre = item.nombre;
        this.filteredClientees.set([item, ...this.filteredClientees()]);
        this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Cliente creado y seleccionado' });
    }

    onPersonaCreated(nuevo: Persona) {
        this.showPersonaCreateModal = false;
        const item = { id: nuevo.id, nombre: nuevo.nombre };
        this.selectedPersona = item;
        this.formData.personaId = item.id;
        this.formData.personaNombre = item.nombre;
        this.filteredPersonas.set([item, ...this.filteredPersonas()]);
        this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Persona creada y seleccionada' });
    }

    onCuentaCreated(nuevo: Cuenta) {
        this.showCuentaCreateModal = false;
        const item = { id: nuevo.id, nombre: nuevo.nombre };
        this.selectedCuenta = item;
        this.formData.cuentaId = item.id;
        this.formData.cuentaNombre = item.nombre;
        this.filteredCuentas.set([item, ...this.filteredCuentas()]);
        this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Cuenta creada y seleccionada' });
    }

    onFormaPagoCreated(nuevo: FormaPago) {
        this.showFormaPagoCreateModal = false;
        const item = { id: nuevo.id, nombre: nuevo.nombre };
        this.selectedFormaPago = item;
        this.formData.formaPagoId = item.id;
        this.formData.formaPagoNombre = item.nombre;
        this.filteredFormasPago.set([item, ...this.filteredFormasPago()]);
        this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Forma de Pago creada y seleccionada' });
    }

    getConceptoPlaceholder(): string {
        if (this.selectedCategoria) return `Buscar concepto en ${this.selectedCategoria.nombre}...`;
        return 'Buscar o seleccionar concepto (Todas las categorías)';
    }

    onSave() {
        this.submitted.set(true);
        if (!this.selectedConcepto || !this.formData.importe || this.formData.importe <= 0 || !this.selectedCuenta || !this.selectedFormaPago || !this.selectedPersona || !this.selectedCliente) {
            this.messageService.add({ severity: 'warn', summary: 'Incompleto', detail: 'Por favor complete todos los campos requeridos.' });
            return;
        }

        const ingresoToSave: Partial<Ingreso> = {
            ...this.formData,
            conceptoId: this.selectedConcepto.id,
            conceptoNombre: this.selectedConcepto.nombre,
            categoriaId: this.selectedCategoria?.id || '',
            categoriaNombre: this.selectedCategoria?.nombre || '',
            clienteId: this.selectedCliente?.id || '',
            clienteNombre: this.selectedCliente?.nombre || '',
            personaId: this.selectedPersona?.id || '',
            personaNombre: this.selectedPersona?.nombre || '',
            cuentaId: this.selectedCuenta.id,
            cuentaNombre: this.selectedCuenta.nombre,
            formaPagoId: this.selectedFormaPago.id,
            formaPagoNombre: this.selectedFormaPago.nombre,
            fecha: typeof this.formData.fecha === 'string' ? this.formData.fecha : new Date(this.formData.fecha!).toISOString().split('T')[0]
        };
        this.save.emit(ingresoToSave);
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
