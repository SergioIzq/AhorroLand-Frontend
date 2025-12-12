import { Component, inject, input, output, effect, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Categoria } from '@/core/models/categoria.model';

@Component({
    selector: 'app-categoria-form-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog 
            [(visible)]="isVisible" 
            [style]="{ width: '500px' }" 
            [header]="isEditMode() ? 'Editar Categoría' : 'Crear Nueva Categoría'" 
            [modal]="true" 
            [contentStyle]="{ padding: '2rem' }" 
            (onHide)="onCancel()" 
            styleClass="p-fluid"
        >
            <ng-template #content>
                <div class="flex flex-col gap-4">
                    <div>
                        <label for="nombre" class="block font-bold mb-3">Nombre de la Categoría *</label>
                        <input 
                            type="text" 
                            pInputText 
                            id="nombre" 
                            [(ngModel)]="nombre" 
                            required 
                            autofocus 
                            placeholder="Ej: Servicios" 
                            fluid 
                        />
                        <small class="text-red-500" *ngIf="submitted() && !nombre.trim()">
                            El nombre es requerido.
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
                    [disabled]="loading()" 
                />
                <p-button 
                    [label]="isEditMode() ? 'Actualizar' : 'Crear'" 
                    icon="pi pi-check" 
                    (click)="onSave()" 
                    [loading]="loading()" 
                />
            </ng-template>
        </p-dialog>
    `
})
export class CategoriaFormModalComponent {
    // Inputs/Outputs
    visible = input<boolean>(false);
    categoria = input<Partial<Categoria> | null>(null);
    visibleChange = output<boolean>();
    save = output<Partial<Categoria>>();
    cancel = output<void>();

    // Estado del formulario
    nombre: string = '';
    submitted = signal(false);
    loading = signal(false);
    errorMessage = signal<string>('');
    isVisible = false;
    isEditMode = signal(false);

    constructor() {
        effect(() => {
            this.isVisible = this.visible();

            if (this.visible()) {
                const cat = this.categoria();
                if (cat && cat.id) {
                    // Modo edición
                    this.isEditMode.set(true);
                    this.nombre = cat.nombre || '';
                } else {
                    // Modo creación
                    this.isEditMode.set(false);
                    this.nombre = '';
                }
                this.submitted.set(false);
                this.loading.set(false);
                this.errorMessage.set('');
            }
        });
    }

    onSave() {
        this.submitted.set(true);
        this.errorMessage.set('');

        if (!this.nombre.trim()) {
            return;
        }

        const categoriaData: Partial<Categoria> = {
            id: this.categoria()?.id || '',
            nombre: this.nombre.trim()
        };

        this.save.emit(categoriaData);
        this.closeModal();
    }

    onCancel() {
        this.cancel.emit();
        this.closeModal();
    }

    private closeModal() {
        this.isVisible = false;
        this.visibleChange.emit(false);
        this.nombre = '';
        this.submitted.set(false);
        this.loading.set(false);
        this.errorMessage.set('');
        this.isEditMode.set(false);
    }
}
