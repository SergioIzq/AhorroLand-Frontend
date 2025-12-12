import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';

export type SkeletonType = 'profile' | 'form' | 'table' | 'card';

@Component({
    selector: 'app-skeleton-loader',
    standalone: true,
    imports: [CommonModule, SkeletonModule],
    template: `
        <!-- TYPE: PROFILE (Imita tu MyProfilePage) -->
        @if (type === 'profile') {
            <div class="card surface-ground px-4 py-5 md:px-6 lg:px-8">
                <div class="surface-card shadow-2 border-round p-6 max-w-4xl mx-auto">
                    <!-- Cabecera Avatar -->
                    <div class="flex flex-column align-items-center justify-content-center mb-6 pb-5 border-bottom-1 surface-border">
                        <p-skeleton shape="circle" size="100px" styleClass="mb-3"></p-skeleton>
                        <div class="flex flex-column align-items-center gap-2">
                            <p-skeleton width="12rem" height="2rem"></p-skeleton> <!-- Nombre -->
                            <p-skeleton width="8rem" height="1rem"></p-skeleton>  <!-- Email -->
                            <p-skeleton width="5rem" height="1.5rem" borderRadius="16px"></p-skeleton> <!-- Rol Badge -->
                        </div>
                    </div>

                    <!-- Formulario Simulado -->
                    <div class="p-fluid max-w-3xl mx-auto">
                        <div class="field mb-4">
                            <p-skeleton width="5rem" styleClass="mb-2"></p-skeleton> <!-- Label -->
                            <p-skeleton height="2.5rem"></p-skeleton> <!-- Input -->
                            <p-skeleton width="15rem" height="1rem" styleClass="mt-1"></p-skeleton> <!-- Small text -->
                        </div>

                        <div class="grid formgrid">
                            <div class="field col-12 md:col-6 mb-4">
                                <p-skeleton width="4rem" styleClass="mb-2"></p-skeleton>
                                <p-skeleton height="2.5rem"></p-skeleton>
                            </div>
                            <div class="field col-12 md:col-6 mb-4">
                                <p-skeleton width="4rem" styleClass="mb-2"></p-skeleton>
                                <p-skeleton height="2.5rem"></p-skeleton>
                            </div>
                        </div>

                        <div class="flex justify-content-end gap-3 mt-4 pt-3 border-top-1 surface-border">
                            <p-skeleton width="6rem" height="2.5rem"></p-skeleton>
                            <p-skeleton width="8rem" height="2.5rem"></p-skeleton>
                        </div>
                    </div>
                </div>
            </div>
        }

        <!-- TYPE: FORM (Genérico para formularios simples) -->
        @else if (type === 'form') {
            <div class="surface-ground flex items-center justify-center min-h-screen px-4 py-8">
                <div class="surface-card shadow-2 border-round p-8 w-full" style="max-width: 480px;">
                    <!-- Header simulado -->
                    <div class="text-center mb-8">
                        <p-skeleton width="12rem" height="2rem" styleClass="mb-3 mx-auto"></p-skeleton>
                        <p-skeleton width="16rem" height="1.5rem" styleClass="mx-auto"></p-skeleton>
                    </div>
                    
                    <!-- Campos de formulario -->
                    <div class="p-fluid">
                        @for (i of [1,2,3]; track i) {
                            <div class="field mb-4">
                                <p-skeleton width="6rem" styleClass="mb-2"></p-skeleton>
                                <p-skeleton height="2.5rem"></p-skeleton>
                            </div>
                        }
                    </div>
                    
                    <!-- Botón simulado -->
                    <p-skeleton width="100%" height="2.5rem" styleClass="mt-6"></p-skeleton>
                    
                    <!-- Links simulados -->
                    <div class="flex flex-col gap-3 mt-6 items-center">
                        <p-skeleton width="10rem" height="1rem"></p-skeleton>
                        <p-skeleton width="12rem" height="1rem"></p-skeleton>
                    </div>
                </div>
            </div>
        }

        <!-- TYPE: TABLE (Genérico para listados) -->
        @else if (type === 'table') {
            <div class="surface-card shadow-2 border-round p-4">
                <div class="flex justify-content-between mb-3">
                    <p-skeleton width="10rem" height="2rem"></p-skeleton>
                    <div class="flex gap-2">
                        <p-skeleton width="3rem" height="2rem"></p-skeleton>
                        <p-skeleton width="3rem" height="2rem"></p-skeleton>
                    </div>
                </div>
                <p-skeleton height="300px"></p-skeleton>
            </div>
        }

        <!-- TYPE: CARD (Genérico para cards/dashboard) -->
        @else if (type === 'card') {
            <div class="surface-ground px-4 py-5 md:px-6 lg:px-8">
                <!-- Header Card -->
                <div class="card flex items-center justify-between flex-wrap gap-3 mb-5">
                    <div class="flex flex-col gap-2">
                        <p-skeleton width="15rem" height="2.5rem"></p-skeleton>
                        <p-skeleton width="10rem" height="1.5rem"></p-skeleton>
                    </div>
                    <p-skeleton width="8rem" height="2.5rem"></p-skeleton>
                </div>

                <!-- Content Cards Grid - 4 columns responsive -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    @for (i of [1,2,3,4]; track i) {
                        <div class="card shadow-2 border-round p-4">
                            <div class="flex flex-col items-center text-center gap-3">
                                <p-skeleton shape="circle" size="3rem"></p-skeleton>
                                <p-skeleton width="6rem" height="2rem"></p-skeleton>
                                <p-skeleton width="100%" height="1rem"></p-skeleton>
                            </div>
                        </div>
                    }
                </div>

                <!-- Charts Section - 2 columns responsive -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                    <div class="card shadow-2 border-round p-4">
                        <p-skeleton width="10rem" height="1.5rem" styleClass="mb-4"></p-skeleton>
                        <p-skeleton height="250px"></p-skeleton>
                    </div>
                    <div class="card shadow-2 border-round p-4">
                        <p-skeleton width="10rem" height="1.5rem" styleClass="mb-4"></p-skeleton>
                        <p-skeleton height="250px"></p-skeleton>
                    </div>
                </div>

                <!-- Additional Stats Section - 3 columns responsive -->
                <div class="card shadow-2 border-round p-4 mt-4">
                    <p-skeleton width="12rem" height="1.5rem" styleClass="mb-4"></p-skeleton>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        @for (i of [1,2,3]; track i) {
                            <div class="surface-border border-round p-4">
                                <div class="flex flex-col items-center text-center gap-3">
                                    <p-skeleton shape="circle" size="2.5rem"></p-skeleton>
                                    <p-skeleton width="6rem" height="2rem"></p-skeleton>
                                    <p-skeleton width="100%" height="1rem"></p-skeleton>
                                </div>
                            </div>
                        }
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="card shadow-2 border-round p-4 mt-4">
                    <p-skeleton width="10rem" height="1.5rem" styleClass="mb-4"></p-skeleton>
                    <div class="flex flex-wrap gap-3">
                        @for (i of [1,2,3,4]; track i) {
                            <p-skeleton width="8rem" height="2.5rem"></p-skeleton>
                        }
                    </div>
                </div>
            </div>
        }
    `
})
export class SkeletonLoaderComponent {
    @Input() type: SkeletonType = 'form'; // Default
}