import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Ingreso, ResumenIngresos, IngresoCreate } from '../../models';
import { PaginatedList, Result } from '@/core/models/common.model';

@Injectable({
    providedIn: 'root'
})
export class IngresoService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/ingresos`;
    
    // Cache para resumen
    private resumenCache$?: Observable<ResumenIngresos>;

    /**
     * Obtener todos los ingresos con paginación, búsqueda y ordenamiento
     */
    getIngresos(
        page: number = 1, 
        pageSize: number = 10,
        searchTerm?: string,
        sortColumn?: string,
        sortOrder?: string
    ): Observable<PaginatedList<Ingreso>> {
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
        
        // API devuelve Result<PaginatedList<Ingreso>>, extraer data
        return this.http.get<Result<PaginatedList<Ingreso>>>(`${this.apiUrl}`, { params })
            .pipe(map(response => response.value));
    }

    /**
     * Obtener todos los ingresos sin paginación (para compatibilidad)
     */
    getAllIngresos(): Observable<Ingreso[]> {
        return this.http.get<Result<PaginatedList<Ingreso>>>(this.apiUrl, {
            params: new HttpParams().set('pageSize', '1000')
        }).pipe(
            map(response => response.value.items),
            shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    /**
     * Obtener ingresos por período
     */
    getIngresosPorPeriodo(fechaInicio: string, fechaFin: string): Observable<Ingreso[]> {
        const params = new HttpParams()
            .set('fechaInicio', fechaInicio)
            .set('fechaFin', fechaFin)
            .set('pageSize', '1000');
        
        return this.http.get<Result<PaginatedList<Ingreso>>>(`${this.apiUrl}/periodo`, { params }).pipe(
            map(response => response.value.items),
            shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    /**
     * Obtener resumen de ingresos con cache
     */
    getResumen(fechaInicio?: string, fechaFin?: string): Observable<ResumenIngresos> {
        let params = new HttpParams();
        if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
        if (fechaFin) params = params.set('fechaFin', fechaFin);
        
        // Usar cache solo si no hay parámetros de fecha
        if (!fechaInicio && !fechaFin && this.resumenCache$) {
            return this.resumenCache$;
        }
        
        this.resumenCache$ = this.http.get<ResumenIngresos>(`${this.apiUrl}/resumen`, { params }).pipe(
            shareReplay({ bufferSize: 1, refCount: true })
        );
        
        return this.resumenCache$;
    }

    /**
     * Alias para mantener compatibilidad
     */
    getResumenIngresos(fechaInicio: string, fechaFin: string): Observable<ResumenIngresos> {
        return this.getResumen(fechaInicio, fechaFin);
    }

    /**
     * Obtener ingreso por ID
     */
    getById(id: string): Observable<Ingreso> {
        return this.http.get<Result<Ingreso>>(`${this.apiUrl}/${id}`)
            .pipe(map(response => response.value));
    }

    /**
     * Crear ingreso
     */
    create(ingreso: IngresoCreate): Observable<string> {
        return this.http.post<Result<string>>(this.apiUrl, ingreso).pipe(
            map(response => {
                this.invalidateCache();
                return response.value;
            })
        );
    }

    /**
     * Actualizar ingreso
     */
    update(id: string, ingreso: Partial<Ingreso>): Observable<string> {
        return this.http.put<Result<string>>(`${this.apiUrl}/${id}`, ingreso).pipe(
            map(response => {
                this.invalidateCache();
                return response.value;
            })
        );
    }

    /**
     * Eliminar ingreso
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