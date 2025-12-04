import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ListData, Result } from '@/core/models/common.model';

export interface ProveedorItem {
    id: string;
    nombre: string;
}

@Injectable({
    providedIn: 'root'
})
export class ProveedorService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/proveedores`;

    /**
     * Búsqueda ligera de proveedores por nombre
     * Solo devuelve {id, nombre} para rendimiento óptimo
     */
    search(searchTerm: string, limit: number = 10): Observable<ProveedorItem[]> {
        let params = new HttpParams()
            .set('searchTerm', searchTerm)
            .set('limit', limit.toString());

        return this.http.get<Result<ListData<ProveedorItem>>>(`${this.apiUrl}/search`, { params })
            .pipe(map(response => response.value.items));
    }

    /**
     * Obtener los proveedores más usados recientemente
     */
    getRecent(limit: number = 5): Observable<ProveedorItem[]> {
        let params = new HttpParams()
            .set('limit', limit.toString());

        return this.http.get<Result<ListData<ProveedorItem>>>(`${this.apiUrl}/recent`, { params })
            .pipe(map(response => response.value.items));
    }

    /**
     * Crear un nuevo proveedor
     */
    create(nombre: string): Observable<ProveedorItem> {
        return this.http.post<Result<ProveedorItem>>(this.apiUrl, { nombre })
            .pipe(map(response => response.value));
    }
}
