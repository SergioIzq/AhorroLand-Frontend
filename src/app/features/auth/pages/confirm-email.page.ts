import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { AuthStore } from '../../../core/stores/auth.store';
import { AuthWrapperComponent } from '../components/auth-wrapper.component';
import { BasePageComponent } from '@/shared/components';

@Component({
    selector: 'app-confirm-email',
    standalone: true,
    imports: [
        AuthWrapperComponent,
        ButtonModule,
        ProgressSpinnerModule,
        RouterModule
    ],
    template: `
        <app-auth-wrapper 
            [title]="viewTitle()" 
            [subtitle]="viewSubtitle()">

            @if (authStore.loading()) {
                <div class="w-full md:w-120 flex flex-col items-center justify-center py-8 animate-fadein">
                    <p-progressSpinner 
                        styleClass="w-16 h-16" 
                        strokeWidth="4" 
                        animationDuration=".5s"></p-progressSpinner>
                    <span class="mt-6 text-lg text-surface-600 dark:text-surface-200 font-medium">
                        Validando tu enlace de seguridad...
                    </span>
                </div>
            }

            @else if (authStore.error() || isTokenMissing()) {
                <div class="w-full md:w-120 flex flex-col items-center text-center animate-fadein">
                    <div class="w-24 h-24 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-6">
                        <i class="pi pi-times-circle text-red-600 dark:text-red-400 text-5xl"></i>
                    </div>
                    
                    <h2 class="text-2xl font-bold mb-2 text-surface-900 dark:text-surface-0">
                        No pudimos verificar tu cuenta
                    </h2>
                    
                    <p class="text-muted-color mb-8 text-lg">
                        {{ authStore.error() || 'El enlace de confirmación es inválido o ha expirado.' }}
                    </p>
                    
                    <div class="flex gap-4 w-full">
                        <p-button 
                            label="Volver al Inicio" 
                            routerLink="/" 
                            [outlined]="true" 
                            styleClass="w-full"></p-button>
                    </div>
                </div>
            }

            @else {
                <div class="w-full md:w-120 flex flex-col items-center text-center animate-fadein">
                    <div class="w-24 h-24 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-6">
                        <i class="pi pi-check-circle text-green-600 dark:text-green-400 text-5xl"></i>
                    </div>

                    <h2 class="text-2xl font-bold mb-2 text-surface-900 dark:text-surface-0">
                        ¡Cuenta Confirmada!
                    </h2>

                    <p class="text-muted-color mb-8 text-lg">
                        Tu correo ha sido verificado correctamente. Ya puedes acceder a todas las funciones de AhorroLand.
                    </p>

                    <p-button 
                        label="Iniciar Sesión" 
                        routerLink="/auth/login" 
                        styleClass="w-full"></p-button>
                </div>
            }

        </app-auth-wrapper>
    `
})
export class ConfirmEmail extends BasePageComponent implements OnInit {
    authStore = inject(AuthStore);
    private route = inject(ActivatedRoute);

    // Estado local para saber si llegamos sin token en la URL
    isTokenMissing = signal(false);

    // Títulos dinámicos para el AuthWrapper según el estado
    viewTitle = computed(() => {
        if (this.authStore.loading()) return 'Verificando';
        if (this.authStore.error() || this.isTokenMissing()) return 'Hubo un problema';
        return '¡Todo listo!';
    });

    viewSubtitle = computed(() => {
        if (this.authStore.loading()) return 'Por favor espera un momento';
        if (this.authStore.error() || this.isTokenMissing()) return 'No se pudo completar la acción';
        return 'Tu cuenta está activa';
    });

    ngOnInit() {
        // Limpiar errores y toasts anteriores al entrar a esta página
        this.authStore.clearError();
        this.messageService.clear();

        const token = this.route.snapshot.queryParamMap.get('token');

        if (!token) {
            this.isTokenMissing.set(true);
            return;
        }

        this.authStore.confirmEmail(token);
    }
}