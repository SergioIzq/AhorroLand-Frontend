import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { TraspasoProgramado, TraspasoProgramadoCreate } from '../../models/traspaso-programado.model';
import { PaginatedList, Result } from '@/core/models/common.model';

@Injectable({
    providedIn: 'root'
})
export class TraspasoProgramadoService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/traspasos-programados`;

    /**
     * Obtener todos los traspasos programados con paginación
     */
    getTraspasosProgramados(
        page: number = 1,
        pageSize: number = 10,
        searchTerm?: string,
        sortColumn?: string,
        sortOrder?: string
    ): Observable<PaginatedList<TraspasoProgramado>> {
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
            .get<Result<PaginatedList<TraspasoProgramado>>>(`${this.apiUrl}`, { params })
            .pipe(map((response) => response.value));
    }

    /**
     * Obtener traspaso programado por ID
     */
    getById(id: string): Observable<TraspasoProgramado> {
        return this.http
            .get<Result<TraspasoProgramado>>(`${this.apiUrl}/${id}`)
            .pipe(map((response) => response.value));
    }

    /**
     * Crear traspaso programado
     */
    create(traspaso: TraspasoProgramadoCreate): Observable<string> {
        return this.http
            .post<Result<string>>(this.apiUrl, traspaso)
            .pipe(map((response) => response.value));
    }

    /**
     * Actualizar traspaso programado
     */
    update(id: string, traspaso: Partial<TraspasoProgramado>): Observable<Result<string>> {
        return this.http
            .put<Result<string>>(`${this.apiUrl}/${id}`, traspaso);
    }

    /**
     * Eliminar traspaso programado
     */
    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { observe: 'response' }).pipe(
            map(() => {
                return undefined as void;
            })
        );
    }

    /**
     * Activar/Desactivar traspaso programado
     */
    toggleActivo(id: string, activo: boolean): Observable<void> {
        return this.http
            .patch<void>(`${this.apiUrl}/${id}/toggle`, { activo });
    }

    /**
     * Reprogramar traspaso (cambiar fecha y/o frecuencia)
     */
    reprogramar(id: string, nuevaFecha: string, nuevaFrecuencia: string): Observable<void> {
        return this.http
            .patch<void>(`${this.apiUrl}/${id}/reprogramar`, { 
                nuevaFecha, 
                nuevaFrecuencia 
            });
    }
}
