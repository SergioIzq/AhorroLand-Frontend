import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { GastoProgramado } from '../../models/gasto-programado.model';
import { PaginatedList, Result } from '@/core/models/common.model';

export interface GastoProgramadoCreate {
    importe: number;
    frecuencia: 'DIARIO' | 'SEMANAL' | 'MENSUAL' | 'ANUAL';
    descripcion?: string;
    fechaEjecucion: Date;
    activo: boolean;
    conceptoId: string;
    proveedorId?: string;
    personaId?: string;
    cuentaId: string;
    formaPagoId?: string;
}

@Injectable({
    providedIn: 'root'
})
export class GastoProgramadoService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/gastos-programados`;

    /**
     * Obtener todos los gastos programados con paginación
     */
    getGastosProgramados(
        page: number = 1,
        pageSize: number = 10,
        searchTerm?: string,
        sortColumn?: string,
        sortOrder?: string
    ): Observable<PaginatedList<GastoProgramado>> {
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
            .get<Result<PaginatedList<GastoProgramado>>>(`${this.apiUrl}`, { params })
            .pipe(map((response) => response.value));
    }

    /**
     * Obtener gasto programado por ID
     */
    getById(id: string): Observable<GastoProgramado> {
        return this.http
            .get<Result<GastoProgramado>>(`${this.apiUrl}/${id}`)
            .pipe(map((response) => response.value));
    }

    /**
     * Crear gasto programado
     */
    create(gasto: GastoProgramadoCreate): Observable<string> {
        return this.http
            .post<Result<string>>(this.apiUrl, gasto)
            .pipe(map((response) => response.value));
    }

    /**
     * Actualizar gasto programado
     */
    update(id: string, gasto: Partial<GastoProgramado>): Observable<Result<string>> {
        return this.http
            .put<Result<string>>(`${this.apiUrl}/${id}`, gasto)
    }

    /**
     * Eliminar gasto programado
     */
    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { observe: 'response' }).pipe(
            map(() => {
                return undefined as void;
            })
        );
    }
}
