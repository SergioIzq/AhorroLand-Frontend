import { Component, input, output, signal, ChangeDetectionStrategy, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PersonaService, PersonaItem } from '@/core/services/api/persona.service';

@Component({
    selector: 'app-persona-create-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, ConfirmDialogModule],
    providers: [ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog
            [(visible)]="isVisible"
            [style]="{ width: '450px' }"
            header="Crear Nueva Persona"
            [modal]="true"
            [contentStyle]="{ padding: '2rem' }"
            styleClass="p-fluid"
            (onHide)="onCancel()"
        >
            <ng-template #content>
                <div class="flex flex-col gap-4">
                    <div>
                        <label for="nombre" class="block font-bold mb-3">Nombre de Persona *</label>
                        <input
                            pInputText
                            id="nombre"
                            [(ngModel)]="nombre"
                            placeholder="Ej: Juan Pérez"
                            [maxlength]="100"
                            fluid
                            autofocus
                        />
                        <small class="text-red-500" *ngIf="submitted() && !nombre">
                            El nombre es requerido.
                        </small>
                    </div>
                </div>
            </ng-template>

            <ng-template #footer>
                <p-button label="Cancelar" icon="pi pi-times" text (click)="onCancel()" [disabled]="isCreating()" />
                <p-button
                    label="Crear"
                    icon="pi pi-check"
                    (click)="onCreate()"
                    [loading]="isCreating()"
                />
            </ng-template>
        </p-dialog>
        <p-confirmdialog />
    `,
})
export class PersonaCreateModalComponent {
    private personaService = inject(PersonaService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    // Inputs/Outputs
    visible = input<boolean>(false);
    visibleChange = output<boolean>();
    created = output<string>();
    cancel = output<void>();

    // Estado del formulario
    nombre = '';
    submitted = signal(false);
    isCreating = signal(false);
    isVisible = false;

    constructor() {
        // Sincronizar visible con isVisible interno
        effect(() => {
            this.isVisible = this.visible();
            if (this.isVisible) {
                this.resetForm();
            }
        });
    }

    onCreate() {
        this.submitted.set(true);

        if (!this.nombre || this.nombre.trim().length === 0) {
            return;
        }

        this.confirmationService.confirm({
            message: `¿Está seguro que desea crear la persona "${this.nombre.trim()}"?`,
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
        this.isCreating.set(true);

        this.personaService.create(this.nombre.trim()).subscribe({
            next: (nuevaPersona) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: `Persona "${this.nombre.trim()}" creada correctamente`,
                    life: 3000
                });
                this.created.emit(nuevaPersona);
                this.closeModal();
            },
            error: (error) => {
                console.error('Error creando persona:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo crear la persona. Intente nuevamente.',
                    life: 3000
                });
                this.isCreating.set(false);
            },
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

    private resetForm() {
        this.nombre = '';
        this.submitted.set(false);
        this.isCreating.set(false);
    }
}
