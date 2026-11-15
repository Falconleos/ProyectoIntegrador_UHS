import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const noGuestGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  // Obtenemos el rol guardado en localStorage al iniciar sesión
  const userRole = localStorage.getItem('role') || '';
  const isGuest = userRole.toUpperCase().includes('GUEST');

  if (isGuest) {
    // Si es guest, lo mandamos automáticamente a la lista de reservas
    router.navigate(['/dashboard/booking-list']);
    return false;
  }

  // Si es admin o empleado, se le permite ver el inicio
  return true;
};