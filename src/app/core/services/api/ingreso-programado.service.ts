import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { IngresoProgramado } from '../../models/ingreso-programado.model';
import { PaginatedList, Result } from '@/core/models/common.model';

export interface IngresoProgramadoCreate {
    importe: number;
    frecuencia: 'DIARIO' | 'SEMANAL' | 'MENSUAL' | 'ANUAL';
    descripcion?: string;
    fechaEjecucion: Date;
    activo: boolean;
    conceptoId: string;
    clienteId?: string;
    personaId?: string;
    cuentaId: string;
    formaPagoId?: string;
}

@Injectable({
    providedIn: 'root'
})
export class IngresoProgramadoService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/ingresos-programados`;

    /**
     * Obtener todos los ingresos programados con paginación
     */
    getIngresosProgramados(
        page: number = 1,
        pageSize: number = 10,
        searchTerm?: string,
        sortColumn?: string,
        sortOrder?: string
    ): Observable<PaginatedList<IngresoProgramado>> {
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

        return this.http
            .get<Result<PaginatedList<IngresoProgramado>>>(`${this.apiUrl}`, { params })
            .pipe(map((response) => response.value));
    }

    /**
     * Obtener ingreso programado por ID
     */
    getById(id: string): Observable<IngresoProgramado> {
        return this.http
            .get<Result<IngresoProgramado>>(`${this.apiUrl}/${id}`)
            .pipe(map((response) => response.value));
    }

    /**
     * Crear ingreso programado
     */
    create(ingreso: IngresoProgramadoCreate): Observable<string> {
        return this.http
            .post<Result<string>>(this.apiUrl, ingreso)
            .pipe(map((response) => response.value));
    }

    /**
     * Actualizar ingreso programado
     */
    update(id: string, ingreso: Partial<IngresoProgramado>): Observable<Result<string>> {
        return this.http
            .put<Result<string>>(`${this.apiUrl}/${id}`, ingreso);
    }

    /**
     * Eliminar ingreso programado
     */
    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { observe: 'response' }).pipe(
            map(() => {
                return undefined as void;
            })
        );
    }
}
