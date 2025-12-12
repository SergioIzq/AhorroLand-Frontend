import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
// 1. IMPORTANTE: En v20 se importa 'PrimeNG' desde 'primeng/config'
import { PrimeNG } from 'primeng/config';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule],
    template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
    // 2. Inyectamos la clase PrimeNG
    private primeng = inject(PrimeNG);

    ngOnInit() {
        // 3. Configuramos la traducción
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
        
        // En v20 el ripple también se configura aquí
        this.primeng.ripple.set(true);
    }
}