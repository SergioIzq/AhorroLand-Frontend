import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { DashboardResumen, HistoricoMensual } from '../../models/dashboard.model';
import { Result } from '../../models/common.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/dashboard`;

    getResumen(params?: {
        fechaInicio?: string;
        fechaFin?: string;
        cuentaId?: string;
        categoriaId?: string;
    }, bypassCache: boolean = false): Observable<DashboardResumen> {
        let httpParams = new HttpParams();
        if (params?.fechaInicio) httpParams = httpParams.set('fechaInicio', params.fechaInicio);
        if (params?.fechaFin) httpParams = httpParams.set('fechaFin', params.fechaFin);
        if (params?.cuentaId) httpParams = httpParams.set('cuentaId', params.cuentaId);
        if (params?.categoriaId) httpParams = httpParams.set('categoriaId', params.categoriaId);
        
        // Agregar timestamp para evitar caché cuando se solicita
        if (bypassCache) {
            httpParams = httpParams.set('_t', Date.now().toString());
        }
        
        return this.http.get<Result<DashboardResumen>>(`${this.apiUrl}/resumen`, { 
            params: httpParams,
            withCredentials: true 
        }).pipe(map(response => response.value));
    }

    getHistorico(meses: number = 12): Observable<HistoricoMensual[]> {
        const params = new HttpParams().set('meses', meses);
        return this.http.get<Result<HistoricoMensual[]>>(`${this.apiUrl}/historico`, { 
            params,
            withCredentials: true 
        }).pipe(map(response => response.value));
    }
}
