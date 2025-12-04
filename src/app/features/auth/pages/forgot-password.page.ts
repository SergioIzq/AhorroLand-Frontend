import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { AuthStore } from '../../../core/stores/auth.store'; // Asegúrate de la ruta
import { AuthWrapperComponent } from '../components/auth-wrapper.component';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [
        CommonModule,
        AuthWrapperComponent,
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        RouterModule
    ],
    template: `
        <app-auth-wrapper 
            [title]="emailSent() ? '¡Correo Enviado!' : 'Recuperar Cuenta'" 
            [subtitle]="emailSent() ? 'Revisa tu bandeja de entrada' : 'Ingresa tu correo para buscar tu cuenta'">

            @if (!emailSent()) {
                <form [formGroup]="form" (ngSubmit)="onSubmit()" class="w-full md:w-120 animate-fadein">
                    
                    <div class="flex flex-col gap-2 mb-6">
                        <label for="email" class="font-medium text-surface-900 dark:text-surface-0">Correo Electrónico</label>
                        <input 
                            pInputText 
                            id="email" 
                            formControlName="email" 
                            placeholder="tu@email.com" 
                            class="w-full" 
                            [ngClass]="{'ng-invalid ng-dirty': form.get('email')?.touched && form.get('email')?.invalid}" />
                        
                        @if (form.get('email')?.touched && form.get('email')?.hasError('required')) {
                            <small class="text-red-500">El correo es obligatorio.</small>
                        }
                        @if (form.get('email')?.touched && form.get('email')?.hasError('email')) {
                            <small class="text-red-500">Ingresa un correo válido.</small>
                        }
                    </div>

                    @if (authStore.error()) {
                        <div class="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md text-sm">
                            <i class="pi pi-exclamation-circle mr-2"></i>
                            {{ authStore.error() }}
                        </div>
                    }

                    <p-button 
                        label="Enviar Instrucciones" 
                        type="submit" 
                        styleClass="w-full" 
                        [loading]="authStore.loading()"
                        [disabled]="form.invalid"></p-button>
                    
                    <div class="mt-6 text-center">
                        <a routerLink="/auth/login" class="text-primary hover:underline font-medium cursor-pointer text-sm">
                            <i class="pi pi-arrow-left mr-1"></i> Volver al inicio de sesión
                        </a>
                    </div>
                </form>
            }

            @else {
                <div class="w-full md:w-120 flex flex-col items-center text-center animate-fadein">
                    <div class="w-24 h-24 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-6">
                        <i class="pi pi-envelope text-primary text-5xl"></i>
                    </div>

                    <p class="text-muted-color mb-8 text-lg">
                        Si el correo <strong>{{ form.get('email')?.value }}</strong> está registrado, recibirás un enlace para restablecer tu contraseña en unos momentos.
                    </p>

                    <p-button 
                        label="Volver al Login" 
                        routerLink="/auth/login" 
                        [outlined]="true"
                        styleClass="w-full"></p-button>
                </div>
            }

        </app-auth-wrapper>
    `
})
export class ForgotPasswordPage {
    authStore = inject(AuthStore);
    private fb = inject(FormBuilder);
    private messageService = inject(MessageService);
    
    // Controlamos el estado de éxito localmente para cambiar la vista
    emailSent = signal(false);

    form = this.fb.group({
        email: ['', [Validators.required, Validators.email]]
    });

    constructor() {
        // Limpiar errores y toasts anteriores al entrar a esta página
        this.authStore.clearError();
        this.messageService.clear();
    }

    async onSubmit() {
        if (this.form.invalid) return;

        this.authStore.clearError();
        const email = this.form.get('email')?.value!;

        try {
            this.authStore.forgotPassword(email);
            this.emailSent.set(true);
        } catch (error) {
            console.error(error);
        }
    }
}