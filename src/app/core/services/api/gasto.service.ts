import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Gasto, ResumenGastos, GastoCreate } from '../../models';
import { PaginatedList, Result } from '@/core/models/common.model';

@Injectable({
    providedIn: 'root'
})
export class GastoService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/gastos`;
    
    // Cache para resumen
    private resumenCache$?: Observable<ResumenGastos>;

    /**
     * Obtener todos los gastos con paginación, búsqueda y ordenamiento
     */
    getGastos(
        page: number = 1, 
        pageSize: number = 10,
        searchTerm?: string,
        sortColumn?: string,
        sortOrder?: string
    ): Observable<PaginatedList<Gasto>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('pageSize', pageSize.toString());
        
        if (searchTerm) {
            params = params.set('searchTerm', searchTerm);
        }
        if (sortColumn) {
            params = params.set('sortColumn', sortColumn);
        }
        if (sortOrder) {
            params = params.set('sortOrder', sortOrder);
        }
        
        // API devuelve Result<PaginatedList<Gasto>>, extraer data
        return this.http.get<Result<PaginatedList<Gasto>>>(`${this.apiUrl}`, { params })
            .pipe(map(response => response.value));
    }

    /**
     * Obtener todos los gastos sin paginación (para compatibilidad)
     */
    getAllGastos(): Observable<Gasto[]> {
        return this.http.get<Result<PaginatedList<Gasto>>>(this.apiUrl, {
            params: new HttpParams().set('pageSize', '1000')
        }).pipe(
            map(response => response.value.items),
            shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    /**
     * Obtener gastos por período
     */
    getGastosPorPeriodo(fechaInicio: string, fechaFin: string): Observable<Gasto[]> {
        const params = new HttpParams()
            .set('fechaInicio', fechaInicio)
            .set('fechaFin', fechaFin)
            .set('pageSize', '1000');
        
        return this.http.get<Result<PaginatedList<Gasto>>>(`${this.apiUrl}/periodo`, { params }).pipe(
            map(response => response.value.items),
            shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    /**
     * Obtener resumen de gastos con cache
     */
    getResumen(fechaInicio?: string, fechaFin?: string): Observable<ResumenGastos> {
        let params = new HttpParams();
        if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
        if (fechaFin) params = params.set('fechaFin', fechaFin);
        
        // Usar cache solo si no hay parámetros de fecha
        if (!fechaInicio && !fechaFin && this.resumenCache$) {
            return this.resumenCache$;
        }
        
        this.resumenCache$ = this.http.get<ResumenGastos>(`${this.apiUrl}/resumen`, { params }).pipe(
            shareReplay({ bufferSize: 1, refCount: true })
        );
        
        return this.resumenCache$;
    }

    /**
     * Alias para mantener compatibilidad
     */
    getResumenGastos(fechaInicio: string, fechaFin: string): Observable<ResumenGastos> {
        return this.getResumen(fechaInicio, fechaFin);
    }

    /**
     * Obtener gasto por ID
     */
    getById(id: string): Observable<Gasto> {
        return this.http.get<Result<Gasto>>(`${this.apiUrl}/${id}`)
            .pipe(map(response => response.value));
    }

    /**
     * Crear gasto
     */
    create(gasto: GastoCreate): Observable<string> {
        return this.http.post<Result<string>>(this.apiUrl, gasto).pipe(
            map(response => {
                this.invalidateCache();
                return response.value;
            })
        );
    }

    /**
     * Actualizar gasto
     */
    update(id: string, gasto: Partial<Gasto>): Observable<Gasto> {
        return this.http.put<Result<Gasto>>(`${this.apiUrl}/${id}`, gasto).pipe(
            map(response => {
                this.invalidateCache();
                return response.value;
            })
        );
    }

    /**
     * Eliminar gasto
     */
    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { observe: 'response' }).pipe(
            map(response => {
                this.invalidateCache();
                // 204 No Content es éxito, no devuelve data
                return undefined as void;
            })
        );
    }

    /**
     * Invalidar cache
     */
    private invalidateCache(): void {
        this.resumenCache$ = undefined;
    }
}
