import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { DashboardStore } from '../../stores/dashboard.store';

@Component({
    selector: 'app-resumen-financiero',
    standalone: true,
    imports: [CommonModule, CardModule, ChartModule, SkeletonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        :host {
            display: block;
            width: 100%;
        }
    `],
    template: `
        <div class="card shadow-2 border-round p-4 surface-card w-full h-full flex flex-col">
            <div class="flex items-center justify-between mb-5 flex-none">
                <div>
                    <h5 class="text-900 font-bold text-xl m-0 flex items-center gap-2">
                        <i class="pi pi-chart-bar text-primary text-xl"></i>
                        Histórico Financiero
                    </h5>
                    <span class="text-500 text-sm">Análisis de los últimos 6 meses</span>
                </div>
            </div>
            
            @if (dashboardStore.loading()) {
                <div class="grid grid-cols-3 gap-4 mb-4">
                     @for (item of [1,2,3]; track item) {
                        <div class="p-3 surface-100 border-round h-24">
                            <p-skeleton width="60%" height="1rem" styleClass="mb-2"></p-skeleton>
                            <p-skeleton width="80%" height="2rem"></p-skeleton>
                        </div>
                    }
                </div>
                <div class="grow flex items-center justify-center" style="min-height: 300px">
                    <p-skeleton height="100%" width="100%"></p-skeleton>
                </div>
            } @else if (hasData()) {
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 flex-none">
                    <div class="p-3 border-round-xl bg-green-50 border border-green-200 flex flex-col items-center justify-center">
                        <span class="text-green-700 font-medium text-xs uppercase tracking-wider mb-1">Ingresos</span>
                        <span class="text-green-800 font-bold text-xl">{{ totalIngresos() | number:'1.2-2' }} €</span>
                    </div>

                    <div class="p-3 border-round-xl bg-red-50 border border-red-200 flex flex-col items-center justify-center">
                        <span class="text-red-700 font-medium text-xs uppercase tracking-wider mb-1">Gastos</span>
                        <span class="text-red-800 font-bold text-xl">{{ totalGastos() | number:'1.2-2' }} €</span>
                    </div>

                    <div class="p-3 border-round-xl flex flex-col items-center justify-center"
                        [ngClass]="balanceNeto() >= 0 ? 'bg-blue-50 border border-blue-200' : 'bg-orange-50 border border-orange-200'">
                        <span class="font-medium text-xs uppercase tracking-wider mb-1"
                              [ngClass]="balanceNeto() >= 0 ? 'text-blue-700' : 'text-orange-700'">Balance</span>
                        <span class="font-bold text-xl"
                              [ngClass]="balanceNeto() >= 0 ? 'text-blue-800' : 'text-orange-800'">
                             {{ balanceNeto() | number:'1.2-2' }} €
                        </span>
                    </div>
                </div>

                <div class="w-full relative h-24rem md:h-30rem">
                    <p-chart type="bar" [data]="chartData()" [options]="chartOptions" styleClass="w-full h-full"></p-chart>
                </div>

            } @else {
                <div class="text-center py-8 flex flex-col items-center gap-3">
                    <div class="surface-100 border-circle w-4rem h-4rem flex items-center justify-center">
                        <i class="pi pi-chart-line text-500 text-2xl"></i>
                    </div>
                    <div>
                        <p class="text-900 font-semibold mb-1">Sin datos suficientes</p>
                        <p class="text-600 text-sm m-0 max-w-xs mx-auto">Realiza movimientos para ver tu evolución.</p>
                    </div>
                </div>
            }
        </div>
    `
})
export class ResumenFinancieroComponent {
    dashboardStore = inject(DashboardStore);

    chartOptions = {
        // 1. Padding interno del Canvas para evitar cortes en los bordes
        layout: {
            padding: {
                top: 10,
                bottom: 10,
                left: 10,
                right: 15
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: { size: 12, family: "'Inter', sans-serif" },
                    color: '#64748b'
                }
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1e293b',
                bodyColor: '#475569',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                boxPadding: 6,
                usePointStyle: true,
                callbacks: {
                    label: (context: any) => {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(context.parsed.y);
                        }
                        return label;
                    }
                }
            }
        },
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                stacked: false, // Asegura que las barras no se apilen, sino que se agrupen
                grid: {
                    display: false,
                    drawBorder: false
                },
                ticks: {
                    color: '#64748b',
                    font: { size: 12 }
                }
            },
            y: {
                beginAtZero: true,
                // 2. GRACE: Esta es la clave. Añade 20% de espacio extra arriba del valor máximo.
                // Esto evita que la línea toque el techo del gráfico.
                grace: '20%', 
                border: { display: false },
                grid: {
                    color: '#f1f5f9',
                    borderDash: [5, 5]
                },
                ticks: {
                    color: '#94a3b8',
                    padding: 10,
                    callback: (value: any) => {
                        if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
                        return value;
                    }
                }
            }
        }
    };

    hasData = computed(() => {
        const historico = this.dashboardStore.historicoUltimos6Meses();
        return historico && historico.length > 0;
    });

    totalIngresos = computed(() => {
        const historico = this.dashboardStore.historicoUltimos6Meses();
        return historico?.reduce((sum, item) => sum + item.totalIngresos, 0) || 0;
    });

    totalGastos = computed(() => {
        const historico = this.dashboardStore.historicoUltimos6Meses();
        return historico?.reduce((sum, item) => sum + item.totalGastos, 0) || 0;
    });

    balanceNeto = computed(() => {
        return this.totalIngresos() - this.totalGastos();
    });

    chartData = computed(() => {
        const historico = this.dashboardStore.historicoUltimos6Meses();
        if (!historico || historico.length === 0) return null;

        const labels = historico.map(h => 
            h.mesNombre.charAt(0).toUpperCase() + h.mesNombre.slice(1)
        );

        return {
            labels,
            datasets: [
                {
                    type: 'line',
                    label: 'Balance Neto',
                    data: historico.map(h => h.balance),
                    borderColor: '#3b82f6',
                    backgroundColor: '#3b82f6',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#3b82f6',
                    pointBorderWidth: 2,
                    order: 0,
                    // 3. CLIP: FALSE. Permite dibujar fuera del área estricta del gráfico
                    // (útil para las curvas Bezier y los puntos en los bordes)
                    // @ts-ignore
                    clip: false 
                },
                {
                    type: 'bar',
                    label: 'Ingresos',
                    data: historico.map(h => h.totalIngresos),
                    backgroundColor: 'rgba(34, 197, 94, 0.7)',
                    hoverBackgroundColor: 'rgba(34, 197, 94, 0.9)',
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8,
                    borderSkipped: false,
                    order: 1
                },
                {
                    type: 'bar',
                    label: 'Gastos',
                    data: historico.map(h => h.totalGastos),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    hoverBackgroundColor: 'rgba(239, 68, 68, 0.9)',
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8,
                    borderSkipped: false,
                    order: 2
                }
            ]
        };
    });
}