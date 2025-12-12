import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Result, PaginatedList } from '@/core/models/common.model';
import { FormaPago } from '@/core/models/forma-pago.model';

@Injectable({
    providedIn: 'root'
})
export class FormaPagoService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/formas-pago`;

    /**
     * Obtener todas las formas de pago con paginación, búsqueda y ordenamiento
     */
    getFormasPago(
        page: number = 1,
        pageSize: number = 10,
        searchTerm?: string,
        sortColumn?: string,
        sortOrder?: string
    ): Observable<PaginatedList<FormaPago>> {
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

        // API devuelve Result<PaginatedList<FormaPago>>, extraer data
        return this.http.get<Result<PaginatedList<FormaPago>>>(`${this.apiUrl}`, { params })
            .pipe(map(response => response.value));
    }

    /**
     * Búsqueda ligera de formas de pago por nombre
     * Solo devuelve {id, nombre} para rendimiento óptimo
     */
    search(search: string, limit: number = 10): Observable<Result<FormaPago[]>> {
        let params = new HttpParams().set('search', search).set('limit', limit.toString());

        return this.http.get<Result<FormaPago[]>>(`${this.apiUrl}/search`, { params });
    }

    /**
     * Obtener los formas de pago más usados recientemente
     */
    getRecent(limit: number = 5): Observable<Result<FormaPago[]>> {
        let params = new HttpParams().set('limit', limit.toString());

        return this.http.get<Result<FormaPago[]>>(`${this.apiUrl}/recent`, { params });
    }

    /**
     * Crear una nueva forma de pago
     */
    create(nombre: string): Observable<Result<string>> {
        return this.http.post<Result<string>>(this.apiUrl, { nombre });
    }

    /**
     * Actualizar una forma de pago existente
     */
    update(id: string, formaPago: Partial<FormaPago>): Observable<Result<string>> {
        return this.http.put<Result<string>>(`${this.apiUrl}/${id}`, formaPago);
    }

    /**
     * Eliminar forma de pago
     */
    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { observe: 'response' }).pipe(
            map(() => undefined as void)
        );
    }
}
