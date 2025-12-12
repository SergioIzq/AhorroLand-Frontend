import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { AuthStore } from '../../../core/stores/auth.store';
import { AuthWrapperComponent } from '../components/auth-wrapper.component';
import { CommonModule } from '@angular/common';
import { BasePageComponent, BasePageTemplateComponent } from '@/shared/components';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [CommonModule, AuthWrapperComponent, ReactiveFormsModule, ButtonModule, InputTextModule, RouterModule, BasePageTemplateComponent],
    template: `
        <app-base-page-template [loading]="authStore.loading() && !correoSent()" [skeletonType]="'form'">
            <app-auth-wrapper [title]="correoSent() ? '¡Correo Enviado!' : 'Recuperar cuenta'" [subtitle]="correoSent() ? 'Revisa tu bandeja de entrada' : 'Ingresa tu correo para buscar tu cuenta'">
                @if (!correoSent()) {
                    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="w-full md:w-120 animate-fadein">
                        <div class="flex flex-col gap-2 mb-6">
                            <label for="correo" class="font-medium text-surface-900 dark:text-surface-0">Correo electrónico</label>
                            <input pInputText id="correo" formControlName="correo" placeholder="tu@correo.com" class="w-full" [ngClass]="{ 'ng-invalid ng-dirty': form.get('correo')?.touched && form.get('correo')?.invalid }" />

                            @if (form.get('correo')?.touched && form.get('correo')?.hasError('required')) {
                                <small class="text-red-500">El correo es obligatorio.</small>
                            }
                            @if (form.get('correo')?.touched && form.get('correo')?.hasError('email')) {
                                <small class="text-red-500">Ingresa un correo válido.</small>
                            }
                        </div>

                        @if (authStore.error()) {
                            <div class="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md text-sm">
                                <i class="pi pi-exclamation-circle mr-2"></i>
                                {{ authStore.error() }}
                            </div>
                        }

                        <p-button label="Enviar Instrucciones" type="submit" styleClass="w-full" [loading]="authStore.loading()" [disabled]="form.invalid"></p-button>

                        <div class="mt-6 text-center">
                            <a [routerLink]="['..', 'login']" class="text-primary hover:underline font-medium cursor-pointer text-sm"> <i class="pi pi-arrow-left mr-1"></i> Volver al inicio de sesión </a>
                        </div>
                    </form>

                } @else {
                    <div class="w-full md:w-120 flex flex-col items-center text-center animate-fadein">
                        <div class="w-24 h-24 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-6">
                            <i class="pi pi-envelope text-primary text-5xl"></i>
                        </div>

                        <p class="text-muted-color mb-8 text-lg">
                            Si el correo <strong>{{ form.get('correo')?.value }}</strong> está registrado, recibirás un enlace para restablecer tu contraseña en unos momentos.
                        </p>

                        <p-button label="Volver al Login" [routerLink]="['..', 'login']" [outlined]="true" styleClass="w-full"></p-button>
                    </div>
                }
            </app-auth-wrapper>
        </app-base-page-template>
    `
})
export class ForgotPasswordPage extends BasePageComponent {
    authStore = inject(AuthStore);
    private fb = inject(FormBuilder);
    
    protected override loadingSignal = this.authStore.loading;
    protected override skeletonType = 'form' as const;
    
    // Controlamos el estado de éxito localmente para cambiar la vista
    correoSent = signal(false);
    
    // No mostrar skeleton si ya se envió el correo
    showSkeleton = computed(() => {
        return this.authStore.loading() && !this.correoSent();
    });    form = this.fb.group({
        correo: ['', [Validators.required, Validators.email]]
    });

    constructor() {
        super();
        // Limpiar errores y toasts anteriores al entrar a esta página
        this.authStore.clearError();
        this.messageService.clear();
    }

    async onSubmit() {
        if (this.form.invalid) return;

        this.authStore.clearError();
        const correo = this.form.get('correo')?.value!;

        try {
            this.authStore.forgotPassword(correo);
            this.correoSent.set(true);
        } catch (error) {
            console.error(error);
        }
    }
}
