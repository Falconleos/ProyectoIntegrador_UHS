import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

// Variable de control global para evitar múltiples peticiones simultáneas de refresco de token
let isRefreshing = false;

/**
 * Interceptor funcional de Angular para autenticación.
 * Adjunta el token JWT a las peticiones salientes y maneja la renovación automática (Refresh Token) ante errores 401.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = localStorage.getItem('authToken');

  // Clonamos la petición original para adjuntar el encabezado de autorización si el token existe
  let clonedReq = req;
  if (token) {
    clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Ejecutamos la petición y capturamos posibles errores HTTP
  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      
      // Si la respuesta es 401 (No autorizado) y no proviene de las rutas de autenticación públicas
      if (error.status === 401 && !req.url.includes('/public/auth/refresh') && !req.url.includes('/public/auth/login')) {
        
        // Si no hay un proceso de refresco activo en este momento, lo iniciamos
        if (!isRefreshing) {
          isRefreshing = true;

          return authService.refreshToken().pipe(
            switchMap((response: any) => {
              isRefreshing = false;
              
              // Guardamos el nuevo token recibido del servidor
              const newToken = response.accessToken; 
              localStorage.setItem('authToken', newToken);

              // Reintentamos la petición original que falló pero ahora con el nuevo token actualizado
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              return next(retryReq);
            }),
            catchError((refreshError) => {
              // Si el refresco del token también falla, limpiamos la sesión y propagamos el error
              isRefreshing = false;
              localStorage.removeItem('authToken');
              return throwError(() => refreshError);
            })
          );
        }
      }

      // Propagamos cualquier otro tipo de error HTTP
      return throwError(() => error);
    })
  );
};