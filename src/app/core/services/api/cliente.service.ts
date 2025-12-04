import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Result, ListData } from '@/core/models/common.model';

export interface ClienteItem {
    id: string;
    nombre: string;
}

@Injectable({
    providedIn: 'root'
})
export class ClienteService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/clientes`;

    /**
     * Búsqueda ligera de clientes por nombre
     * Solo devuelve {id, nombre} para rendimiento óptimo
     */
    search(searchTerm: string, limit: number = 10): Observable<ClienteItem[]> {
        let params = new HttpParams()
            .set('searchTerm', searchTerm)
            .set('limit', limit.toString());

        return this.http.get<Result<ListData<ClienteItem>>>(`${this.apiUrl}/search`, { params })
            .pipe(map(response => response.value.items));
    }

    /**
     * Obtener los clientes más usados recientemente
     */
    getRecent(limit: number = 5): Observable<ClienteItem[]> {
        let params = new HttpParams()
            .set('limit', limit.toString());

        return this.http.get<Result<ListData<ClienteItem>>>(`${this.apiUrl}/recent`, { params })
            .pipe(map(response => response.value.items));
    }

    /**
     * Crear un nuevo cliente
     */
    create(nombre: string): Observable<ClienteItem> {
        return this.http.post<Result<ClienteItem>>(this.apiUrl, { nombre })
            .pipe(map(response => response.value));
    }
}
