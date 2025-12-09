import { Component, inject, input, output, effect, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageService } from 'primeng/api';
import { Cuenta } from '@/core/models/cuenta.model';

@Component({
    selector: 'app-cuenta-form-modal',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog 
            [(visible)]="isVisible" 
            [style]="{ width: '450px' }" 
            [header]="isEditMode() ? 'Editar Cuenta' : 'Nueva Cuenta'" 
            [modal]="true" 
            [contentStyle]="{ padding: '2rem' }" 
            (onHide)="onCancel()" 
            styleClass="p-fluid">
            <ng-template #content>
                <div class="flex flex-col gap-4">
                    <div>
                        <label for="nombre" class="block font-bold mb-3">Nombre de la Cuenta *</label>
                        <input 
                            type="text" 
                            pInputText 
                            id="nombre" 
                            [(ngModel)]="formData.nombre" 
                            required 
                            autofocus 
                            placeholder="Ej: Cuenta Corriente" 
                            fluid />
                        @if (submitted() && !formData.nombre?.trim()) {
                            <small class="text-red-500"> El nombre es requerido. </small>
                        }
                    </div>
                </div>
            </ng-template>

            <ng-template #footer>
                <p-button label="Cancelar" icon="pi pi-times" text (click)="onCancel()" />
                <p-button label="Guardar" icon="pi pi-check" (click)="onSave()" />
            </ng-template>
        </p-dialog>
    `
})
export class CuentaFormModalComponent {
    private messageService = inject(MessageService);

    // Inputs/Outputs
    visible = input<boolean>(false);
    cuenta = input<Partial<Cuenta> | null>(null);
    visibleChange = output<boolean>();
    save = output<Partial<Cuenta>>();
    cancel = output<void>();

    // Estado del formulario
    formData: Partial<Cuenta> = {};
    submitted = signal(false);

    isVisible = false;
    isEditMode = signal(false);

    constructor() {
        // Sincronizar visible con isVisible interno
        effect(() => {
            this.isVisible = this.visible();
        });

        // Cargar datos cuando cambia la cuenta
        effect(() => {
            const cuentaData = this.cuenta();
            if (cuentaData) {
                this.loadFormData();
            }
        });
    }

    private loadFormData() {
        const cuentaData = this.cuenta();

        if (cuentaData?.id) {
            // Modo edición
            this.isEditMode.set(true);
            this.formData = { ...cuentaData };
        } else {
            // Modo creación
            this.isEditMode.set(false);
            this.formData = {
                nombre: '',
            };
        }

        this.submitted.set(false);
    }

    onSave() {
        this.submitted.set(true);

        // Validaciones
        if (!this.formData.nombre?.trim()) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Por favor complete todos los campos requeridos'
            });
            return;
        }

        this.save.emit(this.formData);
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
