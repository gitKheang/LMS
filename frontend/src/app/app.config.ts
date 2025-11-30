import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { routes } from './app.routes';
import { lucideIcons } from '@shared/icons/lucide-icons';
import { LIBRARY_API } from '@core/api/library-api.token';
import { MockApiService } from '@core/services/mock-api.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    importProvidersFrom(LucideAngularModule.pick(lucideIcons)),
    { provide: LIBRARY_API, useExisting: MockApiService },
  ]
};
