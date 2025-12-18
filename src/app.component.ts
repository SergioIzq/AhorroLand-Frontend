import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
// Importaciones de PrimeNG que ya tenías
import { PrimeNG } from 'primeng/config';

// 1. NUEVAS IMPORTACIONES PARA PWA
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { interval } from 'rxjs'; // Opcional: para buscar actualizaciones periódicamente

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule],
    template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
    // Inyectamos la clase PrimeNG (Tu código original)
    private primeng = inject(PrimeNG);

    // 2. INYECTAMOS EL SERVICIO DE ACTUALIZACIONES (NUEVO)
    private swUpdate = inject(SwUpdate);

    ngOnInit() {
        // --- TU CONFIGURACIÓN ORIGINAL DE PRIMENG (INTACTA) ---
        this.primeng.setTranslation({
            firstDayOfWeek: 1,
            dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
            dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
            dayNamesMin: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
            monthNames: [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ],
            monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
            today: 'Hoy',
            clear: 'Limpiar',
            dateFormat: 'dd/mm/yy',
            weekHeader: 'Sem',
            weak: 'Débil',
            medium: 'Medio',
            strong: 'Fuerte',
            passwordPrompt: 'Introduzca una contraseña',
            emptyMessage: 'No se encontraron resultados',
            emptyFilterMessage: 'No se encontraron resultados'
        });
        
        this.primeng.ripple.set(true);
        // ----------------------------------------------------


        // 3. LÓGICA PARA ACTUALIZAR LA PWA (NUEVO)
        // Solo ejecutamos si el Service Worker está soportado y habilitado en el navegador
        if (this.swUpdate.isEnabled) {

            // A. Suscribirse cuando una nueva versión está descargada y lista (estado WAITING)
            this.swUpdate.versionUpdates
                .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
                .subscribe(() => {
                    // Usamos un confirm nativo para asegurar que se vea en móvil sobre cualquier UI
                    // Si prefieres usar un Dialog de PrimeNG, puedes cambiar esto luego.
                    if (confirm('¡Nueva versión disponible! ¿Actualizar ahora para ver los cambios?')) {
                        // Esto recarga la página y fuerza al nuevo SW a tomar el control
                        window.location.reload();
                    }
                });

            // B. (Opcional pero RECOMENDADO en Móviles)
            // A veces el móvil "duerme" la app y no detecta el cambio al instante.
            // Esto busca actualizaciones cada 1 hora automáticamente si la app sigue abierta.
            const horas = 1; 
            interval(horas * 60 * 60 * 1000).subscribe(() => {
                this.swUpdate.checkForUpdate().catch(e => console.error('Error buscando updates:', e));
            });
            
            // Buscar actualización inmediatamente al cargar (por si acaso quedó pendiente)
            this.swUpdate.checkForUpdate().catch(e => console.error(e));
        }
    }
}