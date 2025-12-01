import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';

import { routes } from './app.routes';
import { lucideIcons } from '@shared/icons/lucide-icons';
import { LIBRARY_API } from '@core/api/library-api.token';
import { HttpApiService } from '@core/services/http-api.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    importProvidersFrom(LucideAngularModule.pick(lucideIcons)),
    { provide: LIBRARY_API, useExisting: HttpApiService },
  ]
};
