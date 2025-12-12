import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { PaginatedList, Result } from '@/core/models/common.model';
import { Traspaso, TraspasoCreate } from '@/core/models/traspaso.model';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class TraspasoService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/traspasos`;

    getTraspasos(
        page: number = 1,
        pageSize: number = 10,
        searchTerm?: string,
        sortColumn?: string,
        sortOrder?: string
    ): Observable<PaginatedList<Traspaso>> {
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

        return this.http.get<Result<PaginatedList<Traspaso>>>(this.apiUrl, { params })
                    .pipe(map(response => response.value));
    }

    /**
     * Crear traspaso
     */
    create(traspaso: TraspasoCreate): Observable<string> {
        return this.http.post<Result<string>>(this.apiUrl, traspaso).pipe(
            map((response) => {
                return response.value;
            })
        );
    }

    /**
     * Actualizar traspaso
     */
    update(id: string, traspaso: Partial<Traspaso>): Observable<string> {
        return this.http.put<Result<string>>(`${this.apiUrl}/${id}`, traspaso).pipe(
            map((response) => {
                return response.value;
            })
        );
    }

    /**
     * Eliminar traspaso
     */
    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { observe: 'response' }).pipe(
            map((response) => {
                // 204 No Content es éxito, no devuelve data
                return undefined as void;
            })
        );
    }
}
