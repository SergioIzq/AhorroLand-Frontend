import { Component, input, output, signal, ChangeDetectionStrategy, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { Persona } from '@/core/models/persona.model';
import { PersonaStore } from '@/features/personas/store/persona.store';

@Component({
    selector: 'app-persona-create-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, ConfirmDialogModule],
    providers: [ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog [(visible)]="isVisible" [style]="{ width: '450px' }" header="Crear Nueva Persona" [modal]="true" [contentStyle]="{ padding: '2rem' }" styleClass="p-fluid" (onHide)="onCancel()">
            <ng-template #content>
                <div class="flex flex-col gap-4">
                    <div>
                        <label for="nombre" class="block font-bold mb-3">Nombre de Persona *</label>
                        <input pInputText id="nombre" [(ngModel)]="nombre" placeholder="Ej: Juan Pérez" [maxlength]="100" fluid autofocus />
                        @if (submitted() && !nombre) {
                            <small class="text-red-500"> El nombre es requerido. </small>
                        }
                    </div>
                </div>
            </ng-template>

            <ng-template #footer>
                <p-button label="Cancelar" icon="pi pi-times" text (click)="onCancel()" [disabled]="isCreating()" />
                <p-button label="Crear" icon="pi pi-check" (click)="onCreate()" [loading]="isCreating()" />
            </ng-template>
        </p-dialog>
        <p-confirmdialog />
    `
})
export class PersonaCreateModalComponent {
    private personaStore = inject(PersonaStore);
    private confirmationService = inject(ConfirmationService);

    // Inputs/Outputs
    visible = input<boolean>(false);
    visibleChange = output<boolean>();
    created = output<Persona>();
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

        this.personaStore
            .create(this.nombre.trim())
            .then((nuevaPersonaId) => {
                // El store devuelve el UUID
                const nuevaPersona: Persona = {
                    id: nuevaPersonaId,
                    nombre: this.nombre.trim(),
                    fechaCreacion: new Date(),
                    usuarioId: ''
                };

                this.created.emit(nuevaPersona);
                this.closeModal();
            })
            .catch((err) => {
                console.error('Error creando persona:', err);
                this.isCreating.set(false);
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
