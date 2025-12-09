import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { DashboardStore } from '../../stores/dashboard.store';

@Component({
    selector: 'app-gastos-chart',
    standalone: true,
    imports: [CommonModule, CardModule, ChartModule, SkeletonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card shadow-2 border-round p-4 h-full flex flex-col justify-between">
            <div class="mb-4">
                <div class="flex items-center justify-between mb-2">
                    <h5 class="text-900 font-semibold m-0 flex items-center gap-2">
                        <i class="pi pi-chart-pie text-red-500"></i>
                        Gastos por Categoría
                    </h5>
                    @if (hasData()) {
                        <span class="text-sm text-red-500">{{ totalGastado() | number:'1.2-2' }} € total</span>
                    }
                </div>
                <p class="text-600 text-sm m-0">
                    Distribución de tus gastos del mes actual por categoría. El porcentaje muestra qué proporción representa cada categoría del total.
                </p>
            </div>
            
            @if (dashboardStore.loading()) {
                <div class="flex justify-center mb-4">
                    <p-skeleton shape="circle" size="280px"></p-skeleton>
                </div>
                <div class="grid grid-cols-1 gap-3">
                    @for (item of [1,2,3]; track item) {
                        <div>
                            <div class="surface-100 border-round p-3">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2 flex-1">
                                        <p-skeleton shape="circle" size="1rem"></p-skeleton>
                                        <p-skeleton width="60%" height="1rem"></p-skeleton>
                                    </div>
                                    <div>
                                        <p-skeleton width="4rem" height="1.2rem" styleClass="mb-1"></p-skeleton>
                                        <p-skeleton width="2.5rem" height="0.8rem"></p-skeleton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
                </div>
            } @else if (hasData()) {
                <div class="flex justify-center mb-4" style="height: 280px">
                    <p-chart type="doughnut" [data]="chartData()" [options]="chartOptions" styleClass="w-full" style="height: 100%"></p-chart>
                </div>
                
                <!-- Leyenda personalizada mejorada -->
                <div class="flex flex-col gap-3">
                    @for (item of categorias(); track item.categoria) {
                        <div class="surface-100 border-round p-3 hover:surface-200 transition-colors">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-2 flex-1">
                                    <div class="rounded-full shadow-sm" [style.background-color]="item.color" style="width:1.25rem;height:1.25rem"></div>
                                    <span class="text-900 font-semibold text-sm">{{ item.categoria }}</span>
                                </div>
                                <div class="text-right">
                                    <div class="text-red-600 font-bold text-lg">{{ item.total | number:'1.2-2' }} €</div>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <div class="flex-1 surface-300 border-round overflow-hidden" style="height: 6px">
                                    <div [style.background-color]="item.color" class="h-full transition-all" [style.width.%]="item.porcentaje"></div>
                                </div>
                                <span class="text-600 text-sm font-medium min-w-12 text-right">{{ item.porcentaje | number:'1.1-1' }}%</span>
                            </div>
                            <div class="text-500 text-xs mt-2 flex items-center gap-1">
                                <i class="pi pi-list"></i>
                                {{ item.transacciones }} {{ item.transacciones === 1 ? 'transacción' : 'transacciones' }}
                            </div>
                        </div>
                    }
                </div>
            } @else {
                <div class="text-center py-8 flex flex-col items-center gap-3">
                    <div class="surface-100 border-round inline-flex p-4">
                        <i class="pi pi-chart-pie text-500" style="font-size: 3rem"></i>
                    </div>
                    <div>
                        <p class="text-900 font-semibold mb-1">No hay gastos registrados</p>
                        <p class="text-600 text-sm m-0">Los gastos del mes actual aparecerán aquí</p>
                    </div>
                </div>
            }
        </div>
    `
})
export class GastosChartComponent {
    dashboardStore = inject(DashboardStore);

    // Paleta de colores moderna para gastos (rojos, naranjas, amarillos)
    private readonly colors = [
        '#EF4444', // red-500
        '#F97316', // orange-500
        '#F59E0B', // amber-500
        '#EC4899', // pink-500
        '#DC2626', // red-600
        '#FB923C', // orange-400
        '#FBBF24', // amber-400
        '#F472B6', // pink-400
        '#B91C1C', // red-700
        '#EA580C'  // orange-600
    ];

    chartOptions = {
        plugins: {
            legend: {
                display: false // Usamos leyenda personalizada
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: {
                    size: 14,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 13
                },
                callbacks: {
                    label: (context: any) => {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const dataset = context.dataset.data;
                        const transacciones = context.dataset.transacciones?.[context.dataIndex] || 0;
                        const total = dataset.reduce((a: number, b: number) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return [
                            `${label}`,
                            `Importe: ${value.toFixed(2)}€`,
                            `Porcentaje: ${percentage}%`,
                            `Transacciones: ${transacciones}`
                        ];
                    }
                }
            }
        },
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%' // Hace el donut más ancho
    };

    hasData = computed(() => {
        const categorias = this.dashboardStore.topCategoriasGastos();
        return categorias && categorias.length > 0;
    });

    totalGastado = computed(() => {
        const categorias = this.dashboardStore.topCategoriasGastos();
        if (!categorias || categorias.length === 0) return 0;
        return categorias.reduce((sum: number, cat) => sum + cat.totalGastado, 0);
    });

    categorias = computed(() => {
        const categorias = this.dashboardStore.topCategoriasGastos();
        if (!categorias || categorias.length === 0) return [];

        return categorias.map((cat, index) => ({
            categoria: cat.categoriaNombre,
            total: cat.totalGastado,
            porcentaje: cat.porcentajeDelTotal,
            transacciones: cat.cantidadTransacciones,
            color: this.colors[index % this.colors.length]
        }));
    });

    chartData = computed(() => {
        const cats = this.categorias();
        return {
            labels: cats.map(c => c.categoria),
            datasets: [
                {
                    data: cats.map(c => c.total),
                    backgroundColor: cats.map(c => c.color),
                    hoverBackgroundColor: cats.map(c => c.color),
                    transacciones: cats.map(c => c.transacciones),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }
            ]
        };
    });
}
