import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Result, PaginatedList } from '@/core/models/common.model';
import { Cliente } from '@/core/models/cliente.model';

@Injectable({
    providedIn: 'root'
})
export class ClienteService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/clientes`;

    /**
     * Obtener todas las clientes con paginación, búsqueda y ordenamiento
     */
    getClientes(
        page: number = 1,
        pageSize: number = 10,
        searchTerm?: string,
        sortColumn?: string,
        sortOrder?: string
    ): Observable<PaginatedList<Cliente>> {
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

        // API devuelve Result<PaginatedList<Cliente>>, extraer data
        return this.http.get<Result<PaginatedList<Cliente>>>(`${this.apiUrl}`, { params })
            .pipe(map(response => response.value));
    }

    /**
     * Búsqueda ligera de clientes por nombre
     * Solo devuelve {id, nombre} para rendimiento óptimo
     */
    search(search: string, limit: number = 10): Observable<Result<Cliente[]>> {
        let params = new HttpParams().set('search', search).set('limit', limit.toString());

        return this.http.get<Result<Cliente[]>>(`${this.apiUrl}/search`, { params });
    }

    /**
     * Obtener los clientes más usados recientemente
     */
    getRecent(limit: number = 5): Observable<Result<Cliente[]>> {
        let params = new HttpParams().set('limit', limit.toString());

        return this.http.get<Result<Cliente[]>>(`${this.apiUrl}/recent`, { params });
    }

    /**
     * Crear una nueva cliente
     */
    create(nombre: string): Observable<Result<string>> {
        return this.http.post<Result<string>>(this.apiUrl, { nombre });
    }

    /**
     * Actualizar una cliente existente
     */
    update(id: string, cliente: Partial<Cliente>): Observable<Result<string>> {
        return this.http.put<Result<string>>(`${this.apiUrl}/${id}`, cliente);
    }

    /**
     * Eliminar cliente
     */
    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { observe: 'response' }).pipe(
            map(() => undefined as void)
        );
    }
}
