import { Component, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { AuthStore } from '../../../core/stores/auth.store';
import { AuthWrapperComponent } from '../components/auth-wrapper.component';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-login-page',
    standalone: true,
    imports: [CommonModule, AuthWrapperComponent, ButtonModule, CheckboxModule, InputTextModule, PasswordModule, ReactiveFormsModule, FormsModule, RouterModule, MessageModule, ToastModule],
    template: `
        <app-auth-wrapper title="Bienvenido a AhorroLand" subtitle="Inicia sesión para continuar">
            @if (authStore.error()) {
                <p-message severity="error" [text]="authStore.error()!" styleClass="mb-4 w-full"></p-message>
            }

            <form [formGroup]="loginForm" (ngSubmit)="onLogin()">
                <div class="mb-6">
                    <label for="email" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Email</label>
                    <input pInputText id="email" formControlName="email" type="text" placeholder="tu@email.com" class="w-full md:w-120" [ngClass]="{ 'ng-invalid ng-dirty': loginForm.get('email')?.touched && loginForm.get('email')?.invalid }" />
                    @if (loginForm.get('email')?.touched && loginForm.get('email')?.hasError('required')) {
                        <small class="text-red-500 mt-1 block">El correo es obligatorio.</small>
                    }
                    @if (loginForm.get('email')?.touched && loginForm.get('email')?.hasError('email')) {
                        <small class="text-red-500 mt-1 block">Ingresa un correo válido.</small>
                    }
                </div>

                <div class="mb-6">
                    <label for="password" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Contraseña</label>
                    <p-password id="password" formControlName="password" placeholder="Contraseña" [toggleMask]="true" styleClass="w-full" [fluid]="true" [feedback]="false"></p-password>
                    @if (loginForm.get('password')?.touched && loginForm.get('password')?.hasError('required')) {
                        <small class="text-red-500 mt-1 block">La contraseña es obligatoria.</small>
                    }
                </div>

                <div class="flex items-center justify-between mt-2 mb-8 gap-8">
                    <div class="flex items-center">
                        <p-checkbox [(ngModel)]="rememberMe" [ngModelOptions]="{ standalone: true }" id="rememberme" binary="true" class="mr-2"></p-checkbox>
                        <label for="rememberme">Recordarme</label>
                    </div>
                    <a routerLink="/auth/forgot-password" class="font-medium ml-2 text-right cursor-pointer text-primary hover:underline"> ¿Olvidaste tu contraseña? </a>
                </div>

                <p-button label="Iniciar Sesión" type="submit" styleClass="w-full" [loading]="authStore.loading()" [disabled]="loginForm.invalid"></p-button>
            </form>

            <div class="mt-6 text-center">
                <div class="mb-4 text-surface-600 dark:text-surface-400 font-medium">
                    ¿No tienes cuenta?
                    <a routerLink="/auth/register" class="text-primary font-medium cursor-pointer hover:underline">Regístrate aquí</a>
                </div>

                <div class="font-medium text-surface-600">
                    ¿Problemas con la verificación?
                    <span class="text-primary font-medium cursor-pointer hover:underline" (click)="onResendConfirmation()"> Reenviar correo de confirmación </span>
                </div>
            </div>
        </app-auth-wrapper>
    `
})
export class LoginPage {
    authStore = inject(AuthStore);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private messageService = inject(MessageService);
    private fb = inject(FormBuilder);

    rememberMe: boolean = false;
    private returnUrl: string = '/';

    loginForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]]
    });

    constructor() {
        this.authStore.clearError();
        this.messageService.clear();
        this.route.queryParams.subscribe((params) => (this.returnUrl = params['returnUrl'] || '/'));

        effect(() => {
            this.authStore.loading() ? this.loginForm.disable() : this.loginForm.enable();
        });
    }

    async onLogin() {
        if (this.loginForm.invalid) return;

        const { email, password } = this.loginForm.value;

        try {
            await this.authStore.login({ correo: email!, contrasena: password! });

            this.messageService.add({
                severity: 'success',
                summary: 'Bienvenido',
                detail: 'Inicio de sesión exitoso'
            });

            this.router.navigateByUrl(this.returnUrl);
        } catch (error) {
            console.error('Login fallido', error);
        }
    }

    onResendConfirmation() {
        const emailControl = this.loginForm.get('email');

        if (!emailControl?.value || emailControl.hasError('email')) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Email requerido',
                detail: 'Por favor, escribe un correo válido en el campo de arriba para reenviarte el enlace.'
            });
            emailControl?.markAsTouched();
            return;
        }

        // Llamada al store
        this.authStore.resendConfirmationEmail(emailControl.value);

        // Feedback inmediato
        this.messageService.add({
            severity: 'success',
            summary: 'Enviando',
            detail: 'Si la cuenta existe, recibirás un nuevo correo en breve.'
        });
    }
}
