import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from '../app/core/interceptors/auth';
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // Agregamos el cliente HTTP con tu interceptor sin tocar la detección de zonas
    provideHttpClient(withXhr(), withInterceptors([authInterceptor]))
  ]
};