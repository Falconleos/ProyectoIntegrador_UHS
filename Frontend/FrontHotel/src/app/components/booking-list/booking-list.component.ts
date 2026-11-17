import { Component, OnInit, ChangeDetectionStrategy, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms'; // <-- Añadir FormsModule para ngModel
import { Router, RouterLink } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { BookingDtoResponse } from '../../models/Booking-model';
import { AuthService } from '../../core/services/auth.service';
import { AccountService } from '../../core/services/account.service';
import { UserService } from '../../core/services/user.service';
import * as QRCode from 'qrcode';

export interface BookingWithAccount extends BookingDtoResponse {
  hasAccount?: boolean;
  accountId?: number;
  selectedUserId?: number | null;
}

@Component({
    selector: 'app-booking-list',
    imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink], // <-- Añadir FormsModule aquí
    templateUrl: './booking-list.component.html',
    styleUrls: ['./booking-list.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookingListComponent implements OnInit {
  
  // --- Estados reactivos con Signals ---
  bookings = signal<BookingWithAccount[]>([]);
  users = signal<any[]>([]);
  loading = signal<boolean>(true);
  errorMessage = signal<string>('');
  canModify = signal<boolean>(false);
  isGuest = signal<boolean>(false);
  cancellingIds = signal<number[]>([]);
  
  // --- Nuevo: Estado para el término de búsqueda ---
  searchTerm = signal<string>('');

  // --- Nuevo: Listado filtrado reactivo basado en nombre, apellido o habitación ---
  filteredBookings = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const list = this.bookings();
    
    if (!term) return list;

    return list.filter((booking) => {
      const firstName = (booking.guestFirstName || '').toLowerCase();
      const lastName = (booking.guestLastName || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`;
      const roomNum = booking.roomNumber ? booking.roomNumber.toString() : '';
      const idStr = booking.id.toString();

      return firstName.includes(term) || 
             lastName.includes(term) || 
             fullName.includes(term) || 
             roomNum.includes(term) ||
             idStr.includes(term);
    });
  });

  constructor(
    private bookingService: BookingService,
    private authService: AuthService,
    private accountService: AccountService,
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.checkUserRole();
    this.loadBookings();
    this.loadUsers();
  }

  loadUsers(): void {
    if (!this.canModify()) return;

    this.userService.getAll().subscribe({
      next: (data) => {
        this.users.set(Array.isArray(data) ? data : []);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar la lista de usuarios:', err);
      }
    });
  }

  onUserSelectChange(booking: BookingWithAccount, event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    booking.selectedUserId = selectedValue ? Number(selectedValue) : null;
  }

  assignUser(booking: BookingWithAccount): void {
    const userId = booking.selectedUserId;
    if (!userId) {
      alert('Por favor, selecciona un usuario válido.');
      return;
    }

    this.bookingService.assignUserToBooking(booking.id, userId).subscribe({
      next: () => {
        alert(`Usuario titular asignado exitosamente a la reserva #${booking.id}`);
        this.loadBookings();
      },
      error: (err) => {
        console.error('Error al asignar usuario a la reserva:', err);
        alert('No se pudo asignar el usuario a la reserva.');
      }
    });
  }

  checkUserRole(): void {
    const storedRoles = localStorage.getItem('role');
    if (!storedRoles) {
      this.canModify.set(false);
      this.isGuest.set(false);
      return;
    }

    try {
      const parsedRoles = JSON.parse(storedRoles);
      const rolesArray = Array.isArray(parsedRoles) ? parsedRoles : [parsedRoles];

      const hasAdminAccess = rolesArray.some((r: any) => {
        const value = typeof r === 'string' ? r : (r.authority || '');
        return value === 'ADMIN' || value === 'ROLE_ADMIN' || value === 'RECEPCIONIST' || value === 'ROLE_RECEPCIONIST';
      });

      const hasGuestAccess = rolesArray.some((r: any) => {
        const value = typeof r === 'string' ? r : (r.authority || '');
        return value === 'GUEST' || value === 'ROLE_GUEST';
      });

      this.canModify.set(hasAdminAccess);
      this.isGuest.set(hasGuestAccess && !hasAdminAccess);
    } catch {
      const isAdm = storedRoles.includes('ADMIN') || storedRoles.includes('RECEPCIONIST');
      const isGst = storedRoles.includes('GUEST');
      this.canModify.set(isAdm);
      this.isGuest.set(isGst && !isAdm);
    }
  }

  loadBookings(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    if (this.isGuest()) {
      this.fetchAndFilterBookings();
      return;
    }

    this.bookingService.processNoShows().subscribe({
      next: () => this.fetchAndFilterBookings(),
      error: (err) => {
        console.warn('No se pudo ejecutar el procesamiento automático de No-Shows...', err);
        this.fetchAndFilterBookings();
      }
    });
  }

  private fetchAndFilterBookings(): void {
    const requestObservable = this.isGuest() && this.bookingService.getMyBookings 
      ? this.bookingService.getMyBookings() 
      : this.bookingService.getAll();

    requestObservable.subscribe({
      next: (data) => {
        const allBookings = Array.isArray(data) ? [...data] : [];
        
        const filteredBookings: BookingWithAccount[] = this.isGuest() 
          ? allBookings 
          : allBookings.filter((b) => b.state === 'PENDING' || b.state === 'CONFIRMED');
        
        filteredBookings.sort((a, b) => b.id - a.id);

        this.bookings.set(filteredBookings);
        this.loading.set(false);

        filteredBookings.forEach((booking) => {
          this.accountService.getAccountByBookingId(booking.id).subscribe({
            next: (account: any) => {
              if (account && account.id) {
                booking.hasAccount = true;
                booking.accountId = account.id;
              } else {
                booking.hasAccount = false;
              }
              this.cdr.markForCheck();
            },
            error: () => {
              booking.hasAccount = false;
              this.cdr.markForCheck();
            }
          });
        });
      },
      error: (err) => {
        this.errorMessage.set('No se pudieron cargar las reservas o no cuentas con los permisos necesarios.');
        this.loading.set(false);
        console.error(err);
      }
    });
  }

  goToAccountDetail(booking: BookingWithAccount): void {
    if (booking.accountId) {
      this.router.navigate(['/dashboard/account-detail', booking.accountId]);
    } else {
      alert('Esta reserva no tiene una cuenta asociada.');
    }
  }

  isCancelling(id: number): boolean {
    return this.cancellingIds().includes(id);
  }

  cancelBooking(id: number): void {
    const reason = prompt('Por favor, ingrese el motivo de la cancelación:');
    if (!reason || !reason.trim()) return;

    this.cancellingIds.update(ids => [...ids, id]);

    const userIdStr = localStorage.getItem('userId');
    const userId = userIdStr ? Number(userIdStr) : 1;

    this.accountService.getAccountByBookingId(id).subscribe({
      next: (account: any) => {
        const hasPayments = account && account.paidAmount > 0;
        let issueCreditNote = false;

        if (hasPayments) {
          issueCreditNote = confirm('Esta reserva cuenta con pagos registrados. ¿Desea emitir una nota de crédito/reintegro?');
        }

        const request = { bookingId: id, reason: reason.trim(), userId, issueCreditNote };
        this.executeCancellation(request, id);
      },
      error: () => {
        const request = { bookingId: id, reason: reason.trim(), userId, issueCreditNote: false };
        this.executeCancellation(request, id);
      }
    });
  }

  private executeCancellation(request: any, id: number): void {
    this.bookingService.cancelBooking(request).subscribe({
      next: () => {
        alert(`Reserva ID ${id} cancelada exitosamente.`);
        this.cancellingIds.update(ids => ids.filter(item => item !== id));
        this.loadBookings();
      },
      error: (err) => {
        console.error('Error al intentar cancelar la reserva:', err);
        alert('Error al intentar cancelar la reserva.');
        this.cancellingIds.update(ids => ids.filter(item => item !== id));
      }
    });
  }

  confirmBooking(id: number): void {
    if (!this.canModify()) {
      alert('No tienes los permisos necesarios para realizar esta acción.');
      return;
    }

    this.bookingService.confirmBooking(id).subscribe({
      next: () => {
        alert(`Reserva ID ${id} confirmada exitosamente.`);
        this.loadBookings();
      },
      error: (err) => {
        alert('Error al intentar confirmar la reserva.');
        console.error(err);
      }
    });
  }

  async downloadQr(booking: BookingDtoResponse): Promise<void> {
    if (!booking.qrBooking) {
      alert('Esta reserva no cuenta con un código QR generado.');
      return;
    }

    try {
      const qrDataUrl = await QRCode.toDataURL(booking.qrBooking, { width: 300, margin: 2 });

      const downloadLink = document.createElement('a');
      downloadLink.href = qrDataUrl;
      downloadLink.download = `qr-reserva-${booking.id}-${booking.guestLastName}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error('Error al generar la imagen QR para la descarga', err);
      alert('No se pudo generar la imagen del código QR.');
    }
  }
}