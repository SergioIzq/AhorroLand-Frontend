import { Component, computed, inject } from '@angular/core';
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
            /* Estilo del contenedor del avatar */
            :host ::ng-deep .custom-avatar {
                width: 32px;
                height: 32px;
                font-size: 0.875rem;
                background-color: var(--primary-color, #3b82f6);
                color: #ffffff !important; /* Forzamos color en el contenedor */
            }

            /* AGREGA ESTO: Atacamos específicamente al texto interno */
            :host ::ng-deep .custom-avatar .p-avatar-text {
                color: #ffffff !important;
                line-height: 1; /* Asegura que el texto no se desplace verticalmente */
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
                        <p-avatar [label]="avatarLabel()" [image]="avatarImage()" shape="circle" size="normal" class="custom-avatar" />
                        <span>{{ authStore.userName() }}</span>
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

    avatarImage = computed(() => {
        const user = this.authStore.user();
        const avatar = user?.avatar;

        if (avatar && avatar.trim() !== '') {
            return avatar;
        }
        return undefined;
    });

    // 2. Determinar el label (iniciales)
    // Solo devolvemos iniciales si NO hay imagen válida
    avatarLabel = computed(() => {
        // Si tenemos imagen, no necesitamos label (o viceversa, según prefieras)
        if (this.avatarImage()) {
            return undefined;
        }

        // Aquí asegúrate de que userInitials devuelva algo visible por defecto si falla
        const initials = this.authStore.userInitials();

        return initials ? initials : '?'; // '?' o un fallback visual
    });

    constructor(public layoutService: LayoutService) {}

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
    }

    logout() {
        this.authStore.logout();
        this.router.navigate(['/auth/login']);
    }
}
