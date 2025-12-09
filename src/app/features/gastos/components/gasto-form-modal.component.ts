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
import { Gasto } from '@/core/models';
import { Proveedor } from '@/core/models/proveedor.model';
import { Persona } from '@/core/models/persona.model';
import { Concepto } from '@/core/models/concepto.model';
import { Categoria } from '@/core/models/categoria.model';
import { FormaPago } from '@/core/models/forma-pago.model';
import { Cuenta } from '@/core/models/cuenta.model';

// Componentes de creación rápida
import { 
    CategoriaCreateModalComponent, 
    ProveedorCreateModalComponent, 
    PersonaCreateModalComponent, 
    CuentaCreateModalComponent, 
    FormaPagoCreateModalComponent 
} from '@/shared/components';
import { ConceptoCreateModalComponent } from '@/features/conceptos/components/concepto-create-modal.component';

// Stores
import { ProveedorStore } from '@/features/proveedores/store/proveedor.store';
import { FormaPagoStore } from '@/features/formas-pago/store/forma-pago.store';
import { CuentaStore } from '@/features/cuentas/store/cuenta.store';
import { ConceptoStore } from '@/features/conceptos/store/concepto.store';
import { CategoriaStore } from '@/features/categorias/store/categoria.store';
import { PersonaStore } from '@/features/personas/store/persona.store';

interface CatalogItem {
    id: string;
    nombre: string;
}

interface GastoFormData extends Omit<Partial<Gasto>, 'fecha'> {
    fecha?: Date | string;
}

@Component({
    selector: 'app-gasto-form-modal',
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
        ProveedorCreateModalComponent,
        PersonaCreateModalComponent,
        CuentaCreateModalComponent,
        FormaPagoCreateModalComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-drawer 
            [(visible)]="isVisible" 
            position="right" 
            [style]="{ width: '600px', maxWidth: '100vw' }" 
            [modal]="true" 
            [blockScroll]="true"
            (onHide)="onCancel()" 
            styleClass="p-sidebar-md surface-ground">
            
            <ng-template pTemplate="header">
                <div class="flex align-items-center gap-2">
                    <span class="font-bold text-xl text-900">{{ isEditMode() ? 'Editar Gasto' : 'Nuevo Gasto' }}</span>
                </div>
            </ng-template>

            <div class="flex flex-col gap-5 py-2">
                
                <div class="card surface-card p-4 border-round shadow-1">
                    <div class="flex flex-col gap-4">
                        <div class="field">
                            <label for="concepto" class="font-semibold text-gray-700 block mb-2">Concepto *</label>
                            <div class="p-inputgroup">
                                <p-autoComplete
                                    [(ngModel)]="selectedConcepto"
                                    [placeholder]="getConceptoPlaceholder()"
                                    [suggestions]="filteredConceptos()"
                                    (completeMethod)="searchConceptos($event)"
                                    [showClear]="true"
                                    (onClear)="onConceptoClear()"
                                    optionLabel="nombre"
                                    [dropdown]="true"
                                    class="flex-1"
                                    [forceSelection]="true"
                                    (onSelect)="onConceptoSelect($event)"
                                    inputStyleClass="font-semibold"
                                />
                                <button pButton icon="pi pi-plus" severity="secondary" (click)="openCreateConcepto()" pTooltip="Crear concepto"></button>
                            </div>
                            @if (submitted() && !selectedConcepto) {
                                <small class="text-red-500 block mt-1">El concepto es requerido.</small>
                            }
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="field">
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
                                />
                                @if (submitted() && !formData.importe) {
                                    <small class="text-red-500 block mt-1">Requerido.</small>
                                }
                            </div>
                            <div class="field">
                                <label for="fecha" class="font-semibold text-gray-700 block mb-2">Fecha *</label>
                                <p-datePicker 
                                    [(ngModel)]="formData.fecha" 
                                    dateFormat="dd/mm/yy" 
                                    [showIcon]="true" 
                                    appendTo="body" 
                                    styleClass="w-full" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card surface-card p-4 border-round shadow-1">
                    <h3 class="text-xs font-bold text-500 uppercase tracking-wider mb-4 border-bottom-1 surface-border pb-2">Clasificación Financiera</h3>
                    
                    <div class="flex flex-col gap-4">
                        <div class="field">
                            <label class="font-medium text-gray-700 block mb-2 text-sm">Categoría</label>
                            <div class="p-inputgroup">
                                <p-autoComplete
                                    [(ngModel)]="selectedCategoria"
                                    [suggestions]="filteredCategorias()"
                                    (completeMethod)="searchCategorias($event)"
                                    [showClear]="true"
                                    (onClear)="onCategoriaClear()"
                                    optionLabel="nombre"
                                    [dropdown]="true"
                                    placeholder="Seleccionar categoría..."
                                    [forceSelection]="false"
                                    (onSelect)="onCategoriaSelect($event)"
                                />
                                <button pButton icon="pi pi-plus" severity="secondary" (click)="openCreateCategoria()"></button>
                            </div>
                            @if (submitted() && !selectedCategoria) {
                                <small class="text-red-500 block mt-1">Requerida.</small>
                            }
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="field">
                                <label class="font-medium text-gray-700 block mb-2 text-sm">Cuenta *</label>
                                <div class="p-inputgroup">
                                    <p-autoComplete
                                        [(ngModel)]="selectedCuenta"
                                        [suggestions]="filteredCuentas()"
                                        (completeMethod)="searchCuentas($event)"
                                        optionLabel="nombre"
                                        [dropdown]="true"
                                        placeholder="Seleccionar..."
                                        [forceSelection]="true"
                                        (onSelect)="onCuentaSelect($event)"
                                    />
                                    <button pButton icon="pi pi-plus" severity="secondary" (click)="openCreateCuenta()"></button>
                                </div>
                                @if (submitted() && !selectedCuenta) {
                                    <small class="text-red-500 block mt-1">Requerida.</small>
                                }
                            </div>

                            <div class="field">
                                <label class="font-medium text-gray-700 block mb-2 text-sm">Forma de Pago *</label>
                                <div class="p-inputgroup">
                                    <p-autoComplete
                                        [(ngModel)]="selectedFormaPago"
                                        [suggestions]="filteredFormasPago()"
                                        (completeMethod)="searchFormasPago($event)"
                                        optionLabel="nombre"
                                        [dropdown]="true"
                                        placeholder="Seleccionar..."
                                        [forceSelection]="true"
                                        (onSelect)="onFormaPagoSelect($event)"
                                    />
                                    <button pButton icon="pi pi-plus" severity="secondary" (click)="openCreateFormaPago()"></button>
                                </div>
                                @if (submitted() && !selectedFormaPago) {
                                    <small class="text-red-500 block mt-1">Requerida.</small>
                                }
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card surface-card p-4 border-round shadow-1">
                    <h3 class="text-xs font-bold text-500 uppercase tracking-wider mb-4 border-bottom-1 surface-border pb-2">Terceros</h3>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div class="field">
                            <label class="font-medium text-gray-700 block mb-2 text-sm">Proveedor *</label>
                            <div class="p-inputgroup">
                                <p-autoComplete
                                    [(ngModel)]="selectedProveedor"
                                    [suggestions]="filteredProveedores()"
                                    (completeMethod)="searchProveedores($event)"
                                    optionLabel="nombre"
                                    [dropdown]="true"
                                    placeholder="Buscar proveedor..."
                                    [forceSelection]="false"
                                    (onSelect)="onProveedorSelect($event)"
                                />
                                <button pButton icon="pi pi-plus" severity="secondary" (click)="openCreateProveedor()"></button>
                            </div>
                            @if (submitted() && !selectedProveedor) {
                                <small class="text-red-500 block mt-1">Requerido.</small>
                            }
                        </div>

                        <div class="field">
                            <label class="font-medium text-gray-700 block mb-2 text-sm">Persona *</label>
                            <div class="p-inputgroup">
                                <p-autoComplete
                                    [(ngModel)]="selectedPersona"
                                    [suggestions]="filteredPersonas()"
                                    (completeMethod)="searchPersonas($event)"
                                    optionLabel="nombre"
                                    [dropdown]="true"
                                    placeholder="Buscar persona..."
                                    [forceSelection]="false"
                                    (onSelect)="onPersonaSelect($event)"
                                />
                                <button pButton icon="pi pi-plus" severity="secondary" (click)="openCreatePersona()"></button>
                            </div>
                            @if (submitted() && !selectedPersona) {
                                <small class="text-red-500 block mt-1">Requerida.</small>
                            }
                        </div>
                    </div>
                </div>

                <div class="card surface-card p-4 border-round shadow-1">
                    <div class="field">
                        <label for="descripcion" class="font-semibold text-gray-700 block mb-2">Descripción / Notas</label>
                        <textarea id="descripcion" pTextarea [(ngModel)]="formData.descripcion" rows="3" class="w-full" placeholder="Añadir detalles adicionales..."></textarea>
                    </div>
                </div>

            </div>

            <ng-template pTemplate="footer">
                <div class="flex justify-end gap-2 p-3 surface-border border-top-1">
                    <p-button label="Cancelar" icon="pi pi-times" [text]="true" severity="secondary" (onClick)="onCancel()" />
                    <p-button label="Guardar Gasto" icon="pi pi-check" (onClick)="onSave()" />
                </div>
            </ng-template>
        </p-drawer>

        <app-concepto-create-modal [visible]="showConceptoCreateModal" (visibleChange)="showConceptoCreateModal = $event" (created)="onConceptoCreated($event)" (cancel)="showConceptoCreateModal = false" />
        <app-categoria-create-modal [visible]="showCategoriaCreateModal" (visibleChange)="showCategoriaCreateModal = $event" (created)="onCategoriaCreated($event)" (cancel)="showCategoriaCreateModal = false" />
        <app-proveedor-create-modal [visible]="showProveedorCreateModal" (visibleChange)="showProveedorCreateModal = $event" (created)="onProveedorCreated($event)" (cancel)="showProveedorCreateModal = false" />
        <app-persona-create-modal [visible]="showPersonaCreateModal" (visibleChange)="showPersonaCreateModal = $event" (created)="onPersonaCreated($event)" (cancel)="showPersonaCreateModal = false" />
        <app-forma-pago-create-modal [visible]="showFormaPagoCreateModal" (visibleChange)="showFormaPagoCreateModal = $event" (created)="onFormaPagoCreated($event)" (cancel)="showFormaPagoCreateModal = false" />
        <app-cuenta-create-modal [visible]="showCuentaCreateModal" (visibleChange)="showCuentaCreateModal = $event" (created)="onCuentaCreated($event)" (cancel)="showCuentaCreateModal = false" />
    `,
    styles: [`
        :host ::ng-deep {
            .p-sidebar {
                background: #f8f9fa; /* Fondo gris claro para el sidebar */
            }
            .p-autocomplete {
                width: 100%;
            }
            .p-inputgroup button {
                flex-shrink: 0;
            }
            /* Asegurar que el calendario ocupe todo el ancho */
            .p-datepicker {
                width: 100%;
            }
        }
    `]
})
export class GastoFormModalComponent {
    private messageService = inject(MessageService);
    private conceptoStore = inject(ConceptoStore);
    private categoriaStore = inject(CategoriaStore);
    private proveedorStore = inject(ProveedorStore);
    private personaStore = inject(PersonaStore);
    private cuentaStore = inject(CuentaStore);
    private formaPagoStore = inject(FormaPagoStore);

    // Inputs/Outputs
    visible = input<boolean>(false);
    gasto = input<Partial<Gasto> | null>(null);
    visibleChange = output<boolean>();
    save = output<Partial<Gasto>>();
    cancel = output<void>();

    // Estado del formulario
    formData: GastoFormData = {};
    submitted = signal(false);

    // Selectores asíncronos
    selectedConcepto: CatalogItem | null = null;
    selectedCategoria: CatalogItem | null = null;
    selectedProveedor: CatalogItem | null = null;
    selectedPersona: CatalogItem | null = null;
    selectedCuenta: CatalogItem | null = null;
    selectedFormaPago: CatalogItem | null = null;

    filteredConceptos = signal<CatalogItem[]>([]);
    filteredCategorias = signal<CatalogItem[]>([]);
    filteredProveedores = signal<CatalogItem[]>([]);
    filteredPersonas = signal<CatalogItem[]>([]);
    filteredCuentas = signal<CatalogItem[]>([]);
    filteredFormasPago = signal<CatalogItem[]>([]);

    // Control de modales inline
    showConceptoCreateModal = false;
    showCategoriaCreateModal = false;
    showProveedorCreateModal = false;
    showPersonaCreateModal = false;
    showFormaPagoCreateModal = false;
    showCuentaCreateModal = false;

    constructor() {
        effect(() => {
            this.isVisible = this.visible();
        });

        effect(() => {
            const gastoData = this.gasto();
            if (gastoData) {
                this.loadFormData();
            }
        });
    }

    isVisible = false;
    isEditMode = signal(false);

    private loadFormData() {
        const gastoData = this.gasto();

        if (gastoData?.id) {
            // Modo edición
            this.isEditMode.set(true);
            this.formData = {
                ...gastoData,
                fecha: gastoData.fecha ? new Date(gastoData.fecha) : new Date()
            };

            this.selectedConcepto = gastoData.conceptoId && gastoData.conceptoNombre ? { id: gastoData.conceptoId, nombre: gastoData.conceptoNombre } : null;
            this.selectedCategoria = gastoData.categoriaId && gastoData.categoriaNombre ? { id: gastoData.categoriaId, nombre: gastoData.categoriaNombre } : null;
            this.selectedProveedor = gastoData.proveedorId && gastoData.proveedorNombre ? { id: gastoData.proveedorId, nombre: gastoData.proveedorNombre } : null;
            this.selectedPersona = gastoData.personaId && gastoData.personaNombre ? { id: gastoData.personaId, nombre: gastoData.personaNombre } : null;
            this.selectedCuenta = gastoData.cuentaId && gastoData.cuentaNombre ? { id: gastoData.cuentaId, nombre: gastoData.cuentaNombre } : null;
            this.selectedFormaPago = gastoData.formaPagoId && gastoData.formaPagoNombre ? { id: gastoData.formaPagoId, nombre: gastoData.formaPagoNombre } : null;
        } else {
            // Modo creación
            this.isEditMode.set(false);
            this.formData = {
                importe: 0,
                fecha: new Date(),
                descripcion: ''
            };
            this.selectedConcepto = null;
            this.selectedCategoria = null;
            this.selectedProveedor = null;
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
            this.conceptoStore.getRecent(5, categoriaId).then((data) => this.filteredConceptos.set(data)).catch(() => this.filteredConceptos.set([]));
        } else {
            this.conceptoStore.search(query, 10, categoriaId).then((data) => this.filteredConceptos.set(data)).catch(() => this.filteredConceptos.set([]));
        }
    }

    searchCategorias(event: AutoCompleteCompleteEvent) {
        const query = event.query;
        if (!query || query.length < 2) {
            this.categoriaStore.getRecent(5).then((data) => this.filteredCategorias.set(data)).catch(() => this.filteredCategorias.set([]));
        } else {
            this.categoriaStore.search(query, 10).then((data) => this.filteredCategorias.set(data)).catch(() => this.filteredCategorias.set([]));
        }
    }

    searchProveedores(event: AutoCompleteCompleteEvent) {
        const query = event.query;
        if (!query || query.length < 2) {
            this.proveedorStore.getRecent(5).then((data) => this.filteredProveedores.set(data)).catch(() => this.filteredProveedores.set([]));
        } else {
            this.proveedorStore.search(query, 10).then((data) => this.filteredProveedores.set(data)).catch(() => this.filteredProveedores.set([]));
        }
    }

    searchPersonas(event: AutoCompleteCompleteEvent) {
        const query = event.query;
        if (!query || query.length < 2) {
            this.personaStore.getRecent(5).then((data) => this.filteredPersonas.set(data)).catch(() => this.filteredPersonas.set([]));
        } else {
            this.personaStore.search(query, 10).then((data) => this.filteredPersonas.set(data)).catch(() => this.filteredPersonas.set([]));
        }
    }

    searchCuentas(event: AutoCompleteCompleteEvent) {
        const query = event.query;
        if (!query || query.length < 2) {
            this.cuentaStore.getRecent(5).then((data) => this.filteredCuentas.set(data)).catch(() => this.filteredCuentas.set([]));
        } else {
            this.cuentaStore.search(query, 10).then((data) => this.filteredCuentas.set(data)).catch(() => this.filteredCuentas.set([]));
        }
    }

    searchFormasPago(event: AutoCompleteCompleteEvent) {
        const query = event.query;
        if (!query || query.length < 2) {
            this.formaPagoStore.getRecent(5).then((data) => this.filteredFormasPago.set(data)).catch(() => this.filteredFormasPago.set([]));
        } else {
            this.formaPagoStore.search(query, 10).then((data) => this.filteredFormasPago.set(data)).catch(() => this.filteredFormasPago.set([]));
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

    onProveedorSelect(event: any) { this.formData.proveedorId = event.id; this.formData.proveedorNombre = event.nombre; }
    onPersonaSelect(event: any) { this.formData.personaId = event.id; this.formData.personaNombre = event.nombre; }
    onCuentaSelect(event: any) { this.formData.cuentaId = event.id; this.formData.cuentaNombre = event.nombre; }
    onFormaPagoSelect(event: any) { this.formData.formaPagoId = event.id; this.formData.formaPagoNombre = event.nombre; }

    onConceptoClear() { this.selectedConcepto = null; this.formData.conceptoId = undefined; this.formData.conceptoNombre = undefined; this.filteredConceptos.set([]); }
    onCategoriaClear() { this.selectedCategoria = null; this.formData.categoriaId = undefined; this.formData.categoriaNombre = undefined; this.filteredConceptos.set([]); }
    onProveedorClear() { this.selectedProveedor = null; this.formData.proveedorId = undefined; this.formData.proveedorNombre = undefined; this.filteredProveedores.set([]); }
    onPersonaClear() { this.selectedPersona = null; this.formData.personaId = undefined; this.formData.personaNombre = undefined; this.filteredPersonas.set([]); }
    onCuentaClear() { this.selectedCuenta = null; this.formData.cuentaId = undefined; this.formData.cuentaNombre = undefined; this.filteredCuentas.set([]); }
    onFormaPagoClear() { this.selectedFormaPago = null; this.formData.formaPagoId = undefined; this.formData.formaPagoNombre = undefined; this.filteredFormasPago.set([]); }

    // --- Apertura de Modales Inline ---
    openCreateConcepto() { this.showConceptoCreateModal = true; }
    openCreateCategoria() { this.showCategoriaCreateModal = true; }
    openCreateProveedor() { this.showProveedorCreateModal = true; }
    openCreatePersona() { this.showPersonaCreateModal = true; }
    openCreateFormaPago() { this.showFormaPagoCreateModal = true; }
    openCreateCuenta() { this.showCuentaCreateModal = true; }

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

    onProveedorCreated(nuevo: Proveedor) {
        this.showProveedorCreateModal = false;
        const item = { id: nuevo.id, nombre: nuevo.nombre };
        this.selectedProveedor = item;
        this.formData.proveedorId = item.id;
        this.formData.proveedorNombre = item.nombre;
        this.filteredProveedores.set([item, ...this.filteredProveedores()]);
        this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Proveedor creado y seleccionado' });
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
        if (!this.selectedConcepto || !this.formData.importe || this.formData.importe <= 0 || !this.selectedCuenta || !this.selectedFormaPago || !this.selectedPersona || !this.selectedProveedor) {
            this.messageService.add({ severity: 'warn', summary: 'Incompleto', detail: 'Por favor complete todos los campos requeridos.' });
            return;
        }

        const gastoToSave: Partial<Gasto> = {
            ...this.formData,
            conceptoId: this.selectedConcepto.id,
            conceptoNombre: this.selectedConcepto.nombre,
            categoriaId: this.selectedCategoria?.id || '',
            categoriaNombre: this.selectedCategoria?.nombre || '',
            proveedorId: this.selectedProveedor?.id || '',
            proveedorNombre: this.selectedProveedor?.nombre || '',
            personaId: this.selectedPersona?.id || '',
            personaNombre: this.selectedPersona?.nombre || '',
            cuentaId: this.selectedCuenta.id,
            cuentaNombre: this.selectedCuenta.nombre,
            formaPagoId: this.selectedFormaPago.id,
            formaPagoNombre: this.selectedFormaPago.nombre,
            fecha: typeof this.formData.fecha === 'string' ? this.formData.fecha : new Date(this.formData.fecha!).toISOString().split('T')[0]
        };
        this.save.emit(gastoToSave);
        this.closeModal();
    }

    onCancel() { this.cancel.emit(); this.closeModal(); }

    private closeModal() {
        this.isVisible = false;
        this.visibleChange.emit(false);
        this.submitted.set(false);
    }
}