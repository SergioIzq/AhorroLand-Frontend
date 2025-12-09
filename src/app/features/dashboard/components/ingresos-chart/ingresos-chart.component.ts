import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { DashboardStore } from '../../stores/dashboard.store';

@Component({
    selector: 'app-ingresos-chart',
    standalone: true,
    imports: [CommonModule, CardModule, ChartModule, SkeletonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    // 1. Aseguramos comportamiento de bloque
    styles: [`
        :host { display: block; height: 100%; }
    `],
    template: `
        <div class="card shadow-2 border-round p-4 h-full flex flex-col justify-between">
            
            <div class="mb-4">
                <div class="flex items-center justify-between mb-2">
                    <h5 class="text-900 font-semibold m-0 flex items-center gap-2">
                        <i class="pi pi-chart-line text-green-500"></i>
                        Comparativa Mensual
                    </h5>
                </div>
                <p class="text-600 text-sm m-0">
                    Evolución de tus ingresos y gastos.
                </p>
            </div>
            
            @if (dashboardStore.loading()) {
                <div class="grow flex items-center justify-center mb-4" style="min-height: 280px">
                    <p-skeleton height="100%" width="100%"></p-skeleton>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    @for (item of [1,2]; track item) {
                        <div class="surface-100 border-round p-3">
                            <p-skeleton width="70%" height="1rem" styleClass="mb-2"></p-skeleton>
                            <p-skeleton width="50%" height="1.5rem"></p-skeleton>
                        </div>
                    }
                </div>
            } @else if (hasData()) {
                
                <div class="w-full relative h-20rem"> 
                    <p-chart type="line" [data]="chartData()" [options]="chartOptions" styleClass="w-full h-full"></p-chart>
                </div>
                
                @if (dashboardStore.resumen()?.comparativaMesAnterior) {
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                        <div class="surface-50 border border-green-100 border-round p-3">
                            <div class="text-600 text-sm mb-2">Ingresos vs Mes anterior</div>
                            <div [class]="'font-bold text-lg flex items-center gap-2 ' + (dashboardStore.resumen()!.comparativaMesAnterior.diferenciaIngresos >= 0 ? 'text-green-600' : 'text-red-600')">
                                <i [class]="'pi ' + (dashboardStore.resumen()!.comparativaMesAnterior.diferenciaIngresos >= 0 ? 'pi-arrow-up' : 'pi-arrow-down')"></i>
                                {{ dashboardStore.resumen()!.comparativaMesAnterior.diferenciaIngresos | number:'1.2-2' }} €
                                <span class="text-sm text-600 font-normal">
                                    ({{ dashboardStore.resumen()!.comparativaMesAnterior.porcentajeCambioIngresos | number:'1.1-1' }}%)
                                </span>
                            </div>
                        </div>
                        
                        <div class="surface-50 border border-red-100 border-round p-3">
                            <div class="text-600 text-sm mb-2">Gastos vs Mes anterior</div>
                            <div [class]="'font-bold text-lg flex items-center gap-2 ' + (dashboardStore.resumen()!.comparativaMesAnterior.diferenciaGastos <= 0 ? 'text-green-600' : 'text-red-600')">
                                <i [class]="'pi ' + (dashboardStore.resumen()!.comparativaMesAnterior.diferenciaGastos <= 0 ? 'pi-arrow-down' : 'pi-arrow-up')"></i>
                                {{ Math.abs(dashboardStore.resumen()!.comparativaMesAnterior.diferenciaGastos) | number:'1.2-2' }} €
                                <span class="text-sm text-600 font-normal">
                                    ({{ Math.abs(dashboardStore.resumen()!.comparativaMesAnterior.porcentajeCambioGastos) | number:'1.1-1' }}%)
                                </span>
                            </div>
                        </div>
                    </div>
                }
            } @else {
                <div class="text-center py-8 flex flex-col items-center gap-3 grow justify-center">
                    <div class="surface-100 border-round inline-flex p-4">
                        <i class="pi pi-chart-line text-500" style="font-size: 3rem"></i>
                    </div>
                    <div>
                        <p class="text-900 font-semibold mb-1">No hay datos suficientes</p>
                        <p class="text-600 text-sm m-0">Se necesitan al menos 2 meses de datos.</p>
                    </div>
                </div>
            }
        </div>
    `
})
export class IngresosChartComponent {
    dashboardStore = inject(DashboardStore);
    Math = Math;

    chartOptions = {
        layout: {
            padding: {
                top: 10,
                bottom: 10,
                left: 10,
                right: 15
            }
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                align: 'end', // Alinea la leyenda a la derecha para que no estorbe
                labels: {
                    usePointStyle: true,
                    boxWidth: 8,
                    padding: 15,
                    font: { size: 11, weight: '500' }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1e293b',
                bodyColor: '#475569',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 10,
                callbacks: {
                    label: (context: any) => {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y || 0;
                        return `${label}: ${value.toFixed(2)}€`;
                    }
                }
            }
        },
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                grid: { display: false, drawBorder: false },
                ticks: { font: { size: 11 }, color: '#64748b' }
            },
            y: {
                beginAtZero: true,
                grace: '10%', // Añade un 10% de espacio arriba para que la curva no toque el techo
                border: { display: false },
                grid: { color: '#f8fafc', borderDash: [5, 5] },
                ticks: {
                    padding: 10,
                    color: '#94a3b8',
                    callback: function(value: any) {
                        if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
                        return value;
                    },
                    font: { size: 11 }
                }
            }
        }
    };

    hasData = computed(() => {
        const historico = this.dashboardStore.historicoUltimos6Meses();
        return historico && historico.length >= 2;
    });

    chartData = computed(() => {
        const historico = this.dashboardStore.historicoUltimos6Meses();
        if (!historico || historico.length < 2) return null;

        const ultimos3Meses = historico.slice(-3);
        const labels = ultimos3Meses.map(h => h.mesNombre.charAt(0).toUpperCase() + h.mesNombre.slice(1));

        return {
            labels,
            datasets: [
                {
                    label: 'Ingresos',
                    data: ultimos3Meses.map(h => h.totalIngresos),
                    borderColor: '#10b981', // green-500
                    backgroundColor: (context: any) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
                        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
                        return gradient;
                    },
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#10b981',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    // IMPORTANTE: Permite que la curva se dibuje fuera del área estricta si es necesario
                    // @ts-ignore
                    clip: false 
                },
                {
                    label: 'Gastos',
                    data: ultimos3Meses.map(h => h.totalGastos),
                    borderColor: '#ef4444', // red-500
                    backgroundColor: 'transparent', // Solo línea para gastos para reducir ruido visual
                    borderWidth: 2,
                    borderDash: [5, 5], // Línea punteada para gastos (diferenciación visual)
                    tension: 0.4,
                    fill: false,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#ef4444',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    // @ts-ignore
                    clip: false
                }
            ]
        };
    });
}