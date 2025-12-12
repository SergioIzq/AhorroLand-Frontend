// core/operators/unwrap-result.operator.ts
import { pipe, UnaryFunction, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Result } from '@/core/models/common.model';

export function unwrapResult<T>(): UnaryFunction<Observable<Result<T>>, Observable<T>> {
    return pipe(
        map((result: Result<T>) => {
            // 1. Verificamos la bandera de éxito
            // Nota: Usamos !isSuccess o isFailure según prefieras, son redundantes
            if (!result.isSuccess) {
                
                // 2. Lanzamos nuestro error tipado con toda la info del backend
                // Si result.error es null (raro pero posible), pasamos un objeto vacío seguro
                const errorObj = result.error || { 
                    message: 'Error desconocido', 
                    code: 'UNKNOWN', 
                    name: 'Error', 
                    type: 'Failure' 
                };

                throw new Error(errorObj.message);
            }
            
            // 3. Devolvemos el valor limpio (T)
            return result.value;
        })
    );
}