import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse, ListResponse } from '@/core/models/common.model';

export interface CategoriaItem {
    id: string;
    nombre: string;
}

@Injectable({
    providedIn: 'root'
})
export class CategoriaService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/categorias`;

    /**
     * Búsqueda ligera de categorías por nombre
     * Solo devuelve {id, nombre} para rendimiento óptimo
     */
    search(search: string, limit: number = 10): Observable<CategoriaItem[]> {
        let params = new HttpParams()
            .set('search', search)
            .set('limit', limit.toString());

        return this.http.get<ApiResponse<ListResponse<CategoriaItem>>>(`${this.apiUrl}/search`, { params })
            .pipe(map(response => response.data.items));
    }

    /**
     * Obtener las categorías más usadas
     */
    getRecent(limit: number = 5): Observable<CategoriaItem[]> {
        let params = new HttpParams()
            .set('limit', limit.toString());

        return this.http.get<ApiResponse<ListResponse<CategoriaItem>>>(`${this.apiUrl}/recent`, { params })
            .pipe(map(response => response.data.items));
    }

    /**
     * Crear una nueva categoría
     */
    create(nombre: string): Observable<CategoriaItem> {
        return this.http.post<ApiResponse<CategoriaItem>>(this.apiUrl, { nombre })
            .pipe(map(response => response.data));
    }
}
