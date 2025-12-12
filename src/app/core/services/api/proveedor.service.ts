import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Result, PaginatedList } from '@/core/models/common.model';
import { Proveedor } from '@/core/models/proveedor.model';

@Injectable({
    providedIn: 'root'
})
export class ProveedorService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/proveedores`;

    /**
     * Obtener todas las proveedores con paginación, búsqueda y ordenamiento
     */
    getProveedores(
        page: number = 1,
        pageSize: number = 10,
        searchTerm?: string,
        sortColumn?: string,
        sortOrder?: string
    ): Observable<PaginatedList<Proveedor>> {
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

        // API devuelve Result<PaginatedList<Proveedor>>, extraer data
        return this.http.get<Result<PaginatedList<Proveedor>>>(`${this.apiUrl}`, { params })
            .pipe(map(response => response.value));
    }

    /**
     * Búsqueda ligera de proveedores por nombre
     * Solo devuelve {id, nombre} para rendimiento óptimo
     */
    search(search: string, limit: number = 10): Observable<Result<Proveedor[]>> {
        let params = new HttpParams().set('search', search).set('limit', limit.toString());

        return this.http.get<Result<Proveedor[]>>(`${this.apiUrl}/search`, { params });
    }

    /**
     * Obtener los proveedores más usados recientemente
     */
    getRecent(limit: number = 5): Observable<Result<Proveedor[]>> {
        let params = new HttpParams().set('limit', limit.toString());

        return this.http.get<Result<Proveedor[]>>(`${this.apiUrl}/recent`, { params });
    }

    /**
     * Crear una nueva proveedor
     */
    create(nombre: string): Observable<Result<string>> {
        return this.http.post<Result<string>>(this.apiUrl, { nombre });
    }

    /**
     * Actualizar una proveedor existente
     */
    update(id: string, proveedor: Partial<Proveedor>): Observable<Result<string>> {
        return this.http.put<Result<string>>(`${this.apiUrl}/${id}`, proveedor);
    }

    /**
     * Eliminar proveedor
     */
    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { observe: 'response' }).pipe(
            map(() => undefined as void)
        );
    }
}
