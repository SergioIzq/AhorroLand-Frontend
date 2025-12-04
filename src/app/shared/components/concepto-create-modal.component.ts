import { Component, inject, input, output, effect, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConceptoService, ConceptoItem } from '@/core/services/api/concepto.service';
import { CategoriaService, CategoriaItem } from '@/core/services/api/categoria.service';

@Component({
    selector: 'app-concepto-create-modal',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        AutoCompleteModule,
        ConfirmDialogModule
    ],
    providers: [ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog 
            [(visible)]="isVisible" 
            [style]="{ width: '500px' }" 
            header="Crear Nuevo Concepto" 
            [modal]="true"
            [contentStyle]="{ padding: '2rem' }"
            (onHide)="onCancel()"
            styleClass="p-fluid">
            <ng-template #content>
                <div class="flex flex-col gap-4">
                    <div>
                        <label for="nombre" class="block font-bold mb-3">Nombre del Concepto *</label>
                        <input 
                            type="text" 
                            pInputText 
                            id="nombre" 
                            [(ngModel)]="nombre" 
                            required 
                            autofocus 
                            [placeholder]="placeholder()"
                            fluid />
                        <small class="text-red-500" *ngIf="submitted() && !nombre.trim()">
                            El nombre es requerido.
                        </small>
                    </div>

                    <div>
                        <label for="categoria" class="block font-bold mb-3">
                            Categoría *
                            <span class="font-normal text-sm text-gray-500 ml-2">(Escribe para buscar o crear nueva)</span>
                        </label>
                        <p-autoComplete
                            [(ngModel)]="selectedCategoria"
                            (completeMethod)="searchCategorias($event)"
                            field="nombre"
                            placeholder="Buscar o crear categoría..."
                            [dropdown]="false"
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
                                        <p-button 
                                            label="Crear '{{ categoriaSearchTerm() }}'" 
                                            icon="pi pi-plus" 
                                            text
                                            size="small"
                                            (onClick)="crearNuevaCategoria()"
                                            styleClass="w-full justify-start" />
                                    </div>
                                }
                            </ng-template>
                        </p-autoComplete>
                        <small class="text-red-500" *ngIf="submitted() && !selectedCategoria">
                            La categoría es requerida.
                        </small>
                    </div>

                    @if (errorMessage()) {
                        <small class="text-red-500">{{ errorMessage() }}</small>
                    }
                </div>
            </ng-template>

            <ng-template #footer>
                <p-button 
                    label="Cancelar" 
                    icon="pi pi-times" 
                    text 
                    (click)="onCancel()"
                    [disabled]="loading()" />
                <p-button 
                    label="Crear" 
                    icon="pi pi-check" 
                    (click)="onCreate()"
                    [loading]="loading()" />
            </ng-template>
        </p-dialog>
        <p-confirmdialog />
    `
})
export class ConceptoCreateModalComponent {
    private messageService = inject(MessageService);
    private conceptoService = inject(ConceptoService);
    private categoriaService = inject(CategoriaService);
    private confirmationService = inject(ConfirmationService);

    // Inputs/Outputs
    visible = input<boolean>(false);
    placeholder = input<string>('Ej: Pago cliente');
    visibleChange = output<boolean>();
    created = output<string>();
    cancel = output<void>();

    // Estado del formulario
    nombre: string = '';
    selectedCategoria: CategoriaItem | null = null;
    submitted = signal(false);
    loading = signal(false);
    errorMessage = signal<string>('');

    // Estado de categorías
    categoriasSugeridas = signal<CategoriaItem[]>([]);
    categoriaSearchTerm = signal<string>('');
    categoriasRecientes = signal<CategoriaItem[]>([]);

    isVisible = false;

    constructor() {
        // Sincronizar visible con isVisible interno
        effect(() => {
            this.isVisible = this.visible();
            
            // Limpiar formulario cuando se abre
            if (this.visible()) {
                this.nombre = '';
                this.selectedCategoria = null;
                this.submitted.set(false);
                this.loading.set(false);
                this.errorMessage.set('');
                this.categoriaSearchTerm.set('');
            }
        });
    }

    searchCategorias(event: any) {
        const query = event.query || '';
        this.categoriaSearchTerm.set(query);

        if (!query.trim()) {
            this.categoriasSugeridas.set(this.categoriasRecientes());
            return;
        }

        this.categoriaService.search(query, 10).subscribe({
            next: (categorias) => {
                this.categoriasSugeridas.set(categorias);
            },
            error: (error) => {
                console.error('Error buscando categorías:', error);
                this.categoriasSugeridas.set([]);
            }
        });
    }

    categoriaExists(): boolean {
        const searchTerm = this.categoriaSearchTerm().toLowerCase().trim();
        return this.categoriasSugeridas().some(
            cat => cat.nombre.toLowerCase() === searchTerm
        );
    }

    crearNuevaCategoria() {
        const nombreCategoria = this.categoriaSearchTerm().trim();
        
        if (!nombreCategoria) {
            return;
        }

        this.categoriaService.create(nombreCategoria).subscribe({
            next: (nuevaCategoria) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: `Categoría "${nuevaCategoria.nombre}" creada correctamente`,
                    life: 3000
                });
                
                this.selectedCategoria = nuevaCategoria;
                this.categoriasSugeridas.set([nuevaCategoria, ...this.categoriasSugeridas()]);
                this.categoriaSearchTerm.set('');
            },
            error: (error) => {
                console.error('Error creando categoría:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: error.error?.message || 'Error al crear la categoría',
                    life: 5000
                });
            }
        });
    }

    onCreate() {
        this.submitted.set(true);
        this.errorMessage.set('');

        if (!this.nombre.trim()) {
            return;
        }

        if (!this.selectedCategoria) {
            return;
        }

        this.confirmationService.confirm({
            message: `¿Está seguro que desea crear el concepto "${this.nombre.trim()}" con la categoría "${this.selectedCategoria.nombre}"?`,
            header: 'Confirmar Creación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, crear',
            rejectLabel: 'Cancelar',
            accept: () => {
                this.confirmedCreate();
            }
        });
    }

    private confirmedCreate() {
        this.loading.set(true);

        this.conceptoService.create(this.nombre.trim()).subscribe({
            next: (nuevoConcepto) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: `Concepto "${this.nombre.trim()}" creado correctamente`,
                    life: 3000
                });
                
                this.created.emit(this.nombre.trim());
                this.closeModal();
            },
            error: (error) => {
                console.error('Error creando concepto:', error);
                this.errorMessage.set(error.error?.message || 'Error al crear el concepto');
                this.loading.set(false);
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
        this.nombre = '';
        this.selectedCategoria = null;
        this.submitted.set(false);
        this.loading.set(false);
        this.errorMessage.set('');
        this.categoriaSearchTerm.set('');
    }
}
