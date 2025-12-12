import { Component, inject, input, output, effect, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConceptoStore } from '../store/concepto.store';
import { CategoriaStore } from '@/features/categorias/store/categoria.store';
import { Categoria } from '@/core/models/categoria.model';
import { Concepto } from '@/core/models/concepto.model';

@Component({
    selector: 'app-concepto-create-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, AutoCompleteModule, ConfirmDialogModule],
    providers: [ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog [(visible)]="isVisible" [style]="{ width: '500px' }" [header]="isEditMode() ? 'Editar Concepto' : 'Crear Nuevo Concepto'" [modal]="true" [contentStyle]="{ padding: '2rem' }" (onHide)="onCancel()" styleClass="p-fluid">
            <ng-template #content>
                <div class="flex flex-col gap-4">
                    <div>
                        <label for="nombre" class="block font-bold mb-3">Nombre del Concepto *</label>
                        <input type="text" pInputText id="nombre" [(ngModel)]="nombre" required autofocus [placeholder]="placeholder()" fluid />
                        <small class="text-red-500" *ngIf="submitted() && !nombre.trim()"> El nombre es requerido. </small>
                    </div>

                    <div>
                        <label for="categoria" class="block font-bold mb-3">
                            Categoría *
                            <span class="font-normal text-sm text-gray-500 ml-2">(Escribe para buscar o crear nueva)</span>
                        </label>
                        <p-autoComplete
                            [(ngModel)]="selectedCategoria"
                            [suggestions]="categoriasSugeridas()"
                            (completeMethod)="searchCategorias($event)"
                            (onFocus)="onCategoriaFocus($event)"
                            (onDropdownClick)="searchCategorias({ query: '' })"
                            [dropdown]="true"
                            optionLabel="nombre"
                            placeholder="Buscar o crear categoría..."
                            [forceSelection]="false"
                            [showEmptyMessage]="true"
                            emptyMessage="No se encontraron categorías"
                            appendTo="body"
                            fluid
                            inputId="categoria"
                        >
                            <ng-template #item let-categoria>
                                <div class="flex items-center gap-2">
                                    <i class="pi pi-tag text-sm"></i>
                                    <span>{{ categoria.nombre }}</span>
                                </div>
                            </ng-template>

                            <ng-template #footer>
                                @if (categoriaSearchTerm() && !categoriaExists()) {
                                    <div class="p-3 border-t">
                                        <p-button label="Crear '{{ categoriaSearchTerm() }}'" icon="pi pi-plus" text size="small" (onClick)="crearNuevaCategoria()" styleClass="w-full justify-start" />
                                    </div>
                                }
                            </ng-template>
                        </p-autoComplete>
                        <small class="text-red-500" *ngIf="submitted() && !selectedCategoria"> La categoría es requerida. </small>
                    </div>

                    @if (errorMessage()) {
                        <small class="text-red-500">{{ errorMessage() }}</small>
                    }
                </div>
            </ng-template>

            <ng-template #footer>
                <p-button label="Cancelar" icon="pi pi-times" text (click)="onCancel()" [disabled]="loading()" />
                <p-button [label]="isEditMode() ? 'Guardar' : 'Crear'" icon="pi pi-check" (click)="onSave()" [loading]="loading()" />
            </ng-template>
        </p-dialog>
        <p-confirmdialog />
    `
})
export class ConceptoCreateModalComponent {
    private messageService = inject(MessageService);
    private conceptoStore = inject(ConceptoStore);
    private categoriaStore = inject(CategoriaStore);
    private confirmationService = inject(ConfirmationService);

    // Inputs/Outputs
    visible = input<boolean>(false);
    concepto = input<Partial<Concepto> | null>(null);
    placeholder = input<string>('Ej: Pago cliente');
    visibleChange = output<boolean>();
    save = output<Partial<Concepto>>();
    created = output<Concepto>();
    cancel = output<void>();

    // Estado del formulario
    nombre: string = '';
    selectedCategoria: Categoria | null = null;
    submitted = signal(false);
    loading = signal(false);
    errorMessage = signal<string>('');

    // Estado de categorías
    categoriasSugeridas = signal<Categoria[]>([]);
    categoriaSearchTerm = signal<string>('');  
    categoriasRecientes = signal<Categoria[]>([]);
    isEditMode = signal(false);

    isVisible = false;

    constructor() {
        // Sincronizar visible con isVisible interno
        effect(() => {
            this.isVisible = this.visible();

            // Limpiar formulario cuando se abre
            if (this.visible()) {
                const conceptoData = this.concepto();
                if (conceptoData && conceptoData.id) {
                    // Modo edición
                    this.isEditMode.set(true);
                    this.loadConceptoData(conceptoData);
                } else {
                    // Modo creación
                    this.isEditMode.set(false);
                    this.resetForm();
                }

                // Cargar categorías recientes al abrir
                this.loadCategoriasRecientes();
            }
        });
    }

    private loadConceptoData(concepto: Partial<Concepto>) {
        this.nombre = concepto.nombre || '';
        
        // Cargar categoría seleccionada
        if (concepto.categoriaId) {
            const categorias = this.categoriaStore.categorias();
            this.selectedCategoria = categorias.find(c => c.id === concepto.categoriaId) || null;
        }
        
        this.submitted.set(false);
        this.loading.set(false);
        this.errorMessage.set('');
        this.categoriaSearchTerm.set('');
    }

    private resetForm() {
        this.nombre = '';
        this.selectedCategoria = null;
        this.submitted.set(false);
        this.loading.set(false);
        this.errorMessage.set('');
        this.categoriaSearchTerm.set('');
    }    private loadCategoriasRecientes() {
        this.categoriaStore.getRecent(5).then((categorias) => {
            this.categoriasRecientes.set(categorias);
            this.categoriasSugeridas.set([...categorias]);
        });
    }

    onCategoriaFocus(event: any) {
        // Cuando se hace foco, mostrar las categorías recientes si no hay búsqueda activa
        if (!this.categoriaSearchTerm() || !this.categoriaSearchTerm().trim()) {
            this.categoriasSugeridas.set(this.categoriasRecientes());
        }
    }

    searchCategorias(event: any) {
        const query = event.query || ''; // Si viene del dropdown click, puede ser undefined o ''
        this.categoriaSearchTerm.set(query);

        // CASO 1: Búsqueda vacía (Dropdown click o foco) -> Mostrar recientes
        if (!query.trim()) {
            if (this.categoriasRecientes().length > 0) {
                // USO DE SPREAD OPERATOR [...] PARA CREAR NUEVA REFERENCIA
                this.categoriasSugeridas.set([...this.categoriasRecientes()]);
            } else {
                this.loadCategoriasRecientes();
            }
            return;
        }

        // CASO 2: Búsqueda con texto -> Llamar a API
        this.categoriaStore
            .search(query, 10)
            .then((categorias) => {
                this.categoriasSugeridas.set(categorias);
            })
            .catch((error) => {
                console.error('Error buscando categorías:', error);
                this.categoriasSugeridas.set([]);
            });
    }

    categoriaExists(): boolean {
        const searchTerm = this.categoriaSearchTerm().toLowerCase().trim();
        return this.categoriasSugeridas().some((cat) => cat.nombre.toLowerCase() === searchTerm);
    }

    crearNuevaCategoria() {
        const nombreCategoria = this.categoriaSearchTerm().trim();
        if (!nombreCategoria) return;

        this.categoriaStore
            .create(nombreCategoria)
            .then((nuevaCategoriaId) => {
                // El backend devuelve el UUID de la categoría recién creada
                const nuevaCategoria: Categoria = {
                    id: nuevaCategoriaId,
                    nombre: nombreCategoria,
                    descripcion: null,
                    fechaCreacion: new Date(),
                    usuarioId: ''
                };

                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: `Categoría "${nombreCategoria}" creada correctamente`,
                    life: 3000
                });

                // Seleccionar automáticamente la categoría recién creada con el ID real
                this.selectedCategoria = nuevaCategoria;

                // Actualizamos las listas con el objeto que tiene el ID real del backend
                this.categoriasSugeridas.set([nuevaCategoria, ...this.categoriasSugeridas()]);
                this.categoriasRecientes.set([nuevaCategoria, ...this.categoriasRecientes()]);

                this.categoriaSearchTerm.set('');
            })
            .catch((error) => {
                console.error('Error creando categoría:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: error.message || 'Error al crear la categoría',
                    life: 5000
                });
            });
    }

    onSave() {
        this.submitted.set(true);
        this.errorMessage.set('');

        if (!this.nombre.trim()) {
            return;
        }

        if (!this.selectedCategoria) {
            return;
        }

        const conceptoData: Partial<Concepto> = {
            nombre: this.nombre.trim(),
            categoriaId: this.selectedCategoria.id
        };

        if (this.isEditMode()) {
            conceptoData.id = this.concepto()?.id;
        }

        const action = this.isEditMode() ? 'actualizar' : 'crear';
        const actionPast = this.isEditMode() ? 'actualizado' : 'creado';

        this.confirmationService.confirm({
            message: `¿Está seguro que desea ${action} el concepto "${this.nombre.trim()}" con la categoría "${this.selectedCategoria.nombre}"?`,
            header: `Confirmar ${this.isEditMode() ? 'Actualización' : 'Creación'}`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: `Sí, ${action}`,
            rejectLabel: 'Cancelar',
            accept: () => {
                this.save.emit(conceptoData);
                this.closeModal();
            }
        });
    }

    onCancel() {
        this.cancel.emit();
        this.closeModal();
    }

    private closeModal() {
        this.isVisible = false;
        this.visibleChange.emit(false);
        this.resetForm();
    }
}
