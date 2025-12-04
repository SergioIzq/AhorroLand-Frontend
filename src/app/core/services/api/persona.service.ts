import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ListData, Result } from '@/core/models/common.model';

export interface PersonaItem {
    id: string;
    nombre: string;
}

@Injectable({
    providedIn: 'root'
})
export class PersonaService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/personas`;

    /**
     * Búsqueda ligera de personas por nombre
     * Solo devuelve {id, nombre} para rendimiento óptimo
     */
    search(search: string, limit: number = 10): Observable<PersonaItem[]> {
        let params = new HttpParams()
            .set('search', search)
            .set('limit', limit.toString());

        return this.http.get<Result<ListData<PersonaItem>>>(`${this.apiUrl}/search`, { params })
            .pipe(map(response => response.value.items));
    }

    /**
     * Obtener las personas más usadas recientemente
     */
    getRecent(limit: number = 5): Observable<PersonaItem[]> {
        let params = new HttpParams()
            .set('limit', limit.toString());

        return this.http.get<Result<ListData<PersonaItem>>>(`${this.apiUrl}/recent`, { params })
            .pipe(map(response => response.value.items));
    }

    /**
     * Crear una nueva persona
     */
    create(nombre: string): Observable<string> {
        return this.http.post<Result<string>>(this.apiUrl, { nombre })
            .pipe(map(response => response.value));
    }
}
