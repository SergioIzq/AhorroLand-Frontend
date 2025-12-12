import { Component, inject, Signal } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Observable, lastValueFrom } from 'rxjs';

/**
 * Clase base para páginas que necesitan funcionalidad común de:
 * - Toasts (mensajes de éxito/error)
 * - Confirmaciones
 * - Manejo automático de respuestas del servidor
 * - Skeleton loader con signal de loading
 * 
 * IMPORTANTE: Los servicios MessageService y ConfirmationService deben ser
 * provistos por el componente hijo, no por esta clase base.
 */
@Component({
    template: '',
    standalone: true
})
export abstract class BasePageComponent {
    protected messageService = inject(MessageService);
    protected confirmationService = inject(ConfirmationService);

    /**
     * Signal de loading del store - puede ser implementado opcionalmente por la clase hija
     * Ejemplo: protected loadingSignal = this.authStore.loading;
     */
    protected loadingSignal?: Signal<boolean>;

    /**
     * Tipo de skeleton a mostrar cuando está cargando
     * Por defecto 'form', puede ser: 'profile' | 'form' | 'table' | 'card'
     */
    protected skeletonType: 'profile' | 'form' | 'table' | 'card' = 'form';

    /**
     * Ejecuta una operación asíncrona mostrando toast de éxito o error según el resultado
     */
    protected async executeWithFeedback<T>(
        operation: Observable<T> | Promise<T>,
        options: {
            successMessage?: string;
            errorMessage?: string;
            loadingMessage?: string;
            onSuccess?: (result: T) => void;
            onError?: (error: any) => void;
        } = {}
    ): Promise<T | undefined> {
        try {
            const result = operation instanceof Observable ? await lastValueFrom(operation) : await operation;

            if (options.successMessage) {
                this.showSuccess(options.successMessage);
            }

            if (options.onSuccess) {
                options.onSuccess(result);
            }

            return result;
        } catch (error) {
            console.error('Error en operación:', error);

            const errorMsg = options.errorMessage || this.extractErrorMessage(error);
            this.showError(errorMsg);

            if (options.onError) {
                options.onError(error);
            }

            return undefined;
        }
    }

    /**
     * Muestra un diálogo de confirmación y ejecuta la acción si se acepta
     */
    protected confirmAction(
        message: string,
        action: () => void | Promise<void>,
        options: {
            header?: string;
            icon?: string;
            acceptLabel?: string;
            rejectLabel?: string;
            successMessage?: string;
        } = {}
    ): void {
        this.confirmationService?.confirm({
            message,
            header: options.header || 'Confirmar',
            icon: options.icon || 'pi pi-exclamation-triangle',
            acceptLabel: options.acceptLabel || 'Sí',
            rejectLabel: options.rejectLabel || 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            accept: async () => {
                const result = action();

                if (result instanceof Promise) {
                    await this.executeWithFeedback(result, {
                        successMessage: options.successMessage
                    });
                } else if (options.successMessage) {
                    this.showSuccess(options.successMessage);
                }
            }
        });
    }

    /**
     * Muestra un mensaje de éxito
     */
    protected showSuccess(detail: string, summary: string = 'Éxito'): void {
        this.messageService.add({
            severity: 'success',
            summary,
            detail,
            life: 3000
        });
    }

    /**
     * Muestra un mensaje de error
     */
    protected showError(detail: string, summary: string = 'Error'): void {
        this.messageService.add({
            severity: 'error',
            summary,
            detail,
            life: 5000
        });
    }

    /**
     * Muestra un mensaje de advertencia
     */
    protected showWarning(detail: string, summary: string = 'Advertencia'): void {
        this.messageService.add({
            severity: 'warn',
            summary,
            detail,
            life: 4000
        });
    }

    /**
     * Muestra un mensaje informativo
     */
    protected showInfo(detail: string, summary: string = 'Información'): void {
        this.messageService.add({
            severity: 'info',
            summary,
            detail,
            life: 3000
        });
    }

    /**
     * Extrae el mensaje de error de diferentes formatos de respuesta
     */
    private extractErrorMessage(error: any): string {
        if (typeof error === 'string') {
            return error;
        }

        if (error?.error?.message) {
            return error.error.message;
        }

        if (error?.message) {
            return error.message;
        }

        if (error?.error?.errors) {
            const errors = error.error.errors;
            const firstKey = Object.keys(errors)[0];
            return errors[firstKey]?.[0] || 'Error desconocido';
        }

        return 'Ocurrió un error inesperado';
    }
}
