import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonLoaderComponent, SkeletonType } from '../skeleton-loader.component';

/**
 * Template compartido para páginas con Toast, ConfirmDialog y Skeleton Loader
 * Uso: Extender de esta clase para heredar el template común
 */
@Component({
    selector: 'app-base-page-template',
    standalone: true,
    imports: [CommonModule, ToastModule, ConfirmDialogModule, SkeletonLoaderComponent],
    styles: [`
        :host {
            display: block;      /* Importante: convierte el tag en bloque para respetar dimensiones */
            margin: 0;
            padding: 0;
        }

        /* Responsive toast en móvil */
        @media screen and (max-width: 640px) {
            :host ::ng-deep .p-toast {
                width: 90vw !important;
                left: 5vw !important;
                right: 5vw !important;
            }

            :host ::ng-deep .p-toast-message {
                margin: 0 0 1rem 0 !important;
            }
        }
    `],
    template: `
        <p-toast [breakpoints]="{'640px': {width: '90vw', left: '5vw', right: '5vw'}}"></p-toast>
        <p-confirmdialog [style]="{ width: '450px' }" [breakpoints]="{'640px': {width: '90vw'}}" />
        
        @if (loading) {
            <app-skeleton-loader [type]="skeletonType"></app-skeleton-loader>
        } @else {
            <ng-content></ng-content>
        }
    `
})
export class BasePageTemplateComponent {
    @Input() loading: boolean = false;
    @Input() skeletonType: SkeletonType = 'form';
}
