import { Component, inject, input, output, effect, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { Cliente } from '@/core/models/cliente.model';
import { ClienteStore } from '@/features/clientes/store/cliente.store';

@Component({
    selector: 'app-cliente-create-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, ConfirmDialogModule],
    providers: [ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog [(visible)]="isVisible" [style]="{ width: '450px' }" header="Crear Nuevo Cliente" [modal]="true" [contentStyle]="{ padding: '2rem' }" (onHide)="onCancel()" styleClass="p-fluid">
            <ng-template #content>
                <div class="flex flex-col gap-4">
                    <div>
                        <label for="nombre" class="block font-bold mb-3">Nombre del Cliente *</label>
                        <input type="text" pInputText id="nombre" [(ngModel)]="nombre" required autofocus placeholder="Ej: Empresa XYZ" fluid />
                        @if (submitted() && !nombre.trim()) {
                            <small class="text-red-500"> El nombre es requerido. </small>
                        }
                    </div>

                    @if (errorMessage()) {
                        <small class="text-red-500">{{ errorMessage() }}</small>
                    }
                </div>
            </ng-template>

            <ng-template #footer>
                <p-button label="Cancelar" icon="pi pi-times" text (click)="onCancel()" [disabled]="loading()" />
                <p-button label="Crear" icon="pi pi-check" (click)="onCreate()" [loading]="loading()" />
            </ng-template>
        </p-dialog>
        <p-confirmdialog />
    `
})
export class ClienteCreateModalComponent {
    private clienteStore = inject(ClienteStore);
    private confirmationService = inject(ConfirmationService);

    // Inputs/Outputs
    visible = input<boolean>(false);
    visibleChange = output<boolean>();
    created = output<Cliente>();
    cancel = output<void>();

    // Estado del formulario
    nombre: string = '';
    submitted = signal(false);
    loading = signal(false);
    errorMessage = signal<string>('');

    isVisible = false;

    constructor() {
        // Sincronizar visible con isVisible interno
        effect(() => {
            this.isVisible = this.visible();

            // Limpiar formulario cuando se abre
            if (this.visible()) {
                this.nombre = '';
                this.submitted.set(false);
                this.loading.set(false);
                this.errorMessage.set('');
            }
        });
    }

    onCreate() {
        this.submitted.set(true);
        this.errorMessage.set('');

        if (!this.nombre.trim()) {
            return;
        }

        this.confirmationService.confirm({
            message: `¿Está seguro que desea crear el cliente "${this.nombre.trim()}"?`,
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

        this.clienteStore
            .create(this.nombre.trim())
            .then((nuevoClienteId) => {
                // El store devuelve el UUID
                const nuevoCliente: Cliente = {
                    id: nuevoClienteId,
                    nombre: this.nombre.trim(),
                    fechaCreacion: new Date(),
                    usuarioId: ''
                };

                this.created.emit(nuevoCliente);
                this.closeModal();
            })
            .catch((err) => {
                this.errorMessage.set(err.message || 'Error al crear cliente');
                this.loading.set(false);
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
        this.submitted.set(false);
        this.loading.set(false);
        this.errorMessage.set('');
    }
}
