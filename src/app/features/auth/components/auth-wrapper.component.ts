import { Component, Input } from '@angular/core';
import { AppFloatingConfigurator } from '../../../layout/component/app.floatingconfigurator';
import { ToastModule } from 'primeng/toast';
import { AppLogo } from '@/layout/component/app.logo';

@Component({
    selector: 'app-auth-wrapper',
    standalone: true,
    imports: [AppFloatingConfigurator, ToastModule, AppLogo],
    template: `
        <app-floating-configurator />
        <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen overflow-hidden">
            <div class="flex flex-col items-center justify-center">
                <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                    <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
                        <div class="text-center mb-8">
                            <app-logo class="h-20" />
                            <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">{{ title }}</div>
                            <span class="text-muted-color font-medium">{{ subtitle }}</span>
                        </div>

                        <ng-content></ng-content>
                    </div>
                </div>
            </div>
        </div>
        <p-toast></p-toast>
    `
})
export class AuthWrapperComponent {
    @Input({ required: true }) title: string = '';
    @Input({ required: true }) subtitle: string = '';
}
