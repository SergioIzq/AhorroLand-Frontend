import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Result, PaginatedList } from '@/core/models/common.model';
import { Categoria } from '@/core/models/categoria.model';

@Injectable({
    providedIn: 'root'
})
export class CategoriaService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/categorias`;

    /**
     * Obtener categorías paginadas
     */
    getCategorias(page: number = 1, pageSize: number = 10, searchTerm: string = '', sortColumn: string = 'nombre', sortOrder: string = 'asc'): Observable<PaginatedList<Categoria>> {
        let params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString()).set('sortColumn', sortColumn).set('sortOrder', sortOrder);

        if (searchTerm) {
            params = params.set('searchTerm', searchTerm);
        }

        return this.http.get<Result<PaginatedList<Categoria>>>(this.apiUrl, { params }).pipe(map((response) => response.value));
    }

    /**
     * Búsqueda ligera de categorias por nombre
     * Solo devuelve {id, nombre} para rendimiento óptimo
     */
    search(search: string, limit: number = 10): Observable<Result<Categoria[]>> {
        let params = new HttpParams().set('search', search).set('limit', limit.toString());

        return this.http.get<Result<Categoria[]>>(`${this.apiUrl}/search`, { params });
    }

    /**
     * Obtener los categorias más usados recientemente
     */
    getRecent(limit: number = 5): Observable<Result<Categoria[]>> {
        let params = new HttpParams().set('limit', limit.toString());

        return this.http.get<Result<Categoria[]>>(`${this.apiUrl}/recent`, { params });
    }

    /**
     * Crear una nueva categoría
     * El backend devuelve 201 con Result<string> donde value es el UUID creado
     */
    create(nombre: string): Observable<Result<string>> {
        return this.http.post<Result<string>>(this.apiUrl, { nombre });
    }

    /**
     * Actualizar una categoría existente
     */
    update(id: string, categoria: Partial<Categoria>): Observable<Result<string>> {
        return this.http.put<Result<string>>(`${this.apiUrl}/${id}`, categoria);
    }

    /**
     * Eliminar una categoría
     */
    delete(id: string): Observable<Result<void>> {
        return this.http.delete<Result<void>>(`${this.apiUrl}/${id}`);
    }
}
