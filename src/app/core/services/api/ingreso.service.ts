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
     * Obtener todos los ingresos con paginación
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
        
        if (searchTerm) params = params.set('searchTerm', searchTerm);
        if (sortColumn) params = params.set('sortColumn', sortColumn);
        if (sortOrder) params = params.set('sortOrder', sortOrder);
        
        // 🔧 CORRECCIÓN: Usar Result y .value
        return this.http.get<Result<PaginatedList<Ingreso>>>(this.apiUrl, { params })
            .pipe(map(response => response.value));
    }

    /**
     * Obtener todos (Compatibilidad)
     * Nota: Esto forzará una paginación grande
     */
    getAllIngresos(): Observable<Ingreso[]> {
        return this.getIngresos(1, 1000).pipe(
            map(paginated => paginated.items),
            shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    /**
     * Obtener ingresos por período (Usando filtros del GetAll)
     */
    getIngresosPorPeriodo(fechaInicio: string, fechaFin: string): Observable<Ingreso[]> {
        // Asumiendo que tu backend soporta filtrado por fecha en el GetAll,
        // si no, necesitarás un endpoint específico o ajustar los params.
        // Si tu backend NO tiene endpoint /periodo, usa el GetAll con filtros.
        const params = new HttpParams()
            .set('page', '1')
            .set('pageSize', '1000')
            // Ajusta estos nombres de param según tu Backend GetIngresosPagedListQuery
            .set('fechaInicio', fechaInicio) 
            .set('fechaFin', fechaFin);
        
        return this.http.get<Result<PaginatedList<Ingreso>>>(this.apiUrl, { params }).pipe(
            map(response => response.value.items),
            shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    /**
     * Obtener resumen (Dashboard)
     * Nota: Asegúrate de que el backend tenga este endpoint o usa DashboardService
     */
    getResumen(fechaInicio?: string, fechaFin?: string): Observable<ResumenIngresos> {
        let params = new HttpParams();
        if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
        if (fechaFin) params = params.set('fechaFin', fechaFin);
        
        if (!fechaInicio && !fechaFin && this.resumenCache$) {
            return this.resumenCache$;
        }
        
        // 🔧 CORRECCIÓN: Mapear desde Result<T>
        const request$ = this.http.get<Result<ResumenIngresos>>(`${this.apiUrl}/resumen`, { params }).pipe(
            map(res => res.value),
            shareReplay({ bufferSize: 1, refCount: true })
        );

        if (!fechaInicio && !fechaFin) {
            this.resumenCache$ = request$;
        }
        
        return request$;
    }

    getResumenIngresos(fechaInicio: string, fechaFin: string): Observable<ResumenIngresos> {
        return this.getResumen(fechaInicio, fechaFin);
    }

    getById(id: string): Observable<Ingreso> {
        return this.http.get<Result<Ingreso>>(`${this.apiUrl}/${id}`)
            .pipe(map(response => response.value));
    }

    create(ingreso: IngresoCreate): Observable<string> {
        // 🔧 CORRECCIÓN: El backend devuelve el ID (Guid), no el objeto.
        // Si necesitas el objeto, tendrás que hacer un getById después o construirlo localmente.
        return this.http.post<Result<string>>(this.apiUrl, ingreso).pipe(
            map(response => {
                this.invalidateCache();
                return response.value; // Devuelve el GUID del nuevo ingreso
            })
        );
    }

    update(id: string, ingreso: Partial<Ingreso>): Observable<void> {
        // 🔧 CORRECCIÓN: El Update suele devolver Result (void/null en value)
        return this.http.put<Result<void>>(`${this.apiUrl}/${id}`, ingreso).pipe(
            map(response => {
                this.invalidateCache();
                return;
            })
        );
    }

    delete(id: string): Observable<void> {
        // 🔧 CORRECCIÓN: El Delete suele devolver Result (void)
        return this.http.delete<Result<void>>(`${this.apiUrl}/${id}`).pipe(
            map(response => {
                this.invalidateCache();
                return;
            })
        );
    }

    private invalidateCache(): void {
        this.resumenCache$ = undefined;
    }
}