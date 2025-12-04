import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

// Definimos la interfaz de tu Backend para tener intellisense
interface ApiResult {
  isSuccess: boolean;
  isFailure: boolean;
  error?: {
    code: string;
    name: string;    // Usaremos esto como Título
    message: string; // Usaremos esto como Detalle
  };
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const messageService = inject(MessageService, { optional: true });

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            // 1. Permitir saltar el manejo global si enviamos un header específico
            if (req.headers.has('X-Skip-Global-Error')) {
                return throwError(() => error);
            }

            // 2. Solo omitir 401 si NO es un endpoint de autenticación
            // Los errores de login/registro SÍ deben mostrar mensaje
            if (error.status === 401 && !req.url.includes('/auth/')) {
                return throwError(() => error);
            }

            // Valores por defecto (Fallback)
            let severity = 'error';
            
            // 3. Extraemos la data usando nuestra nueva lógica
            const { title, message } = extractErrorData(error);

            // 4. Mostrar Toast (PrimeNG)
            if (messageService) {
                messageService.add({
                    severity: severity,
                    summary: title,
                    detail: message,
                    life: 5000,
                    icon: getIconByStatus(error.status)
                });
            }

            console.error('API Error:', error);
            // Retornamos el error agregando el mensaje procesado por si el componente lo necesita
            return throwError(() => ({ ...error, userMessage: message }));
        })
    );
};

/**
 * Extrae el Título y el Mensaje basándose en tu estructura Result backend
 */
function extractErrorData(httpError: HttpErrorResponse): { title: string, message: string } {
    
    // CASO 1: Tu estructura Backend (.NET Result Pattern)
    // Verificamos si la respuesta tiene la forma { isFailure: true, error: { ... } }
    const apiResult = httpError.error as ApiResult;

    if (apiResult?.error && apiResult.error.code) {
        return {
            title: apiResult.error.name || 'Error',
            message: apiResult.error.message || 'Ocurrió un error inesperado.'
        };
    }

    // CASO 2: ValidationProblemDetails nativo de .NET (Fallback)
    // Si por alguna razón el middleware global falló y .NET devolvió sus validaciones por defecto
    if (httpError.error?.errors) {
        const firstKey = Object.keys(httpError.error.errors)[0];
        const firstError = httpError.error.errors[firstKey][0];
        return {
            title: 'Error de Validación',
            message: firstError || 'Datos de entrada inválidos.'
        };
    }

    // CASO 3: Fallbacks Genéricos basados en Status Code
    // (Si el backend explotó tan fuerte que no mandó JSON, o es un error de red)
    switch (httpError.status) {
        case 400: return { title: 'Petición Inválida', message: 'Los datos enviados son incorrectos.' };
        case 401: return { title: 'Sesión Expirada', message: 'Por favor, inicia sesión nuevamente.' };
        case 403: return { title: 'Acceso Denegado', message: 'No tienes permisos para realizar esta acción.' };
        case 404: return { title: 'No Encontrado', message: 'El recurso solicitado no existe.' };
        case 422: return { title: 'Error de Validación', message: 'No se pudo procesar la entidad enviada.' };
        case 500: return { title: 'Error del Servidor', message: 'Estamos teniendo problemas técnicos. Intenta más tarde.' };
        case 0:   return { title: 'Sin Conexión', message: 'Verifica tu conexión a internet.' };
        default:  return { title: 'Error', message: httpError.statusText || 'Ocurrió un error desconocido.' };
    }
}

function getIconByStatus(status: number): string {
    if (status === 401 || status === 403) return 'pi pi-lock'; // Candado para seguridad
    if (status === 0) return 'pi pi-wifi'; // Wifi para red
    if (status >= 500) return 'pi pi-server'; // Servidor para errores 500
    return 'pi pi-times-circle'; // X para el resto
}