import { Component, computed, inject, signal } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { AvatarModule } from 'primeng/avatar';
import { AppConfigurator } from './app.configurator';
import { AppLogo } from './app.logo';
import { LayoutService } from '../service/layout.service';
import { AuthStore } from '../../core/stores/auth.store';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, AvatarModule, AppConfigurator, AppLogo],
    styles: [
        `
            :host ::ng-deep .custom-avatar {
                width: 32px;
                height: 32px;
                background-color: var(--primary-color, var(--p-primary-color, #10b981)) !important;
                color: var(--primary-color-text, var(--p-primary-contrast-color, #ffffff)) !important;
                font-weight: 600;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            /* AQUI ESTÁ LA CORRECCIÓN:
           Atacamos al span interno (.p-avatar-icon) que contiene la clase del icono.
        */
            :host ::ng-deep .custom-avatar .p-avatar-icon {
                /* 1. Forzamos la fuente PrimeIcons, si no, usa Segoe UI y no se ve nada */
                font-family: 'primeicons' !important;

                /* 2. Heredamos el color blanco del padre */
                color: inherit !important;

                /* 3. Ajustamos tamaño y centrado */
                font-size: 1rem !important;
                display: inline-block;

                /* 4. Reset de estilos de fuente por seguridad */
                font-style: normal;
                font-weight: normal;
                font-variant: normal;
                text-transform: none;
                line-height: 1;
            }

            /* Aseguramos que si hay texto (iniciales) también herede el color */
            :host ::ng-deep .custom-avatar .p-avatar-text {
                color: inherit !important;
            }
        `
    ],
    template: ` <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" (click)="layoutService.onMenuToggle()">
                <i class="pi pi-bars"></i>
            </button>
            <a class="layout-topbar-logo" routerLink="/">
                <app-logo />
                <span>AhorroLand</span>
            </a>
        </div>

        <div class="layout-topbar-actions">
            <div class="layout-config-menu">
                <button type="button" class="layout-topbar-action" (click)="toggleDarkMode()">
                    <i [ngClass]="{ 'pi ': true, 'pi-moon': layoutService.isDarkTheme(), 'pi-sun': !layoutService.isDarkTheme() }"></i>
                </button>
                <div class="relative">
                    <button
                        class="layout-topbar-action layout-topbar-action-highlight"
                        pStyleClass="@next"
                        enterFromClass="hidden"
                        enterActiveClass="animate-scalein"
                        leaveToClass="hidden"
                        leaveActiveClass="animate-fadeout"
                        [hideOnOutsideClick]="true"
                    >
                        <i class="pi pi-palette"></i>
                    </button>
                    <app-configurator />
                </div>
            </div>

            <button class="layout-topbar-menu-button layout-topbar-action" pStyleClass="@next" enterFromClass="hidden" enterActiveClass="animate-scalein" leaveToClass="hidden" leaveActiveClass="animate-fadeout" [hideOnOutsideClick]="true">
                <i class="pi pi-ellipsis-v"></i>
            </button>

            <div class="layout-topbar-menu hidden lg:block">
                <div class="layout-topbar-menu-content">
                    <button type="button" class="layout-topbar-action" routerLink="/auth/my-profile">
                        @if (shouldShowImage()) {
                            <p-avatar [image]="userAvatar()!" shape="circle" size="normal" class="custom-avatar" (onImageError)="onImageError()" />

                        } @else {
                            <p-avatar icon="pi pi-user" shape="circle" size="normal" class="custom-avatar" />
                        }

                        <span>{{ authStore.userName() || 'Usuario' }}</span>
                    </button>

                    <button type="button" class="layout-topbar-action" (click)="logout()">
                        <i class="pi pi-sign-out"></i>
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </div>
        </div>
    </div>`
})
export class AppTopbar {
    items!: MenuItem[];
    authStore = inject(AuthStore);
    private router = inject(Router);

    // Señal para controlar si la carga de la imagen falló
    imageLoadError = signal(false);

    // Obtener URL del avatar
    userAvatar = computed(() => this.authStore.user()?.avatar);

    // Lógica para decidir si mostramos el tag <img>
    shouldShowImage = computed(() => {
        const avatar = this.userAvatar();
        // Verificamos que no sea nulo, ni undefined, ni cadena vacía
        const hasUrl = !!(avatar && avatar.trim().length > 0);
        // Y que no haya dado error de carga
        return hasUrl && !this.imageLoadError();
    });

    // NOTA: He eliminado 'userInitials' y 'shouldShowInitials'
    // para forzar que siempre salga el icono si no hay imagen.

    constructor(public layoutService: LayoutService) {}

    onImageError() {
        this.imageLoadError.set(true);
    }

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
    }

    logout() {
        this.authStore.logout();
        this.router.navigate(['/auth/login']);
    }
}
