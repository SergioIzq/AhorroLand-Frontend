import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Result, PaginatedList } from '@/core/models/common.model';
import { Concepto } from '@/core/models/concepto.model';

@Injectable({
    providedIn: 'root'
})
export class ConceptoService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/conceptos`;

    /**
     * Obtener conceptos paginados
     */
    getConceptos(page: number = 1, pageSize: number = 10, searchTerm: string = '', sortColumn: string = 'nombre', sortOrder: string = 'asc'): Observable<PaginatedList<Concepto>> {
        let params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString()).set('sortColumn', sortColumn).set('sortOrder', sortOrder);

        if (searchTerm) {
            params = params.set('searchTerm', searchTerm);
        }

        return this.http.get<Result<PaginatedList<Concepto>>>(`${this.apiUrl}`, { params }).pipe(map((response) => response.value));
    }

    /**
     * Búsqueda ligera de conceptos por nombre
     * Solo devuelve {id, nombre} para rendimiento óptimo
     */
    search(search: string, limit: number = 10, categoriaId?: string): Observable<Result<Concepto[]>> {
        let params = new HttpParams().set('search', search).set('limit', limit.toString());
        if (categoriaId) {
            params = params.set('categoriaId', categoriaId);
        }

        return this.http.get<Result<Concepto[]>>(`${this.apiUrl}/search`, { params });
    }

    /**
     * Obtener los conceptos más usados recientemente
     */
    getRecent(limit: number = 5, categoriaId?: string): Observable<Result<Concepto[]>> {
        let params = new HttpParams().set('limit', limit.toString());
        if (categoriaId) {
            params = params.set('categoriaId', categoriaId);
        }

        return this.http.get<Result<Concepto[]>>(`${this.apiUrl}/recent`, { params });
    }

    /**
     * Crear un nuevo concepto
     * El backend devuelve 201 con Result<string> donde value es el UUID creado
     */
    create(nombre: string, categoriaId: string): Observable<Result<string>> {
        return this.http.post<Result<string>>(this.apiUrl, { nombre, categoriaId });
    }

    /**
     * Actualizar un concepto existente
     */
    update(id: string, concepto: Partial<Concepto>): Observable<Result<string>> {
        return this.http.put<Result<string>>(`${this.apiUrl}/${id}`, concepto);
    }

    /**
     * Eliminar un concepto
     */
    delete(id: string): Observable<Result<void>> {
        return this.http.delete<Result<void>>(`${this.apiUrl}/${id}`);
    }
}
