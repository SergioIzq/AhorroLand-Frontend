import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Result, ListData } from '@/core/models/common.model';

export interface ConceptoItem {
    id: string;
    nombre: string;
}

@Injectable({
    providedIn: 'root'
})
export class ConceptoService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/conceptos`;

    /**
     * Búsqueda ligera de conceptos por nombre
     * Solo devuelve {id, nombre} para rendimiento óptimo
     */
    search(search: string, limit: number = 10): Observable<ConceptoItem[]> {
        let params = new HttpParams().set('search', search).set('limit', limit.toString());

        return this.http.get<Result<ListData<ConceptoItem>>>(`${this.apiUrl}/search`, { params })
            .pipe(map(response => response.value.items));
    }

    /**
     * Obtener los conceptos más usados recientemente
     */
    getRecent(limit: number = 5): Observable<ConceptoItem[]> {
        let params = new HttpParams().set('limit', limit.toString());

        return this.http.get<Result<ListData<ConceptoItem>>>(`${this.apiUrl}/recent`, { params })
            .pipe(map(response => response.value.items));
    }

    /**
     * Crear un nuevo concepto
     */
    create(nombre: string): Observable<string> {
        return this.http.post<Result<string>>(this.apiUrl, { nombre })
            .pipe(map(response => response.value));
    }
}
