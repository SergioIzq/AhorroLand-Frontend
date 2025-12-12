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
    const messageService = inject(MessageService);

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
    // Debug: Log para ver qué está llegando (puedes comentarlo después)
    console.log('🔍 Error interceptado:', {
        status: httpError.status,
        error: httpError.error,
        type: typeof httpError.error
    });
    
    // CASO 1: Tu estructura Backend (.NET Result Pattern)
    // Verificamos si la respuesta tiene la forma { isFailure: true, error: { ... } }
    const apiResult = httpError.error as ApiResult;

    // Verificación más robusta para el Result Pattern
    if (apiResult && typeof apiResult === 'object') {
        // Verificar si tiene la estructura de Result con error
        if (apiResult.isFailure && apiResult.error) {
            console.log('✅ Detectado Result Pattern del backend:', apiResult.error);
            return {
                title: apiResult.error.name || 'Error',
                message: apiResult.error.message || 'Ocurrió un error inesperado.'
            };
        }
        
        // A veces el error puede venir directamente sin isFailure (por ejemplo, en algunos middlewares)
        if (apiResult.error && apiResult.error.code && apiResult.error.message) {
            console.log('✅ Detectado error directo del backend');
            return {
                title: apiResult.error.name || 'Error',
                message: apiResult.error.message
            };
        }
    }
    
    console.log('⚠️ No se detectó Result Pattern, apiResult:', apiResult);

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

    // CASO 3: Si el error es un string (a veces HttpClient lo parsea así)
    if (typeof httpError.error === 'string') {
        try {
            const parsed = JSON.parse(httpError.error);
            if (parsed?.error?.message) {
                return {
                    title: parsed.error.name || 'Error',
                    message: parsed.error.message
                };
            }
        } catch (e) {
            // No es JSON válido, continuar con fallbacks
        }
    }

    // CASO 4: Fallbacks Genéricos basados en Status Code
    // (Si el backend explotó tan fuerte que no mandó JSON, o es un error de red)
    console.log('⚠️ Usando fallback genérico para status:', httpError.status);
    switch (httpError.status) {
        case 400: return { title: 'Petición Inválida', message: 'Los datos enviados son incorrectos.' };
        case 401: return { title: 'Sesión Expirada', message: 'Por favor, inicia sesión nuevamente.' };
        case 403: return { title: 'Acceso Denegado', message: 'No tienes permisos para realizar esta acción.' };
        case 404: return { title: 'No Encontrado', message: 'El recurso solicitado no existe.' };
        case 409: return { title: 'Conflicto de recurso', message: 'El recurso que intentas crear ya existe.' };
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