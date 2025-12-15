import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DashboardStore } from '../stores/dashboard.store';
import { AuthStore } from '../../../core/stores/auth.store';
import { GastosChartComponent } from '../components/gastos-chart/gastos-chart.component';
import { IngresosChartComponent } from '../components/ingresos-chart/ingresos-chart.component';
import { ResumenFinancieroComponent } from '../components/resumen-financiero/resumen-financiero.component';
import { BasePageComponent, BasePageTemplateComponent } from '@/shared/components';

@Component({
    selector: 'app-dashboard-page',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, GastosChartComponent, IngresosChartComponent, ResumenFinancieroComponent, BasePageTemplateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-base-page-template [loading]="dashboardStore.loading()" [skeletonType]="'card'">
            @if (dashboardStore.resumen()) {
            <!-- Header -->
            <div class="card flex items-center justify-between flex-wrap gap-3 mb-5 h-full">
                <div>
                    <h1 class="text-900 font-bold text-3xl md:text-4xl m-0 mb-2">Panel de Control</h1>
                    <p class="text-600 text-lg m-0">Bienvenid@, {{ authStore.userName() || 'Usuario' }}</p>
                </div>
                <div>
                    <p-button label="Actualizar" icon="pi pi-refresh" severity="info" [loading]="dashboardStore.loading()" (click)="dashboardStore.refresh()"> </p-button>
                </div>
            </div>

            <!-- Alertas -->
            @if (dashboardStore.resumen()?.alertas && dashboardStore.resumen()!.alertas.length > 0) {
                <div class="mb-4">
                    @for (alerta of dashboardStore.resumen()!.alertas; track alerta.titulo) {
                        <div [class]="'card p-4 mb-3 border-l-4 ' + getAlertaClass(alerta.tipo) + ' h-full'">
                            <div class="flex items-center gap-3">
                                <span class="text-2xl">{{ alerta.icono || '⚠️' }}</span>
                                <div class="flex-1">
                                    <div class="font-bold text-lg mb-1">{{ alerta.titulo }}</div>
                                    <div class="text-600">{{ alerta.mensaje }}</div>
                                </div>
                            </div>
                        </div>
                    }
                </div>
            }

            <!-- Resumen Financiero Principal -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <!-- Balance Total -->
                <div class="card shadow-2 border-round p-4 flex flex-col h-full">
                    <div class="flex items-center justify-between mb-3">
                        <div class="text-500 font-medium">Balance Total</div>
                        <i class="pi pi-wallet text-primary" style="font-size: 1.5rem"></i>
                    </div>
                    <div [class]="'font-bold text-3xl mb-2 ' + (dashboardStore.resumen()!.balanceTotal >= 0 ? 'text-green-500' : 'text-red-500')">
                        {{ dashboardStore.resumen()!.balanceTotal | number:'1.2-2' }} €
                    </div>
                    <div class="text-500 text-sm mt-auto">{{ dashboardStore.resumen()?.totalCuentas || 0 }} cuentas</div>
                </div>

                <!-- Ingresos Mes Actual -->
                <div class="card shadow-2 border-round p-4 flex flex-col h-full">
                    <div class="flex items-center justify-between mb-3">
                        <div class="text-500 font-medium">Ingresos Mes Actual</div>
                        <i class="pi pi-arrow-up text-green-500" style="font-size: 1.5rem"></i>
                    </div>
                    <div class="text-green-500 font-bold text-3xl mb-2">
                        {{ dashboardStore.resumen()?.ingresosMesActual | number:'1.2-2' }} €
                    </div>
                    <div class="mt-auto">
                        @if (dashboardStore.resumen()?.comparativaMesAnterior) {
                            <div [class]="'text-sm flex items-center gap-1 ' + (dashboardStore.resumen()!.comparativaMesAnterior.diferenciaIngresos >= 0 ? 'text-green-600' : 'text-red-600')">
                                <i [class]="'pi ' + (dashboardStore.resumen()!.comparativaMesAnterior.diferenciaIngresos >= 0 ? 'pi-arrow-up' : 'pi-arrow-down')"></i>
                                {{ dashboardStore.resumen()!.comparativaMesAnterior.diferenciaIngresos | number:'1.0-0' }} € vs mes anterior
                            </div>
                        } @else {
                            <div class="text-sm text-500">&nbsp;</div>
                        }
                    </div>
                </div>

                <!-- Gastos Mes Actual -->
                <div class="card shadow-2 border-round p-4 flex flex-col h-full">
                    <div class="flex items-center justify-between mb-3">
                        <div class="text-500 font-medium">Gastos Mes Actual</div>
                        <i class="pi pi-arrow-down text-red-500" style="font-size: 1.5rem"></i>
                    </div>
                    <div class="text-red-500 font-bold text-3xl mb-2">
                        {{ dashboardStore.resumen()?.gastosMesActual | number:'1.2-2' }} €
                    </div>
                    <div class="mt-auto">
                        @if (dashboardStore.resumen()?.comparativaMesAnterior) {
                            <div [class]="'text-sm flex items-center gap-1 ' + (dashboardStore.resumen()!.comparativaMesAnterior.diferenciaGastos <= 0 ? 'text-green-600' : 'text-red-600')">
                                <i [class]="'pi ' + (dashboardStore.resumen()!.comparativaMesAnterior.diferenciaGastos <= 0 ? 'pi-arrow-down' : 'pi-arrow-up')"></i>
                                {{ Math.abs(dashboardStore.resumen()!.comparativaMesAnterior.diferenciaGastos) | number:'1.0-0' }} € vs mes anterior
                            </div>
                        } @else {
                            <div class="text-sm text-500">&nbsp;</div>
                        }
                    </div>
                </div>

                <!-- Balance Mes Actual -->
                <div class="card shadow-2 border-round p-4 flex flex-col h-full">
                    <div class="flex items-center justify-between mb-3">
                        <div class="text-500 font-medium">Balance Mes Actual</div>
                        <i [class]="'pi ' + (dashboardStore.resumen()!.balanceMesActual >= 0 ? 'pi-check-circle text-green-500' : 'pi-times-circle text-red-500')" style="font-size: 1.5rem"></i>
                    </div>
                    <div [class]="'font-bold text-3xl mb-2 ' + (dashboardStore.resumen()!.balanceMesActual >= 0 ? 'text-green-500' : 'text-red-500')">
                        {{ dashboardStore.resumen()!.balanceMesActual | number:'1.2-2' }} €
                    </div>
                    <div class="text-500 text-sm mt-auto">Ingresos - Gastos</div>
                </div>
            </div>

            <!-- Cuentas y Top Categorías -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <!-- Cuentas -->
                <div class="card shadow-2 border-round p-4 h-full">
                    <h5 class="text-900 font-semibold text-xl mb-4 flex items-center gap-2">
                        <i class="pi pi-credit-card text-primary"></i>
                        Mis Cuentas ({{ dashboardStore.resumen()?.totalCuentas || 0 }})
                    </h5>
                    <div class="flex flex-col gap-3">
                        @for (cuenta of dashboardStore.resumen()?.cuentas; track cuenta.id) {
                            <div class="flex items-center justify-between p-3 surface-border border-round hover:surface-hover transition-colors">
                                <div class="flex items-center gap-3">
                                    <i class="pi pi-wallet text-500"></i>
                                    <span class="font-medium text-900">{{ cuenta.nombre }}</span>
                                </div>
                                <span [class]="'font-bold ' + (cuenta.saldo >= 0 ? 'text-green-600' : 'text-red-600')">
                                    {{ cuenta.saldo | number:'1.2-2':'es-ES' }} €
                                </span>
                            </div>
                        }
                    </div>
                </div>

                <!-- Top Categorías de Gastos -->
                <div class="card shadow-2 border-round p-4 h-full">
                    <h5 class="text-900 font-semibold text-xl mb-4 flex items-center gap-2">
                        <i class="pi pi-chart-pie text-orange-500"></i>
                        Top Categorías de Gastos
                    </h5>
                    <div class="flex flex-col gap-3">
                        @for (categoria of dashboardStore.resumen()?.topCategoriasGastos; track categoria.categoriaId) {
                            <div class="p-3 surface-border border-round">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="font-medium text-900">{{ categoria.categoriaNombre }}</span>
                                    <span class="font-bold text-red-500">{{ categoria.totalGastado | number:'1.2-2' }} €</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <div class="flex-1 surface-200 border-round" style="height: 8px">
                                        <div class="bg-red-500 border-round h-full" [style.width.%]="categoria.porcentajeDelTotal"></div>
                                    </div>
                                    <span class="text-500 text-sm">{{ categoria.porcentajeDelTotal | number:'1.0-0' }}%</span>
                                </div>
                                <div class="text-500 text-sm mt-1">{{ categoria.cantidadTransacciones }} transacciones</div>
                            </div>
                        }
                        @empty {
                            <div class="text-center text-500 py-4">No hay gastos este mes</div>
                        }
                    </div>
                </div>
            </div>

            <!-- Estadísticas y Proyecciones -->
            <div class="card shadow-2 border-round p-4 mb-4 h-full">
                <h5 class="text-900 font-semibold text-xl mb-4">Estadísticas del Mes</h5>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="surface-border border-round p-4 text-center">
                        <i class="pi pi-calendar text-primary mb-3" style="font-size: 2.5rem"></i>
                        <div class="text-900 font-bold text-2xl mb-2">
                            {{ dashboardStore.diasTranscurridosMes() }} / {{ dashboardStore.diasTranscurridosMes() + dashboardStore.diasRestantesMes() }}
                        </div>
                        <div class="text-600 text-sm">Días transcurridos</div>
                    </div>

                    <div class="surface-border border-round p-4 text-center">
                        <i class="pi pi-clock text-cyan-500 mb-3" style="font-size: 2.5rem"></i>
                        <div class="text-900 font-bold text-2xl mb-2">{{ dashboardStore.diasRestantesMes() }}</div>
                        <div class="text-600 text-sm">Días restantes</div>
                    </div>

                    <div class="surface-border border-round p-4 text-center">
                        <i class="pi pi-chart-line text-orange-500 mb-3" style="font-size: 2.5rem"></i>
                        <div class="text-900 font-bold text-2xl mb-2">
                            {{ dashboardStore.gastoPromedioDiario() | number:'1.0-0' }} €
                        </div>
                        <div class="text-600 text-sm">Gasto promedio diario</div>
                    </div>

                    <div class="surface-border border-round p-4 text-center">
                        <i class="pi pi-chart-bar text-purple-500 mb-3" style="font-size: 2.5rem"></i>
                        <div class="text-900 font-bold text-2xl mb-2">
                            {{ dashboardStore.proyeccionGastosFinMes() | number:'1.0-0' }} €
                        </div>
                        <div class="text-600 text-sm">Proyección fin de mes</div>
                    </div>
                </div>
            </div>

            <!-- Últimos Movimientos -->
            <div class="card shadow-2 border-round p-4 mb-4 h-full">
                <h5 class="text-900 font-semibold text-xl mb-4 flex items-center gap-2">
                    <i class="pi pi-list text-cyan-500"></i>
                    Últimos Movimientos
                </h5>
                <div class="flex flex-col gap-2">
                    @for (movimiento of dashboardStore.resumen()?.ultimosMovimientos; track movimiento.id) {
                        <div class="flex items-center justify-between p-3 surface-border border-round hover:surface-hover transition-colors">
                            <div class="flex items-center gap-3 flex-1">
                                <i [class]="'pi ' + (movimiento.tipo === 'Ingreso' ? 'pi-arrow-up text-green-500' : 'pi-arrow-down text-red-500')" style="font-size: 1.5rem"></i>
                                <div class="flex-1">
                                    <div class="font-medium text-900">{{ movimiento.concepto }}</div>
                                    <div class="text-500 text-sm">{{ movimiento.categoria }} • {{ movimiento.cuenta }}</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div [class]="'font-bold text-lg ' + (movimiento.tipo === 'Ingreso' ? 'text-green-600' : 'text-red-600')">
                                    {{ (movimiento.tipo === 'Ingreso' ? '+' : '-') }}{{ movimiento.importe | number:'1.2-2':'es-ES' }} €
                                </div>
                                <div class="text-500 text-sm">{{ movimiento.fecha | date:'dd/MM/yyyy' }}</div>
                            </div>
                        </div>
                    }
                    @empty {
                        <div class="text-center text-500 py-4">No hay movimientos recientes</div>
                    }
                </div>
            </div>

            <!-- Charts y Comparativa -->
            <div class="grid grid-cols-1 gap-4 mb-4">
                <!-- Histórico 6 meses -->
                <div class="w-full">
                    <app-resumen-financiero />
                </div>
                
                <!-- Gastos e Ingresos lado a lado -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div class="w-full">
                        <app-gastos-chart />
                    </div>
                    
                    <div class="w-full">
                        <app-ingresos-chart />
                    </div>
                </div>
            </div>

            <!-- Histórico Últimos 6 Meses -->
            @if (dashboardStore.resumen()?.historicoUltimos6Meses && dashboardStore.resumen()!.historicoUltimos6Meses.length > 0) {
                <div class="card shadow-2 border-round p-4 mb-4 h-full">
                    <h5 class="text-900 font-semibold text-xl mb-4 flex items-center gap-2">
                        <i class="pi pi-calendar text-indigo-500"></i>
                        Histórico Últimos 6 Meses
                    </h5>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr class="border-b surface-border">
                                    <th class="text-left p-3 text-600 font-medium">Mes</th>
                                    <th class="text-right p-3 text-600 font-medium">Ingresos</th>
                                    <th class="text-right p-3 text-600 font-medium">Gastos</th>
                                    <th class="text-right p-3 text-600 font-medium">Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (historico of dashboardStore.resumen()!.historicoUltimos6Meses; track historico.mes) {
                                    <tr class="border-b surface-border hover:surface-hover transition-colors">
                                        <td class="p-3 font-medium text-900">{{ historico.mesNombre | titlecase }} {{ historico.anio }}</td>
                                        <td class="p-3 text-right text-green-600 font-medium">{{ historico.totalIngresos | number:'1.2-2' }} €</td>
                                        <td class="p-3 text-right text-red-600 font-medium">{{ historico.totalGastos | number:'1.2-2' }} €</td>
                                        <td [class]="'p-3 text-right font-bold ' + (historico.balance >= 0 ? 'text-green-600' : 'text-red-600')">
                                            {{ historico.balance | number:'1.2-2' }} €
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            }

            <!-- Quick Actions -->
            <div class="card shadow-2 border-round p-4 h-full">
                <h5 class="text-900 font-semibold text-xl mb-4">Acciones Rápidas</h5>
                <div class="flex flex-wrap gap-3">
                    <p-button label="Ver Gastos" icon="pi pi-list" [outlined]="true" [routerLink]="['/gastos']"> </p-button>
                    <p-button label="Ver Ingresos" icon="pi pi-list" [outlined]="true" [routerLink]="['/ingresos']"> </p-button>
                </div>
            </div>
            }
        </app-base-page-template>
    `
})
export class DashboardPage extends BasePageComponent {
    dashboardStore = inject(DashboardStore);
    authStore = inject(AuthStore);

    protected override loadingSignal = this.dashboardStore.loading;
    protected override skeletonType = 'card' as const;

    // Exponer Math para usar en el template
    Math = Math;

    getAlertaClass(tipo: string): string {
        const classes: Record<string, string> = {
            'danger': 'border-red-500 bg-red-50',
            'warning': 'border-orange-500 bg-orange-50',
            'info': 'border-blue-500 bg-blue-50',
            'success': 'border-green-500 bg-green-50'
        };
        return classes[tipo] || 'border-gray-500 bg-gray-50';
    }
}
