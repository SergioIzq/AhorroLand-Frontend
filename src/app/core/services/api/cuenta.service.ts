import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Result, PaginatedList } from '@/core/models/common.model';
import { Cuenta } from '@/core/models/cuenta.model';

@Injectable({
    providedIn: 'root'
})
export class CuentaService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/cuentas`;

    /**
     * Obtener todas las cuentas con paginación, búsqueda y ordenamiento
     */
    getCuentas(
        page: number = 1,
        pageSize: number = 10,
        searchTerm?: string,
        sortColumn?: string,
        sortOrder?: string
    ): Observable<PaginatedList<Cuenta>> {
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

        // API devuelve Result<PaginatedList<Cuenta>>, extraer data
        return this.http.get<Result<PaginatedList<Cuenta>>>(`${this.apiUrl}`, { params })
            .pipe(map(response => response.value));
    }

    /**
     * Búsqueda ligera de cuentas por nombre
     * Solo devuelve {id, nombre} para rendimiento óptimo
     */
    search(search: string, limit: number = 10): Observable<Result<Cuenta[]>> {
        let params = new HttpParams().set('search', search).set('limit', limit.toString());

        return this.http.get<Result<Cuenta[]>>(`${this.apiUrl}/search`, { params });
    }

    /**
     * Obtener los cuentas más usados recientemente
     */
    getRecent(limit: number = 5): Observable<Result<Cuenta[]>> {
        let params = new HttpParams().set('limit', limit.toString());

        return this.http.get<Result<Cuenta[]>>(`${this.apiUrl}/recent`, { params });
    }

    /**
     * Crear una nueva cuenta
     */
    create(nombre: string, saldo: number): Observable<Result<string>> {
        return this.http.post<Result<string>>(this.apiUrl, { nombre, saldo });
    }

    /**
     * Actualizar una cuenta existente
     */
    update(id: string, cuenta: Partial<Cuenta>): Observable<Result<string>> {
        return this.http.put<Result<string>>(`${this.apiUrl}/${id}`, cuenta);
    }

    /**
     * Eliminar cuenta
     */
    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { observe: 'response' }).pipe(
            map(() => undefined as void)
        );
    }
}
