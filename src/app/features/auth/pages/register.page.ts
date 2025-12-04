import { Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../core/stores/auth.store';
import { AuthWrapperComponent } from '../components/auth-wrapper.component';

@Component({
    selector: 'app-register-page',
    standalone: true,
    imports: [
        CommonModule,
        AuthWrapperComponent,
        ButtonModule, 
        CheckboxModule, 
        InputTextModule, 
        PasswordModule, 
        ReactiveFormsModule, 
        RouterModule, 
        DividerModule
    ],
    template: `
        <app-auth-wrapper 
            title="Crear cuenta" 
            subtitle="Únete a AhorroLand hoy mismo">
            
            @if (showSuccessView()) {
                <div class="w-full md:w-120 flex flex-col items-center text-center animate-fadein">
                    <div class="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-6">
                        <i class="pi pi-envelope text-green-600 dark:text-green-300 text-4xl"></i>
                    </div>
                    <h2 class="text-2xl font-bold mb-4 text-surface-900 dark:text-surface-0">¡Revisa tu correo!</h2>
                    <p class="text-muted-color mb-6">
                        Hemos enviado un enlace de confirmación a <strong>{{ registerForm.get('email')?.value }}</strong>. 
                        Activa tu cuenta para poder iniciar sesión.
                    </p>
                    <p-button label="Ir al Login" routerLink="/auth/login" [outlined]="true" styleClass="w-full"></p-button>
                </div>
            } 
            
            @else {
                <form [formGroup]="registerForm" (ngSubmit)="onRegister()" class="w-full md:w-120">
                    
                    <div class="flex flex-col gap-5">
                        <div>
                            <label for="nombre" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Nombre</label>
                            <input 
                                pInputText 
                                id="nombre" 
                                formControlName="nombre"
                                type="text" 
                                placeholder="Tu nombre" 
                                class="w-full" 
                                [ngClass]="{'ng-invalid ng-dirty': registerForm.get('nombre')?.touched && registerForm.get('nombre')?.invalid}" />
                            @if (registerForm.get('nombre')?.touched && registerForm.get('nombre')?.hasError('required')) {
                                <small class="text-red-500 mt-1 block">El nombre es obligatorio.</small>
                            }
                            @if (registerForm.get('nombre')?.touched && registerForm.get('nombre')?.hasError('minlength')) {
                                <small class="text-red-500 mt-1 block">El nombre debe tener al menos 2 caracteres.</small>
                            }
                        </div>

                        <div>
                            <label for="apellidos" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Apellidos <span class="text-muted-color text-sm">(opcional)</span></label>
                            <input 
                                pInputText 
                                id="apellidos" 
                                formControlName="apellidos"
                                type="text" 
                                placeholder="Tus apellidos" 
                                class="w-full" />
                        </div>

                        <div>
                            <label for="email" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Email</label>
                            <input 
                                pInputText 
                                id="email" 
                                formControlName="email"
                                type="text" 
                                placeholder="tu@email.com" 
                                class="w-full" 
                                [ngClass]="{'ng-invalid ng-dirty': registerForm.get('email')?.touched && registerForm.get('email')?.invalid}" />
                            @if (registerForm.get('email')?.touched && registerForm.get('email')?.hasError('required')) {
                                <small class="text-red-500 mt-1 block">El correo es obligatorio.</small>
                            }
                            @if (registerForm.get('email')?.touched && registerForm.get('email')?.hasError('email')) {
                                <small class="text-red-500 mt-1 block">Ingresa un correo válido.</small>
                            }
                        </div>

                        <div>
                            <label for="password" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Contraseña</label>
                            <p-password
                                id="password"
                                formControlName="password"
                                placeholder="Mínimo 6 caracteres"
                                [toggleMask]="true"
                                styleClass="w-full"
                                [fluid]="true"
                                [feedback]="true"
                                promptLabel="Ingresa una contraseña"
                                weakLabel="Débil"
                                mediumLabel="Regular"
                                strongLabel="Fuerte"></p-password>
                            @if (registerForm.get('password')?.touched && registerForm.get('password')?.hasError('required')) {
                                <small class="text-red-500 mt-1 block">La contraseña es obligatoria.</small>
                            }
                            @if (registerForm.get('password')?.touched && registerForm.get('password')?.hasError('minlength')) {
                                <small class="text-red-500 mt-1 block">La contraseña debe tener al menos 6 caracteres.</small>
                            }
                        </div>

                        <div class="flex items-center mb-2">
                            <p-checkbox 
                                formControlName="termsAccepted"
                                id="terms" 
                                binary="true" 
                                styleClass="mr-2"></p-checkbox>
                            <label for="terms" class="text-surface-900 dark:text-surface-0"> 
                                Acepto los <a class="text-primary font-bold hover:underline cursor-pointer">términos y condiciones</a> 
                            </label>
                        </div>
                        @if (registerForm.get('termsAccepted')?.touched && registerForm.get('termsAccepted')?.hasError('requiredTrue')) {
                            <small class="text-red-500 mt-1 block">Debes aceptar los términos y condiciones.</small>
                        }

                        <p-button 
                            label="Registrarse" 
                            type="submit"
                            styleClass="w-full" 
                            [loading]="authStore.loading()" 
                            [disabled]="registerForm.invalid"></p-button>
                    </div>
                </form>

                <div class="mt-8 text-center">
                    <p-divider align="center" class="my-4">
                        <span class="text-muted-color text-sm">¿Ya tienes cuenta?</span>
                    </p-divider>
                    <a routerLink="/auth/login" class="font-medium text-primary hover:text-primary-600 cursor-pointer transition-colors no-underline">
                        Iniciar sesión aquí
                    </a>
                </div>
            }

        </app-auth-wrapper>
    `
})
export class RegisterPage {
    authStore = inject(AuthStore);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private fb = inject(FormBuilder);
    
    showSuccessView = signal(false);
    private isSubmitting = false;

    registerForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        nombre: ['', [Validators.required, Validators.minLength(2)]],
        apellidos: [''],
        termsAccepted: [false, [Validators.requiredTrue]]
    });

    constructor() {
        // Limpiar errores y toasts anteriores al entrar a esta página
        this.authStore.clearError();
        this.messageService.clear();
        
        // Manejar estado de carga en el formulario
        effect(() => {
            if (this.authStore.loading()) {
                this.registerForm.disable();
            } else {
                this.registerForm.enable();
            }
        });
        
        effect(() => {
            if (this.authStore.user() && !this.authStore.loading()) {
                this.router.navigate(['/']);
            }
        });

        effect(() => {
            const isLoading = this.authStore.loading();
            const error = this.authStore.error();

            if (this.isSubmitting && !isLoading) {
                if (!error) {
                    this.showSuccessView.set(true);
                } 
                this.isSubmitting = false;
            }
        });
    }

    onRegister() {
        if (this.registerForm.invalid) {
            this.registerForm.markAllAsTouched();
            return;
        }
        
        this.isSubmitting = true;
        const { email, password, nombre, apellidos } = this.registerForm.value;
        this.authStore.register({ 
            correo: email!, 
            contrasena: password!,
            nombre: nombre!,
            apellidos: apellidos || undefined
        });
    }
}