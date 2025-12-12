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
    `],
    template: `
        <p-toast></p-toast>
        <p-confirmdialog [style]="{ width: '450px' }" />
        
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
