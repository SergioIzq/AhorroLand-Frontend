import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';

// Tu Arquitectura
import { AuthStore } from '@/core/stores/auth.store';
import { BasePageComponent } from '@/shared/components';

@Component({
    selector: 'app-my-profile',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, CardModule, InputTextModule, ButtonModule, AvatarModule, FileUploadModule, ToastModule, DividerModule, InputIconModule, IconFieldModule],
    template: `
        <p-toast></p-toast>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-y-2 md:gap-x-2">
            <!-- Card 1: Avatar y Correo -->
            <div class="card surface-card shadow-2 border-round p-6 h-full">
                <div class="grid grid-flow-col grid-rows-1 gap-4">
                    <p-avatar
                        [label]="authStore.userInitials()"
                        shape="circle"
                        size="xlarge"
                        class="mb-3 mr-6 shadow-4 bg-primary text-primary-contrast row-span-3"
                        [style]="{
                            width: '100px',
                            height: '100px',
                            'font-size': '2.5rem'
                        }"
                    />

                    <div class="text-center col-span-2">
                        <h2 class="text-900 font-bold text-2xl mb-1 mt-0">{{ authStore.userName() }}</h2>
                        <span class="text-600 font-medium">{{ authStore.user()?.email }}</span>
                        <div class="mt-2">
                            <span class="inline-flex align-items-center justify-content-center px-2 py-1 bg-primary-100 text-primary-700 border-round font-medium text-xs">
                                {{ authStore.user()?.rol || 'Usuario' }}
                            </span>
                        </div>
                    </div>
                </div>

                <form [formGroup]="form" class="p-fluid">
                    <div class="field mb-0">
                        <label for="email" class="font-medium text-900 mb-2 block">Correo Electrónico</label>
                        <p-iconField iconPosition="left">
                            <p-inputIcon styleClass="pi pi-envelope" />
                            <input pInputText id="email" formControlName="email" [readonly]="true" class="w-full bg-gray-50 text-color-secondary" />
                        </p-iconField>
                        <small class="text-500 mt-1 block">El correo electrónico es tu identificador único y no se puede modificar.</small>
                    </div>
                </form>
            </div>

            <!-- Card 2: Información Personal -->
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
    `
})
export class MyProfilePage extends BasePageComponent implements OnInit {
    authStore = inject(AuthStore);
    private fb = inject(FormBuilder);

    saving = signal(false);

    form = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        nombre: ['', [Validators.required, Validators.minLength(2)]],
        apellidos: ['']
    });

    ngOnInit() {
        this.loadUserData();
    }

    loadUserData() {
        const user = this.authStore.user();
        if (user) {
            this.form.patchValue({
                email: user.email,
                nombre: user.nombre,
                apellidos: user.apellidos || ''
            });
            this.form.get('email')?.disable();
        }
    }

    async onSubmit() {
        if (this.form.invalid) return;

        this.saving.set(true);
        const { nombre, apellidos } = this.form.getRawValue();

        try {
            
            await this.authStore.updateProfile({ nombre: nombre!, apellidos: apellidos || null });
            
            // Actualización optimista
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
}
