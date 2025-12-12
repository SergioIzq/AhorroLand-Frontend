import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { MessageService } from 'primeng/api';
import { AuthStore } from '../../../core/stores/auth.store';
import { AuthWrapperComponent } from '../components/auth-wrapper.component';
import { CommonModule } from '@angular/common';
import { BasePageComponent, BasePageTemplateComponent } from '@/shared/components';

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [CommonModule, AuthWrapperComponent, ReactiveFormsModule, ButtonModule, PasswordModule, RouterModule, BasePageTemplateComponent],
    template: `
        <app-base-page-template [loading]="showSkeleton()" [skeletonType]="'form'">
        <app-auth-wrapper [title]="success() ? '¡Contraseña Actualizada!' : 'Nueva Contraseña'" [subtitle]="success() ? 'Tu seguridad ha sido restaurada' : 'Ingresa tu nueva clave de acceso'">
                @if (invalidLink()) {
                    <div class="w-full md:w-120 flex flex-col items-center text-center animate-fadein">
                        <div class="w-24 h-24 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-6">
                            <i class="pi pi-ban text-red-600 dark:text-red-400 text-5xl"></i>
                        </div>
                        <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-2">Enlace inválido</h3>
                        <p class="text-muted-color mb-8">El enlace de recuperación no es válido o faltan datos requeridos. Por favor solicita uno nuevo.</p>
                        <p-button label="Solicitar nuevo enlace" routerLink="/auth/forgot-password" styleClass="w-full"></p-button>
                    </div>
                } @else if (!success()) {
                    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="w-full md:w-120 animate-fadein">
                        <div class="flex flex-col gap-2 mb-6">
                            <label for="password" class="font-medium text-surface-900 dark:text-surface-0">Nueva Contraseña</label>
                            <p-password id="password" formControlName="password" [toggleMask]="true" class="w-full" [inputStyle]="{ width: '100%' }" placeholder="Mínimo 6 caracteres" [feedback]="true"> </p-password>

                            @if (form.get('password')?.touched && form.get('password')?.invalid) {
                                <small class="text-red-500">La contraseña es requerida (mín. 6 caracteres).</small>
                            }
                        </div>

                        @if (authStore.error()) {
                            <div class="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md text-sm">
                                <i class="pi pi-times-circle mr-2"></i>
                                {{ authStore.error() }}
                            </div>
                        }

                        <p-button label="Cambiar Contraseña" type="submit" styleClass="w-full" [loading]="authStore.loading()" [disabled]="form.invalid"></p-button>
                    </form>
                } @else {
                    <div class="w-full md:w-120 flex flex-col items-center text-center animate-fadein">
                        <div class="w-24 h-24 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-6">
                            <i class="pi pi-check-circle text-green-600 dark:text-green-400 text-5xl"></i>
                        </div>

                        <p class="text-muted-color mb-8 text-lg">Tu contraseña se ha restablecido correctamente. Ya puedes acceder a tu cuenta con tus nuevas credenciales.</p>

                        <p-button label="Iniciar Sesión Ahora" routerLink="/auth/login" styleClass="w-full"></p-button>
                    </div>
                }
            </app-auth-wrapper>
        </app-base-page-template>
    `
})
export class ResetPasswordPage extends BasePageComponent implements OnInit {
    authStore = inject(AuthStore);
    private fb = inject(FormBuilder);
    private route = inject(ActivatedRoute);

    protected override loadingSignal = this.authStore.loading;
    protected override skeletonType = 'form' as const;

    invalidLink = signal(false);
    success = signal(false);
    
    // No mostrar skeleton si el enlace es inválido o si ya fue exitoso
    showSkeleton = computed(() => {
        return this.authStore.loading() && !this.success() && !this.invalidLink();
    });

    // Datos extraídos de la URL
    token: string | null = null;
    correo: string | null = null;

    form = this.fb.group({
        password: ['', [Validators.required, Validators.minLength(6)]]
    });

    ngOnInit() {
        // Limpiar errores y toasts anteriores al entrar a esta página
        this.authStore.clearError();
        this.messageService.clear();

        // Obtenemos los parametros que enviamos en el correo
        this.token = this.route.snapshot.queryParamMap.get('token');
        this.correo = this.route.snapshot.queryParamMap.get('email');

        if (!this.token || !this.correo) {
            this.invalidLink.set(true);
        }
    }

    async onSubmit() {
        if (this.form.invalid || this.invalidLink()) return;

        try {
            const newPassword = this.form.get('password')?.value!;

            // Llamada al store pasando los datos necesarios para el Command del backend
            await this.authStore.resetPassword({
                correo: this.correo!,
                token: this.token!,
                newPassword: newPassword
            });
            this.success.set(true);
        } catch (error) {
            console.error(error);
        }
    }
}
