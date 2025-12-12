import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Result, PaginatedList } from '@/core/models/common.model';
import { Persona } from '@/core/models/persona.model';

@Injectable({
    providedIn: 'root'
})
export class PersonaService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/personas`;

    /**
     * Obtener todas las personas con paginación, búsqueda y ordenamiento
     */
    getPersonas(
        page: number = 1,
        pageSize: number = 10,
        searchTerm?: string,
        sortColumn?: string,
        sortOrder?: string
    ): Observable<PaginatedList<Persona>> {
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

        // API devuelve Result<PaginatedList<Persona>>, extraer data
        return this.http.get<Result<PaginatedList<Persona>>>(`${this.apiUrl}`, { params })
            .pipe(map(response => response.value));
    }

    /**
     * Búsqueda ligera de personas por nombre
     * Solo devuelve {id, nombre} para rendimiento óptimo
     */
    search(search: string, limit: number = 10): Observable<Result<Persona[]>> {
        let params = new HttpParams().set('search', search).set('limit', limit.toString());

        return this.http.get<Result<Persona[]>>(`${this.apiUrl}/search`, { params });
    }

    /**
     * Obtener los personas más usados recientemente
     */
    getRecent(limit: number = 5): Observable<Result<Persona[]>> {
        let params = new HttpParams().set('limit', limit.toString());

        return this.http.get<Result<Persona[]>>(`${this.apiUrl}/recent`, { params });
    }

    /**
     * Crear una nueva persona
     * El backend devuelve 201 con Result<string> donde value es el UUID creado
     */
    create(nombre: string): Observable<Result<string>> {
        return this.http.post<Result<string>>(this.apiUrl, { nombre });
    }

    /**
     * Actualizar una persona existente
     */
    update(id: string, persona: Partial<Persona>): Observable<Result<string>> {
        return this.http.put<Result<string>>(`${this.apiUrl}/${id}`, persona);
    }

    /**
     * Eliminar persona
     */
    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { observe: 'response' }).pipe(
            map(() => undefined as void)
        );
    }
}
