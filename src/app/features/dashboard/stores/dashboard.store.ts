import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { DashboardService } from '../../../core/services/api/dashboard.service';
import { DashboardResumen, HistoricoMensual } from '../../../core/models/dashboard.model';

interface DashboardState {
    resumen: DashboardResumen | null;
    historico: HistoricoMensual[];
    loading: boolean;
    error: string | null;
    filtros: {
        fechaInicio?: string;
        fechaFin?: string;
        cuentaId?: string;
        categoriaId?: string;
    };
}

const initialState: DashboardState = {
    resumen: null,
    historico: [],
    loading: false,
    error: null,
    filtros: {}
};

/**
 * Signal Store para el Dashboard
 * Agrega datos de gastos e ingresos en un resumen financiero completo
 * Optimizado para cálculos reactivos y caché
 */

export const DashboardStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),
    withComputed((store) => ({
        balanceTotal: computed(() => store.resumen()?.balanceTotal ?? 0),
        ingresosMesActual: computed(() => store.resumen()?.ingresosMesActual ?? 0),
        gastosMesActual: computed(() => store.resumen()?.gastosMesActual ?? 0),
        balanceMesActual: computed(() => store.resumen()?.balanceMesActual ?? 0),
        totalCuentas: computed(() => store.resumen()?.totalCuentas ?? 0),
        cuentas: computed(() => store.resumen()?.cuentas ?? []),
        topCategoriasGastos: computed(() => store.resumen()?.topCategoriasGastos ?? []),
        ultimosMovimientos: computed(() => store.resumen()?.ultimosMovimientos ?? []),
        comparativaMesAnterior: computed(() => store.resumen()?.comparativaMesAnterior),
        gastoPromedioDiario: computed(() => store.resumen()?.gastoPromedioDiario ?? 0),
        proyeccionGastosFinMes: computed(() => store.resumen()?.proyeccionGastosFinMes ?? 0),
        diasTranscurridosMes: computed(() => store.resumen()?.diasTranscurridosMes ?? 0),
        diasRestantesMes: computed(() => store.resumen()?.diasRestantesMes ?? 0),
        historicoUltimos6Meses: computed(() => store.resumen()?.historicoUltimos6Meses ?? []),
        alertas: computed(() => store.resumen()?.alertas ?? []),
        historico: computed(() => store.historico())
    })),
    withMethods((store, dashboardService = inject(DashboardService)) => ({
        loadResumen: rxMethod<void>(
            pipe(
                tap(() => patchState(store, { loading: true, error: null })),
                switchMap(() =>
                    dashboardService.getResumen(store.filtros()).pipe(
                        tapResponse({
                            next: (resumen) => {
                                patchState(store, { resumen, loading: false });
                            },
                            error: (error: any) => {
                                patchState(store, { loading: false, error: error?.message || 'Error al cargar el resumen' });
                            }
                        })
                    )
                )
            )
        ),
        refresh() {
            patchState(store, { loading: true, error: null });
            
            // Usar bypassCache: true para forzar la petición al servidor
            const subscription = dashboardService.getResumen(store.filtros(), true).subscribe({
                next: (resumen) => {
                    patchState(store, { resumen, loading: false });
                },
                error: (error: any) => {
                    console.error("Error al cargar resumen:", error);
                    patchState(store, { loading: false, error: error?.message || 'Error al cargar el resumen' });
                }
            });
            
            return subscription;
        },
        setFiltros(filtros: DashboardState['filtros']) {
            patchState(store, { filtros, loading: true, error: null });
            dashboardService.getResumen(filtros).subscribe({
                next: (resumen) => {
                    patchState(store, { resumen, loading: false });
                },
                error: (error: any) => {
                    patchState(store, { loading: false, error: error?.message || 'Error al cargar el resumen' });
                }
            });
        },
        loadHistorico: rxMethod<number>(
            pipe(
                tap(() => patchState(store, { loading: true, error: null })),
                switchMap((meses) =>
                    dashboardService.getHistorico(meses).pipe(
                        tapResponse({
                            next: (historico) => {
                                patchState(store, { historico, loading: false });
                            },
                            error: (error: any) => {
                                patchState(store, { loading: false, error: error?.message || 'Error al cargar el histórico' });
                            }
                        })
                    )
                )
            )
        ),
        clearError() {
            patchState(store, { error: null });
        }
    })),
    withHooks({
        onInit(store) {
            store.refresh();
        }
    })
);
