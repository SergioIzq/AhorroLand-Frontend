import { Component, inject, input, output, effect, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { Cuenta } from '@/core/models/cuenta.model';
import { CuentaStore } from '@/features/cuentas/store/cuenta.store';

@Component({
    selector: 'app-cuenta-create-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, InputNumberModule, ConfirmDialogModule],
    providers: [ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog [(visible)]="isVisible" [style]="{ width: '450px' }" header="Crear Nueva Cuenta" [modal]="true" [contentStyle]="{ padding: '2rem' }" (onHide)="onCancel()" styleClass="p-fluid">
            <ng-template #content>
                <div class="flex flex-col gap-4">
                    <div>
                        <label for="nombre" class="block font-bold mb-3">Nombre de la Cuenta *</label>
                        <input type="text" pInputText id="nombre" [(ngModel)]="nombre" required autofocus placeholder="Ej: Banco Principal" fluid />
                        @if (submitted() && !nombre.trim()) {
                            <small class="text-red-500"> El nombre es requerido. </small>
                        }
                    </div>

                    <div>
                        <label for="saldo" class="block font-bold mb-3">Saldo Inicial *</label>
                        <p-inputnumber id="saldo" [(ngModel)]="saldo" mode="currency" currency="EUR" locale="es-ES" fluid />
                        @if (submitted() && saldo === null) {
                            <small class="text-red-500"> El saldo inicial es requerido. </small>
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
export class CuentaCreateModalComponent {
    private cuentaStore = inject(CuentaStore);
    private confirmationService = inject(ConfirmationService);

    // Inputs/Outputs
    visible = input<boolean>(false);
    visibleChange = output<boolean>();
    created = output<Cuenta>();
    cancel = output<void>();

    // Estado del formulario
    nombre: string = '';
    saldo: number = 0;
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
                this.saldo = 0;
                this.submitted.set(false);
                this.loading.set(false);
                this.errorMessage.set('');
            }
        });
    }

    onCreate() {
        this.submitted.set(true);
        this.errorMessage.set('');

        if (!this.nombre.trim() || this.saldo === null) {
            return;
        }

        this.confirmationService.confirm({
            message: `¿Está seguro que desea crear la cuenta "${this.nombre.trim()}" con saldo inicial de ${this.saldo}€?`,
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

        this.cuentaStore
            .create(this.nombre.trim(), this.saldo)
            .then((nuevaCuentaId) => {
                // El store devuelve el UUID
                const nuevaCuenta: Cuenta = {
                    id: nuevaCuentaId,
                    nombre: this.nombre.trim(),
                    fechaCreacion: new Date(),
                    saldo: this.saldo,
                    usuarioId: ''
                };

                this.created.emit(nuevaCuenta);
                this.closeModal();
            })
            .catch((err) => {
                this.errorMessage.set(err.message || 'Error al crear cuenta');
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
        this.saldo = 0;
        this.submitted.set(false);
        this.loading.set(false);
        this.errorMessage.set('');
    }
}
