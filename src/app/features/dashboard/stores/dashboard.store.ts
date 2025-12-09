import { computed, inject, effect } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { DashboardService } from '../../../core/services/api/dashboard.service';
import { DashboardResumen, HistoricoMensual } from '../../../core/models/dashboard.model';
import { GastosStore } from '../../gastos/stores/gastos.store';
import { IngresosStore } from '../../ingresos/stores/ingresos.store';

interface DashboardState {
    resumen: DashboardResumen | null;
    historico: HistoricoMensual[];
    loading: boolean;
    error: string | null;
    lastUpdated: number | null;
    autoRefreshEnabled: boolean;
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
    lastUpdated: null,
    autoRefreshEnabled: true,
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
        hasData: computed(() => store.resumen() !== null)
    })),
    
    withComputed((store) => ({
        isSyncing: computed(() => store.loading() && store.hasData())
    })),
    withMethods((store, dashboardService = inject(DashboardService)) => ({
        loadResumen: rxMethod<void>(
            pipe(
                tap(() => patchState(store, { loading: true, error: null })),
                switchMap(() =>
                    dashboardService.getResumen(store.filtros()).pipe(
                        tapResponse({
                            next: (resumen) => {
                                patchState(store, { 
                                    resumen, 
                                    loading: false,
                                    lastUpdated: Date.now()
                                });
                            },
                            error: (error: any) => {
                                patchState(store, { 
                                    loading: false, 
                                    error: error?.message || 'Error al cargar el resumen' 
                                });
                            }
                        })
                    )
                )
            )
        ),
        
        refresh(bypassCache: boolean = true) {
            patchState(store, { loading: true, error: null });
            
            const subscription = dashboardService.getResumen(store.filtros(), bypassCache).subscribe({
                next: (resumen) => {
                    patchState(store, { 
                        resumen, 
                        loading: false,
                        lastUpdated: Date.now()
                    });
                },
                error: (error: any) => {
                    console.error("Error al cargar resumen:", error);
                    patchState(store, { 
                        loading: false, 
                        error: error?.message || 'Error al cargar el resumen' 
                    });
                }
            });
            
            return subscription;
        },
        
        setFiltros(filtros: DashboardState['filtros']) {
            patchState(store, { filtros, loading: true, error: null });
            dashboardService.getResumen(filtros).subscribe({
                next: (resumen) => {
                    patchState(store, { 
                        resumen, 
                        loading: false,
                        lastUpdated: Date.now()
                    });
                },
                error: (error: any) => {
                    patchState(store, { 
                        loading: false, 
                        error: error?.message || 'Error al cargar el resumen' 
                    });
                }
            });
        },
        
        toggleAutoRefresh(enabled: boolean) {
            patchState(store, { autoRefreshEnabled: enabled });
        },
        
        clearError() {
            patchState(store, { error: null });
        }
    })),
    withHooks({
        onInit(store) {
            // Cargar datos iniciales
            store.refresh();
            
            // Inyectar stores de Gastos e Ingresos para sincronización automática
            const gastosStore = inject(GastosStore);
            const ingresosStore = inject(IngresosStore);
            
            // Effect para refrescar dashboard cuando cambian gastos
            effect(() => {
                const gastosUpdated = gastosStore.lastUpdated();
                const autoRefresh = store.autoRefreshEnabled();
                
                if (gastosUpdated && autoRefresh) {
                    console.log('[DASHBOARD] Detectado cambio en gastos, sincronizando...');
                    // Pequeño delay para permitir que el backend procese
                    setTimeout(() => store.refresh(true), 100);
                }
            });
            
            // Effect para refrescar dashboard cuando cambian ingresos
            effect(() => {
                const ingresosUpdated = ingresosStore.lastUpdated();
                const autoRefresh = store.autoRefreshEnabled();
                
                if (ingresosUpdated && autoRefresh) {
                    console.log('[DASHBOARD] Detectado cambio en ingresos, sincronizando...');
                    setTimeout(() => store.refresh(true), 100);
                }
            });
        }
    })
);
