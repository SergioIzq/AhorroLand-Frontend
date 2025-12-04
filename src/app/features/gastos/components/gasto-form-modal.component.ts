import { Component, inject, input, output, effect, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { MessageService } from 'primeng/api';
import { Gasto, GastoCreate } from '@/core/models';
import { ConceptoService, ConceptoItem } from '@/core/services/api/concepto.service';
import { CategoriaService, CategoriaItem } from '@/core/services/api/categoria.service';
import { ProveedorService, ProveedorItem } from '@/core/services/api/proveedor.service';
import { PersonaService, PersonaItem } from '@/core/services/api/persona.service';
import { ConceptoCreateModalComponent, CategoriaCreateModalComponent, ProveedorCreateModalComponent, PersonaCreateModalComponent } from '@/shared/components';

interface CatalogItem {
    id: string;
    nombre: string;
}

interface GastoFormData extends Omit<Partial<Gasto>, 'fecha'> {
    fecha?: Date | string; // Permitir Date para p-datepicker
}

@Component({
    selector: 'app-gasto-form-modal',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        TextareaModule,
        DatePickerModule,
        AutoCompleteModule,
        ConceptoCreateModalComponent,
        CategoriaCreateModalComponent,
        ProveedorCreateModalComponent,
        PersonaCreateModalComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog [(visible)]="isVisible" [style]="{ width: '650px' }" [header]="isEditMode() ? 'Editar Gasto' : 'Nuevo Gasto'" [modal]="true" [contentStyle]="{ padding: '2rem' }" (onHide)="onCancel()" styleClass="p-fluid">
            <ng-template #content>
                <div class="flex flex-col gap-6">
                    <!-- Concepto con Autocomplete + Botón crear -->
                    <div>
                        <label for="concepto" class="block font-bold mb-3">Concepto *</label>
                        <div class="flex gap-2">
                            <p-autoComplete
                                [(ngModel)]="selectedConcepto"
                                [suggestions]="filteredConceptos()"
                                (completeMethod)="searchConceptos($event)"
                                optionLabel="nombre"
                                [dropdown]="true"
                                placeholder="Buscar o seleccionar concepto"
                                styleClass="flex-1"
                                [forceSelection]="true"
                                (onSelect)="onConceptoSelect($event)"
                            />
                            <p-button icon="pi pi-plus" [rounded]="true" severity="secondary" [outlined]="true" (click)="openCreateConcepto()" pTooltip="Crear nuevo concepto" />
                        </div>
                        @if (submitted() && !selectedConcepto) {
                            <small class="text-red-500"> El concepto es requerido. </small>
                        }
                    </div>

                    <!-- Categoría con Autocomplete + Botón crear -->
                    <div>
                        <label for="categoria" class="block font-bold mb-3">Categoría</label>
                        <div class="flex gap-2">
                            <p-autoComplete
                                [(ngModel)]="selectedCategoria"
                                [suggestions]="filteredCategorias()"
                                (completeMethod)="searchCategorias($event)"
                                optionLabel="nombre"
                                [dropdown]="true"
                                placeholder="Buscar o seleccionar categoría"
                                styleClass="flex-1"
                                [forceSelection]="false"
                                (onSelect)="onCategoriaSelect($event)"
                            />
                            <p-button icon="pi pi-plus" [rounded]="true" severity="secondary" [outlined]="true" (click)="openCreateCategoria()" pTooltip="Crear nueva categoría" />
                        </div>
                    </div>

                    <!-- Proveedor con Autocomplete + Botón crear -->
                    <div>
                        <label for="proveedor" class="block font-bold mb-3">Proveedor</label>
                        <div class="flex gap-2">
                            <p-autoComplete
                                [(ngModel)]="selectedProveedor"
                                [suggestions]="filteredProveedores()"
                                (completeMethod)="searchProveedores($event)"
                                optionLabel="nombre"
                                [dropdown]="true"
                                placeholder="Buscar o seleccionar proveedor"
                                styleClass="flex-1"
                                [forceSelection]="false"
                                (onSelect)="onProveedorSelect($event)"
                            />
                            <p-button icon="pi pi-plus" [rounded]="true" severity="secondary" [outlined]="true" (click)="openCreateProveedor()" pTooltip="Crear nuevo proveedor" />
                        </div>
                    </div>

                    <!-- Persona con Autocomplete + Botón crear -->
                    <div>
                        <label for="persona" class="block font-bold mb-3">Persona</label>
                        <div class="flex gap-2">
                            <p-autoComplete
                                [(ngModel)]="selectedPersona"
                                [suggestions]="filteredPersonas()"
                                (completeMethod)="searchPersonas($event)"
                                optionLabel="nombre"
                                [dropdown]="true"
                                placeholder="Buscar o seleccionar persona"
                                styleClass="flex-1"
                                [forceSelection]="false"
                                (onSelect)="onPersonaSelect($event)"
                            />
                            <p-button icon="pi pi-plus" [rounded]="true" severity="secondary" [outlined]="true" (click)="openCreatePersona()" pTooltip="Crear nueva persona" />
                        </div>
                    </div>

                    <!-- Importe -->
                    <div>
                        <label for="importe" class="block font-bold mb-3">Importe *</label>
                        <p-inputnumber id="importe" [(ngModel)]="formData.importe" mode="currency" currency="EUR" locale="es-ES" [min]="0" fluid />
                        @if (submitted() && !formData.importe) {
                            <small class="text-red-500"> El importe es requerido. </small>
                        }
                    </div>

                    <!-- Fecha -->
                    <div>
                        <label for="fecha" class="block font-bold mb-3">Fecha *</label>
                        <p-datepicker [(ngModel)]="formData.fecha" dateFormat="dd/mm/yy" iconDisplay="input" fluid />
                    </div>

                    <!-- Descripción -->
                    <div>
                        <label for="descripcion" class="block font-bold mb-3">Descripción</label>
                        <textarea id="descripcion" pTextarea [(ngModel)]="formData.descripcion" rows="3" fluid> </textarea>
                    </div>
                </div>
            </ng-template>

            <ng-template #footer>
                <p-button label="Cancelar" icon="pi pi-times" text (click)="onCancel()" />
                <p-button label="Guardar" icon="pi pi-check" (click)="onSave()" />
            </ng-template>
        </p-dialog>

        <!-- Modales inline para creación rápida -->
        <app-concepto-create-modal [visible]="showConceptoCreateModal" (visibleChange)="showConceptoCreateModal = $event" (created)="onConceptoCreated($event)" (cancel)="showConceptoCreateModal = false" />

        <app-categoria-create-modal [visible]="showCategoriaCreateModal" (visibleChange)="showCategoriaCreateModal = $event" (created)="onCategoriaCreated($event)" (cancel)="showCategoriaCreateModal = false" />

        <app-proveedor-create-modal [visible]="showProveedorCreateModal" (visibleChange)="showProveedorCreateModal = $event" (created)="onProveedorCreated($event)" (cancel)="showProveedorCreateModal = false" />

        <app-persona-create-modal [visible]="showPersonaCreateModal" (visibleChange)="showPersonaCreateModal = $event" (created)="onPersonaCreated($event)" (cancel)="showPersonaCreateModal = false" />
    `,
    styles: [
        `
            :host ::ng-deep {
                .p-autocomplete {
                    width: 100%;
                }
            }
        `
    ]
})
export class GastoFormModalComponent {
    private messageService = inject(MessageService);
    private conceptoService = inject(ConceptoService);
    private categoriaService = inject(CategoriaService);
    private proveedorService = inject(ProveedorService);
    private personaService = inject(PersonaService);

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

    filteredConceptos = signal<CatalogItem[]>([]);
    filteredCategorias = signal<CatalogItem[]>([]);
    filteredProveedores = signal<CatalogItem[]>([]);
    filteredPersonas = signal<CatalogItem[]>([]);

    // Control de modales inline
    showConceptoCreateModal = false;
    showCategoriaCreateModal = false;
    showProveedorCreateModal = false;
    showPersonaCreateModal = false;

    constructor() {
        // Sincronizar visible con isVisible interno
        effect(() => {
            this.isVisible = this.visible();
        });

        // Cargar datos cuando cambia el gasto
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
                // Convertir fecha de string a Date para p-datepicker
                fecha: gastoData.fecha ? new Date(gastoData.fecha) : new Date()
            };

            // Cargar valores seleccionados en autocompletes como objetos completos
            this.selectedConcepto = gastoData.conceptoId && gastoData.conceptoNombre ? { id: gastoData.conceptoId, nombre: gastoData.conceptoNombre } : null;

            this.selectedCategoria = gastoData.categoriaId && gastoData.categoriaNombre ? { id: gastoData.categoriaId, nombre: gastoData.categoriaNombre } : null;

            this.selectedProveedor = gastoData.proveedorId && gastoData.proveedorNombre ? { id: gastoData.proveedorId, nombre: gastoData.proveedorNombre } : null;

            this.selectedPersona = gastoData.personaId && gastoData.personaNombre ? { id: gastoData.personaId, nombre: gastoData.personaNombre } : null;
        } else {
            // Modo creación
            this.isEditMode.set(false);
            this.formData = {
                importe: 0,
                fecha: new Date(), // Date object para p-datepicker
                descripcion: ''
            };
            this.selectedConcepto = null;
            this.selectedCategoria = null;
            this.selectedProveedor = null;
            this.selectedPersona = null;
        }

        this.submitted.set(false);
    }

    // Métodos de búsqueda asíncrona conectados con servicios reales
    searchConceptos(event: AutoCompleteCompleteEvent) {
        const query = event.query;

        if (!query || query.length < 2) {
            // Mostrar conceptos recientes si la búsqueda está vacía
            this.conceptoService.getRecent(5).subscribe({
                next: (conceptos) => this.filteredConceptos.set(conceptos),
                error: (err) => console.error('Error cargando conceptos recientes:', err)
            });
        } else {
            // Buscar conceptos por término
            this.conceptoService.search(query, 10).subscribe({
                next: (conceptos) => this.filteredConceptos.set(conceptos),
                error: (err) => console.error('Error buscando conceptos:', err)
            });
        }
    }

    searchCategorias(event: AutoCompleteCompleteEvent) {
        const query = event.query;

        if (!query || query.length < 2) {
            // Mostrar categorías recientes si la búsqueda está vacía
            this.categoriaService.getRecent(5).subscribe({
                next: (categorias) => this.filteredCategorias.set(categorias),
                error: (err) => console.error('Error cargando categorías recientes:', err)
            });
        } else {
            // Buscar categorías por término
            this.categoriaService.search(query, 10).subscribe({
                next: (categorias) => this.filteredCategorias.set(categorias),
                error: (err) => console.error('Error buscando categorías:', err)
            });
        }
    }

    searchProveedores(event: AutoCompleteCompleteEvent) {
        const query = event.query;

        if (!query || query.length < 2) {
            // Mostrar proveedores recientes si la búsqueda está vacía
            this.proveedorService.getRecent(5).subscribe({
                next: (proveedores) => this.filteredProveedores.set(proveedores),
                error: (err) => console.error('Error cargando proveedores recientes:', err)
            });
        } else {
            // Buscar proveedores por término
            this.proveedorService.search(query, 10).subscribe({
                next: (proveedores) => this.filteredProveedores.set(proveedores),
                error: (err) => console.error('Error buscando proveedores:', err)
            });
        }
    }

    searchPersonas(event: AutoCompleteCompleteEvent) {
        const query = event.query;

        if (!query || query.length < 2) {
            // Mostrar personas recientes si la búsqueda está vacía
            this.personaService.getRecent(5).subscribe({
                next: (personas) => this.filteredPersonas.set(personas),
                error: (err) => console.error('Error cargando personas recientes:', err)
            });
        } else {
            // Buscar personas por término
            this.personaService.search(query, 10).subscribe({
                next: (personas) => this.filteredPersonas.set(personas),
                error: (err) => console.error('Error buscando personas:', err)
            });
        }
    }

    // Eventos de selección
    onConceptoSelect(event: any) {
        this.formData.conceptoId = event.id;
        this.formData.conceptoNombre = event.nombre;
    }

    onCategoriaSelect(event: any) {
        this.formData.categoriaId = event.id;
        this.formData.categoriaNombre = event.nombre;
    }

    onProveedorSelect(event: any) {
        this.formData.proveedorId = event.id;
        this.formData.proveedorNombre = event.nombre;
    }

    onPersonaSelect(event: any) {
        this.formData.personaId = event.id;
        this.formData.personaNombre = event.nombre;
    }

    // Abrir modales de creación inline
    openCreateConcepto() {
        this.showConceptoCreateModal = true;
    }

    openCreateCategoria() {
        this.showCategoriaCreateModal = true;
    }

    openCreateProveedor() {
        this.showProveedorCreateModal = true;
    }

    openCreatePersona() {
        this.showPersonaCreateModal = true;
    }

    // Handlers cuando se crea un nuevo item
    onConceptoCreated(nuevoConceptoId: string) {
        // El modal de concepto devuelve solo el ID
        // Necesitamos hacer fetch del concepto completo o construirlo con el nombre ingresado
        // Por ahora, marcamos que se debe seleccionar manualmente o refrescar la lista
        this.showConceptoCreateModal = false;
        this.messageService.add({
            severity: 'success',
            summary: 'Concepto creado',
            detail: 'Concepto creado exitosamente. Por favor seléccionelo de la lista.'
        });
    }

    onCategoriaCreated(nuevaCategoria: CategoriaItem) {
        // Seleccionar automáticamente la categoría recién creada
        this.selectedCategoria = nuevaCategoria;
        this.formData.categoriaId = nuevaCategoria.id;
        this.formData.categoriaNombre = nuevaCategoria.nombre;
        this.showCategoriaCreateModal = false;
    }

    onProveedorCreated(nuevoProveedor: ProveedorItem) {
        // Seleccionar automáticamente el proveedor recién creado
        this.selectedProveedor = nuevoProveedor;
        this.formData.proveedorId = nuevoProveedor.id;
        this.formData.proveedorNombre = nuevoProveedor.nombre;
        this.showProveedorCreateModal = false;
    }

    onPersonaCreated(nuevaPersonaId: string) {
        // El modal de persona devuelve solo el ID
        this.showPersonaCreateModal = false;
        this.messageService.add({
            severity: 'success',
            summary: 'Persona creada',
            detail: 'Persona creada exitosamente. Por favor seléccionela de la lista.'
        });
    }

    onSave() {
        this.submitted.set(true);

        // Validaciones
        if (!this.selectedConcepto || !this.formData.importe || this.formData.importe <= 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Por favor complete los campos requeridos'
            });
            return;
        }

        // Preparar datos para guardar
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
            fecha: typeof this.formData.fecha === 'string' ? this.formData.fecha : new Date(this.formData.fecha!).toISOString().split('T')[0]
        };

        this.save.emit(gastoToSave);
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
