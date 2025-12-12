import { Component, OnInit, inject, signal, ViewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { FileUploadHandlerEvent, FileUploadModule, FileUpload } from 'primeng/fileupload';
import { DividerModule } from 'primeng/divider';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';

// Tu Arquitectura
import { AuthStore } from '@/core/stores/auth.store';
import { BasePageComponent, BasePageTemplateComponent } from '@/shared/components';

@Component({
    selector: 'app-my-profile',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, CardModule, InputTextModule, ButtonModule, AvatarModule, FileUploadModule, DividerModule, InputIconModule, IconFieldModule, BasePageTemplateComponent],
    styles: [
        `
            /* ESTILOS DEL AVATAR DE PERFIL (GRANDE) */
            :host ::ng-deep .profile-avatar {
                width: 120px;
                height: 120px;
                background-color: var(--primary-color, var(--p-primary-color, #10b981)) !important;
                color: var(--primary-color-text, var(--p-primary-contrast-color, #ffffff)) !important;

                /* CENTRADO PERFECTO */
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                border-radius: 50%; /* Asegura círculo perfecto */
                overflow: hidden; /* Evita desbordes */
                padding: 0 !important; /* Elimina paddings parásitos */
            }

            /* ICONO INTERNO */
            :host ::ng-deep .profile-avatar .p-avatar-icon {
                font-family: 'primeicons' !important;
                font-size: 4rem !important; /* Tamaño grande */

                /* TRUCO PARA ALINEACIÓN VERTICAL EXACTA */
                line-height: 1 !important;
                height: 1em !important;
                width: 1em !important;
                text-align: center;
                display: flex !important;
                align-items: center;
                justify-content: center;

                color: inherit !important;
                margin: 0 !important;
            }
        `
    ],
    template: `
        <app-base-page-template [loading]="loadingSignal() || isLoadingInitial()" [skeletonType]="'profile'">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-y-2 md:gap-x-2">
                <div class="card surface-card shadow-2 border-round p-6 h-full">
                    <div class="grid grid-flow-col grid-rows-1 gap-4">
                        <div class="flex flex-column align-items-center justify-content-center mb-6 pb-5 border-bottom-1 surface-border">
                            <div class="relative mb-3 cursor-pointer group" (click)="fileUploader.basicFileInput?.nativeElement.click()">
                                @if (shouldShowImage()) {
                                    <p-avatar [image]="userAvatar()!" shape="circle" class="shadow-4 profile-avatar" (onImageError)="onImageError()"></p-avatar>

                                } @else {
                                    <p-avatar icon="pi pi-user" shape="circle" class="shadow-4 profile-avatar"></p-avatar>
                                }
                            </div>

                            <p-fileUpload #fileUploader mode="basic" name="avatar" accept="image/*" maxFileSize="5000000" [auto]="true" [customUpload]="true" (uploadHandler)="onUploadAvatar($event)" class="hidden"></p-fileUpload>
                        </div>

                        <div class="text-center col-span-2">
                            <h2 class="text-900 font-bold text-2xl mb-1 mt-0">{{ displayName() }}</h2>
                            <span class="text-600 font-medium">{{ authStore.user()?.correo || 'Sin correo' }}</span>
                            <div class="mt-2">
                                <span class="inline-flex align-items-center justify-content-center px-2 py-1 bg-primary-100 text-primary-700 border-round font-medium text-xs">
                                    {{ authStore.user()?.rol || 'Usuario' }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <form [formGroup]="form" class="p-fluid">
                        <div class="field mb-0">
                            <label for="correo" class="font-medium text-900 mb-2 block">Correo Electrónico</label>
                            <p-iconField iconPosition="left">
                                <p-inputIcon styleClass="pi pi-envelope" />
                                <input pInputText id="correo" formControlName="correo" [readonly]="true" class="w-full bg-gray-50 text-color-secondary" />
                            </p-iconField>
                            <small class="text-500 mt-1 block">El correo electrónico es tu identificador único y no se puede modificar.</small>
                        </div>
                    </form>
                </div>

                <div class="card surface-card shadow-2 border-round p-6 h-full">
                    <h3 class="text-900 font-semibold text-xl mb-4">Información Personal</h3>

                    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="p-fluid">
                        <div class="field mb-4">
                            <label for="nombre" class="font-medium text-900 mb-2 block">Nombre</label>
                            <p-iconField iconPosition="left">
                                <p-inputIcon class="pi pi-user" />
                                <input pInputText id="nombre" formControlName="nombre" placeholder="Tu nombre" class="w-full" />
                            </p-iconField>
                            @if (form.get('nombre')?.touched && form.get('nombre')?.invalid) {
                                <small class="text-red-500 block mt-1">El nombre es requerido.</small>
                            }
                        </div>

                        <div class="field mb-4">
                            <label for="apellidos" class="font-medium text-900 mb-2 block">Apellidos</label>
                            <p-iconField iconPosition="left">
                                <p-inputIcon styleClass="pi pi-id-card" />
                                <input pInputText id="apellidos" formControlName="apellidos" placeholder="Tus apellidos" class="w-full" />
                            </p-iconField>
                        </div>

                        <div class="flex justify-content-end gap-3 mt-4 pt-3 border-top-1 surface-border">
                            <p-button label="Deshacer" icon="pi pi-refresh" severity="secondary" [outlined]="true" (onClick)="loadUserData()"></p-button>
                            <p-button label="Guardar" icon="pi pi-check" type="submit" [loading]="saving()" [disabled]="form.invalid || form.pristine"></p-button>
                        </div>
                    </form>
                </div>
            </div>
        </app-base-page-template>
    `
})
export class MyProfilePage extends BasePageComponent implements OnInit {
    authStore = inject(AuthStore);
    private fb = inject(FormBuilder);

    @ViewChild('fileUploader') fileUploader!: FileUpload;

    protected override loadingSignal = this.authStore.loading;
    protected override skeletonType = 'profile' as const;

    saving = signal(false);
    isLoadingInitial = signal(true);

    // --- NUEVA LÓGICA DE AVATAR (REPLICADA) ---

    // Señal para controlar error de carga de imagen
    imageLoadError = signal(false);

    // Obtener URL
    userAvatar = computed(() => this.authStore.user()?.avatar);

    // Decidir si mostrar imagen (URL existe, no vacía, sin error)
    shouldShowImage = computed(() => {
        const avatar = this.userAvatar();
        const hasUrl = !!(avatar && avatar.trim().length > 0);
        return hasUrl && !this.imageLoadError();
    });

    displayName = computed(() => {
        const userName = this.authStore.userName();
        return userName && userName.trim() !== '' ? userName : 'Sin Nombre';
    });

    form = this.fb.group({
        correo: ['', [Validators.required, Validators.email]],
        nombre: ['', [Validators.required, Validators.minLength(2)]],
        apellidos: ['']
    });

    ngOnInit() {
        this.loadUserData();
        setTimeout(() => this.isLoadingInitial.set(false), 100);
    }

    // Manejador de error de imagen (404)
    onImageError() {
        this.imageLoadError.set(true);
    }

    loadUserData() {
        const user = this.authStore.user();
        if (user) {
            this.form.patchValue({
                correo: user.correo,
                nombre: user.nombre,
                apellidos: user.apellidos || ''
            });
            this.form.get('correo')?.disable();

            // Reseteamos el error de imagen al recargar datos, por si el usuario subió una nueva
            this.imageLoadError.set(false);
        }
    }

    async onSubmit() {
        if (this.form.invalid) return;

        this.saving.set(true);
        const { nombre, apellidos } = this.form.getRawValue();

        try {
            await this.authStore.updateProfile({ nombre: nombre!, apellidos: apellidos || null });

            const currentUser = this.authStore.user();
            if (currentUser) {
                this.authStore.setUser({ ...currentUser, nombre: nombre!, apellidos: apellidos || undefined });
            }

            this.showSuccess('Tu perfil ha sido modificado.', 'Actualizado');
            this.form.markAsPristine();
        } catch (error) {
            console.error(error);
        } finally {
            this.saving.set(false);
        }
    }

    async onUploadAvatar(event: FileUploadHandlerEvent) {
        const file = event.files[0];
        if (!file) return;

        try {
            await this.authStore.updateAvatar(file);

            // Importante: Reseteamos el error porque acabamos de subir una imagen nueva que debería funcionar
            this.imageLoadError.set(false);

            this.showSuccess('Tu foto de perfil se ha actualizado.', 'Avatar Actualizado');
        } catch (error: any) {
            console.error(error);
            this.showError('No se pudo subir la imagen.');
        }
    }
}
