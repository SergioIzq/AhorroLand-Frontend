import { Component, inject, input, output, effect, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { DrawerModule } from 'primeng/drawer';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

// Modelos
import { GastoProgramado } from '@/core/models/gasto-programado.model';
import { Proveedor } from '@/core/models/proveedor.model';
import { Persona } from '@/core/models/persona.model';
import { Concepto } from '@/core/models/concepto.model';
import { Categoria } from '@/core/models/categoria.model';
import { FormaPago } from '@/core/models/forma-pago.model';
import { Cuenta } from '@/core/models/cuenta.model';

// Componentes compartidos
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

// Interfaz para el formulario: Omitimos fechaEjecucion original (string) para usar Date
interface GastoProgramadoFormData extends Omit<Partial<GastoProgramado>, 'fechaEjecucion'> {
    fechaEjecucion?: Date | null;
}

@Component({
    selector: 'app-gasto-programado-form-modal',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DrawerModule,
        SelectModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        TextareaModule,
        DatePickerModule,
        AutoCompleteModule,
        ToggleSwitchModule,
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
                    <span class="font-bold text-xl text-900">{{ isEditMode() ? 'Editar Gasto Programado' : 'Nuevo Gasto Programado' }}</span>
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
                        inputStyleClass="text-right font-bold text-xl text-red-600"
                        class="w-full"
                        styleClass="w-full"
                    />
                    @if (submitted() && !formData.importe) {
                        <small class="text-red-500 block mt-1">Requerido.</small>
                    }
                </div>

                <div class="col-span-12 md:col-span-6 field">
                    <label for="fechaEjecucion" class="font-semibold text-gray-700 block mb-2">Fecha y Hora de Ejecución *</label>
                    <p-datePicker 
                        [(ngModel)]="formData.fechaEjecucion" 
                        dateFormat="dd/mm/yy" 
                        [showIcon]="true" 
                        [showTime]="true" 
                        hourFormat="24" 
                        appendTo="body" 
                        styleClass="w-full" 
                        class="w-full" 
                    />
                    @if (!formData.fechaEjecucion) {
                        <small class="text-gray-500">Fecha y hora en la que se generará el movimiento.</small>
                    }
                </div>

                <div class="col-span-12 mt-4">
                    <h5 class="text-xs font-bold text-500 uppercase tracking-wider border-b border-gray-200 pb-2 mb-2">Configuración de Recurrencia</h5>
                </div>

                <div class="col-span-12 md:col-span-6 field">
                    <label class="font-medium text-gray-700 block mb-2 text-sm">Frecuencia *</label>
                    <p-select
                        [options]="frecuencias"
                        [(ngModel)]="formData.frecuencia"
                        placeholder="Selecciona frecuencia"
                        class="w-full"
                        styleClass="w-full"
                        [showClear]="true">
                    </p-select>
                    @if (submitted() && !formData.frecuencia) {
                        <small class="text-red-500 block mt-1">Requerida.</small>
                    }
                </div>

                <div class="col-span-12 md:col-span-6 field">
                    <label for="activo" class="font-medium text-gray-700 block mb-2 text-sm">Estado</label>
                    <div class="flex items-center gap-2 h-10">
                        <p-toggleswitch [(ngModel)]="formData.activo" inputId="activo"></p-toggleswitch>
                        <label for="activo" class="text-sm font-medium text-gray-700 cursor-pointer">{{ formData.activo ? 'Activo' : 'Inactivo' }}</label>
                    </div>
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
                    <label class="font-medium text-gray-700 block mb-2 text-sm">Cuenta de Origen *</label>
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
                    <label class="font-medium text-gray-700 block mb-2 text-sm">Proveedor *</label>
                    <div class="flex align-items-center gap-2">
                        <p-autoComplete
                            [(ngModel)]="selectedProveedor"
                            [suggestions]="filteredProveedores()"
                            (completeMethod)="searchProveedores($event)"
                            optionLabel="nombre"
                            [dropdown]="true"
                            placeholder="Buscar proveedor..."
                            [forceSelection]="false"
                            (onSelect)="onProveedorSelect($event)"
                            class="flex-1 w-full"
                            styleClass="w-full"
                        />
                        <button pButton icon="pi pi-plus" [rounded]="true" [text]="true" severity="primary" (click)="openCreateProveedor()"></button>
                    </div>
                    @if (submitted() && !selectedProveedor) {
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

                <div class="col-span-12 field">
                    <label for="descripcion" class="font-medium text-gray-700 block mb-2 text-sm">Descripción / Notas</label>
                    <textarea id="descripcion" pTextarea [(ngModel)]="formData.descripcion" rows="3" class="w-full" placeholder="Añadir detalles adicionales..."></textarea>
                </div>
            </div>

            <ng-template pTemplate="footer">
                <div class="flex justify-end gap-2 border-top-1 surface-border pt-3">
                    <p-button label="Cancelar" icon="pi pi-times" [text]="true" [rounded]="true" severity="secondary" (onClick)="onCancel()" />
                    <p-button label="{{ isEditMode() ? 'Actualizar' : 'Guardar' }}" icon="pi pi-check" [rounded]="true" severity="primary" (onClick)="onSave()" />
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
            .p-sidebar { background: #f8f9fa; }
            .p-autocomplete { width: 100%; }
            .p-inputgroup button { flex-shrink: 0; }
            .p-datepicker { width: 100%; }
            /* Asegura que el p-select ocupe el ancho correcto */
            .p-select { width: 100%; }
        }
    `]
})
export class GastoProgramadoFormModalComponent {
    private messageService = inject(MessageService);
    private conceptoStore = inject(ConceptoStore);
    private categoriaStore = inject(CategoriaStore);
    private proveedorStore = inject(ProveedorStore);
    private personaStore = inject(PersonaStore);
    private cuentaStore = inject(CuentaStore);
    private formaPagoStore = inject(FormaPagoStore);

    // Inputs/Outputs
    visible = input<boolean>(false);
    gastoProgramado = input<Partial<GastoProgramado> | null>(null);
    save = output<Partial<GastoProgramado>>();
    cancel = output<void>();

    // Estado
    isVisible = false;
    isEditMode = signal(false);
    submitted = signal(false);
    
    // Inicializamos con un Date para que el datepicker no falle
    formData: GastoProgramadoFormData = { activo: true, fechaEjecucion: new Date() };

    // Opciones estáticas
    frecuencias = [
        { label: 'Diario', value: 'DIARIO' },
        { label: 'Semanal', value: 'SEMANAL' },
        { label: 'Mensual', value: 'MENSUAL' },
        { label: 'Anual', value: 'ANUAL' }
    ];

    // Selectores asíncronos (sin cambios en la lógica)
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

    // Modales inline
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
            const data = this.gastoProgramado();
            if (data) {
                this.loadFormData();
            }
        });
    }

    private loadFormData() {
        const data = this.gastoProgramado();

        if (data?.id) {
            this.isEditMode.set(true);
            this.formData = {
                ...data,
                // Conversión clave: string (ISO) -> Date object para el componente
                fechaEjecucion: data.fechaEjecucion ? new Date(data.fechaEjecucion) : new Date()
            };

            this.selectedConcepto = data.conceptoId && data.conceptoNombre ? { id: data.conceptoId, nombre: data.conceptoNombre } : null;
            this.selectedCategoria = data.categoriaId && data.categoriaNombre ? { id: data.categoriaId, nombre: data.categoriaNombre } : null;
            this.selectedProveedor = data.proveedorId && data.proveedorNombre ? { id: data.proveedorId, nombre: data.proveedorNombre } : null;
            this.selectedPersona = data.personaId && data.personaNombre ? { id: data.personaId, nombre: data.personaNombre } : null;
            this.selectedCuenta = data.cuentaId && data.cuentaNombre ? { id: data.cuentaId, nombre: data.cuentaNombre } : null;
            this.selectedFormaPago = data.formaPagoId && data.formaPagoNombre ? { id: data.formaPagoId, nombre: data.formaPagoNombre } : null;
        } else {
            this.isEditMode.set(false);
            this.formData = {
                importe: 0,
                activo: true,
                frecuencia: 'MENSUAL',
                fechaEjecucion: new Date(), // Fecha actual por defecto
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

    // --- Search Logic (Generic) ---
    private genericSearch(store: any, event: any, signalUpdater: any) {
        const query = event.query;
        if (!query || query.length < 2) {
            store.getRecent(5).then((d: any) => signalUpdater.set(d)).catch(() => signalUpdater.set([]));
        } else {
            store.search(query, 10).then((d: any) => signalUpdater.set(d)).catch(() => signalUpdater.set([]));
        }
    }

    searchConceptos(event: AutoCompleteCompleteEvent) {
        const query = event.query;
        const categoriaId = this.selectedCategoria?.id;
        if (!query || query.length < 2) {
            this.conceptoStore.getRecent(5, categoriaId).then((d: CatalogItem[]) => this.filteredConceptos.set(d)).catch(() => this.filteredConceptos.set([]));
        } else {
            this.conceptoStore.search(query, 10, categoriaId).then((d: CatalogItem[]) => this.filteredConceptos.set(d)).catch(() => this.filteredConceptos.set([]));
        }
    }
    
    searchCategorias(event: AutoCompleteCompleteEvent) { this.genericSearch(this.categoriaStore, event, this.filteredCategorias); }
    searchProveedores(event: AutoCompleteCompleteEvent) { this.genericSearch(this.proveedorStore, event, this.filteredProveedores); }
    searchPersonas(event: AutoCompleteCompleteEvent) { this.genericSearch(this.personaStore, event, this.filteredPersonas); }
    searchCuentas(event: AutoCompleteCompleteEvent) { this.genericSearch(this.cuentaStore, event, this.filteredCuentas); }
    searchFormasPago(event: AutoCompleteCompleteEvent) { this.genericSearch(this.formaPagoStore, event, this.filteredFormasPago); }

    // --- Selecciones ---
    onConceptoSelect(event: any) {
        const value = event.value;
        this.formData.conceptoId = value.id;
        this.formData.conceptoNombre = value.nombre;
        if (value.categoriaId && value.categoriaNombre) {
            const cat = { id: value.categoriaId, nombre: value.categoriaNombre };
            this.selectedCategoria = cat;
            this.formData.categoriaId = cat.id;
            this.formData.categoriaNombre = cat.nombre;
            this.messageService.add({ severity: 'info', summary: 'Info', detail: 'Categoría asignada' });
        }
    }

    onCategoriaSelect(event: any) {
        this.formData.categoriaId = event.id;
        this.formData.categoriaNombre = event.nombre;
        this.selectedConcepto = null;
        this.formData.conceptoId = undefined;
    }

    onProveedorSelect(event: any) { this.formData.proveedorId = event.id; this.formData.proveedorNombre = event.nombre; }
    onPersonaSelect(event: any) { this.formData.personaId = event.id; this.formData.personaNombre = event.nombre; }
    onCuentaSelect(event: any) { this.formData.cuentaId = event.id; this.formData.cuentaNombre = event.nombre; }
    onFormaPagoSelect(event: any) { this.formData.formaPagoId = event.id; this.formData.formaPagoNombre = event.nombre; }

    onConceptoClear() { this.selectedConcepto = null; this.formData.conceptoId = undefined; }
    onCategoriaClear() { this.selectedCategoria = null; this.formData.categoriaId = undefined; }

    openCreateConcepto() { this.showConceptoCreateModal = true; }
    openCreateCategoria() { this.showCategoriaCreateModal = true; }
    openCreateProveedor() { this.showProveedorCreateModal = true; }
    openCreatePersona() { this.showPersonaCreateModal = true; }
    openCreateFormaPago() { this.showFormaPagoCreateModal = true; }
    openCreateCuenta() { this.showCuentaCreateModal = true; }

    onConceptoCreated(nuevo: Concepto) {
        this.showConceptoCreateModal = false;
        this.selectedConcepto = { id: nuevo.id, nombre: nuevo.nombre };
        this.formData.conceptoId = nuevo.id;
        this.formData.conceptoNombre = nuevo.nombre;
    }
    onCategoriaCreated(nuevo: Categoria) {
        this.showCategoriaCreateModal = false;
        this.selectedCategoria = { id: nuevo.id, nombre: nuevo.nombre };
        this.formData.categoriaId = nuevo.id;
        this.formData.categoriaNombre = nuevo.nombre;
    }
    onProveedorCreated(nuevo: Proveedor) { this.showProveedorCreateModal = false; this.selectedProveedor = {id: nuevo.id, nombre: nuevo.nombre}; this.formData.proveedorId = nuevo.id; }
    onPersonaCreated(nuevo: Persona) { this.showPersonaCreateModal = false; this.selectedPersona = {id: nuevo.id, nombre: nuevo.nombre}; this.formData.personaId = nuevo.id; }
    onCuentaCreated(nuevo: Cuenta) { this.showCuentaCreateModal = false; this.selectedCuenta = {id: nuevo.id, nombre: nuevo.nombre}; this.formData.cuentaId = nuevo.id; }
    onFormaPagoCreated(nuevo: FormaPago) { this.showFormaPagoCreateModal = false; this.selectedFormaPago = {id: nuevo.id, nombre: nuevo.nombre}; this.formData.formaPagoId = nuevo.id; }

    getConceptoPlaceholder(): string {
        return this.selectedCategoria ? `Buscar en ${this.selectedCategoria.nombre}...` : 'Buscar concepto...';
    }

    onSave() {
        this.submitted.set(true);

        if (!this.selectedConcepto || !this.formData.importe || !this.formData.frecuencia || 
            !this.selectedCuenta || !this.selectedFormaPago || !this.selectedPersona || !this.selectedProveedor || !this.formData.fechaEjecucion) {
            this.messageService.add({ severity: 'warn', summary: 'Incompleto', detail: 'Revise los campos requeridos (*)' });
            return;
        }

        const toSave: Partial<GastoProgramado> = {
            ...this.formData,
            // IDs y Nombres
            conceptoId: this.selectedConcepto.id,
            conceptoNombre: this.selectedConcepto.nombre,
            categoriaId: this.selectedCategoria?.id,
            categoriaNombre: this.selectedCategoria?.nombre,
            proveedorId: this.selectedProveedor.id,
            proveedorNombre: this.selectedProveedor.nombre,
            personaId: this.selectedPersona.id,
            personaNombre: this.selectedPersona.nombre,
            cuentaId: this.selectedCuenta.id,
            cuentaNombre: this.selectedCuenta.nombre,
            formaPagoId: this.selectedFormaPago.id,
            formaPagoNombre: this.selectedFormaPago.nombre,
            
            // Conversión inversa: Date object -> String (ISO) para el backend
            fechaEjecucion: this.formData.fechaEjecucion instanceof Date 
                ? this.formData.fechaEjecucion.toISOString().split('T')[0] // 'YYYY-MM-DD' o ISO completo según tu back
                : new Date().toISOString()
        };

        this.save.emit(toSave);
        this.closeModal();
    }

    onCancel() { this.cancel.emit(); this.closeModal(); }

    private closeModal() {
        this.isVisible = false;
        this.submitted.set(false);
    }
}