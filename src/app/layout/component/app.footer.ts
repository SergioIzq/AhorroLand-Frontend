import { Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-footer',
    template: `<div class="card layout-footer mb-4">
                AhorroLand © 2025
                <span class="mx-2">|</span>
                    Desarrollado por <a href="https://sergioizq.com" target="_blank" class="text-primary font-bold hover:underline">sergioizq.dev</a>    
                </div>`
})
export class AppFooter {}
