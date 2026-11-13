import { Component, OnInit, ChangeDetectionStrategy, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { BookingDtoResponse } from '../../models/Booking-model';
import { PaymentDTOResponse } from '../../models/Payment-model'; 
import { AuthService } from '../../core/services/auth.service';
import { AccountService } from '../../core/services/account.service';
import { UserService } from '../../core/services/user.service';
import * as QRCode from 'qrcode';

export interface BookingWithAccount extends BookingDtoResponse {
  hasAccount?: boolean;
  accountId?: number;
  selectedUserId?: number | null; // Para almacenar temporalmente el ID del select de titular
}

@Component({
  selector: 'app-booking-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './booking-list.component.html',
  styleUrls: ['./booking-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookingListComponent implements OnInit {
  // --- Estados con Signals ---
  bookings = signal<BookingWithAccount[]>([]);
  users = signal<any[]>([]); // Lista de usuarios para el select del titular
  loading = signal<boolean>(true);
  errorMessage = signal<string>('');
  canModify = signal<boolean>(false);
  isGuest = signal<boolean>(false);

  cancellingIds = signal<number[]>([]);

  selectedBookingForPayment = signal<BookingDtoResponse | null>(null);
  bookingPayments = signal<PaymentDTOResponse[]>([]);
  loadingPayments = signal<boolean>(false);
  
  newPaymentAmount = signal<number | null>(null);
  newPaymentMethod = signal<string>('CASH');
  newPaymentReference = signal<string>('');

  constructor(
    private bookingService: BookingService,
    private authService: AuthService,
    private accountService: AccountService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.checkUserRole();
    this.loadBookings();
    this.loadUsers();
  }

  loadUsers(): void {
    if (this.canModify()) {
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
  }

  // --- Asignar usuario titular seleccionado a la reserva ---
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
    if (storedRoles) {
      try {
        const roles = JSON.parse(storedRoles);
        if (Array.isArray(roles)) {
          const hasAdminAccess = roles.some((r: any) => {
            const val = typeof r === 'string' ? r : (r.authority || '');
            return val === 'ADMIN' || val === 'ROLE_ADMIN' || val === 'RECEPCIONIST' || val === 'ROLE_RECEPCIONIST';
          });
          const hasGuestAccess = roles.some((r: any) => {
            const val = typeof r === 'string' ? r : (r.authority || '');
            return val === 'GUEST' || val === 'ROLE_GUEST';
          });
          
          this.canModify.set(hasAdminAccess);
          this.isGuest.set(hasGuestAccess && !hasAdminAccess);
        } else {
          const val = typeof roles === 'string' ? roles : '';
          const isAdm = val === 'ADMIN' || val === 'ROLE_ADMIN' || val === 'RECEPCIONIST' || val === 'ROLE_RECEPCIONIST';
          const isGst = val === 'GUEST' || val === 'ROLE_GUEST';
          this.canModify.set(isAdm);
          this.isGuest.set(isGst && !isAdm);
        }
      } catch (e) {
        const isAdm = storedRoles.includes('ADMIN') || storedRoles.includes('RECEPCIONIST');
        const isGst = storedRoles.includes('GUEST');
        this.canModify.set(isAdm);
        this.isGuest.set(isGst && !isAdm);
      }
    } else {
      this.canModify.set(false);
      this.isGuest.set(false);
    }
  }

  loadBookings(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    
    if (!this.isGuest()) {
      this.bookingService.processNoShows().subscribe({
        next: () => {
          this.fetchAndFilterBookings();
        },
        error: (err) => {
          console.warn('No se pudo ejecutar el procesamiento automático de No-Shows...', err);
          this.fetchAndFilterBookings();
        }
      });
    } else {
      this.fetchAndFilterBookings();
    }
  }

  private fetchAndFilterBookings(): void {
    const requestObservable = this.isGuest() && this.bookingService.getMyBookings 
      ? this.bookingService.getMyBookings() 
      : this.bookingService.getAll();

    requestObservable.subscribe({
      next: (data) => {
        const allBookings = Array.isArray(data) ? [...data] : [];
        const filtered: BookingWithAccount[] = this.isGuest() 
          ? allBookings 
          : allBookings.filter((b) => b.state === 'PENDING' || b.state === 'CONFIRMED' || b.state === 'NO_SHOW');
        
        this.bookings.set(filtered);
        this.loading.set(false);

        filtered.forEach((booking) => {
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

  isCancelling(id: number): boolean {
    return this.cancellingIds().includes(id);
  }

  cancelBooking(id: number): void {
    const reason = prompt('Por favor, ingrese el motivo de la cancelación:');
    if (reason === null || !reason.trim()) {
      return;
    }

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

        const request = {
          bookingId: id,
          reason: reason.trim(),
          userId: userId,
          issueCreditNote: issueCreditNote
        };

        this.executeCancellation(request, id);
      },
      error: () => {
        const request = {
          bookingId: id,
          reason: reason.trim(),
          userId: userId,
          issueCreditNote: false
        };

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

  openPaymentModal(booking: BookingWithAccount): void {
    this.selectedBookingForPayment.set(booking);
    this.loadBookingPayments(booking.id);
  }

  closePaymentModal(): void {
    this.selectedBookingForPayment.set(null);
    this.bookingPayments.set([]);
    this.newPaymentAmount.set(null);
    this.newPaymentReference.set('');
  }

  loadBookingPayments(bookingId: number): void {
    this.loadingPayments.set(true);
    this.accountService.getPaymentsByBookingId(bookingId).subscribe({
      next: (payments) => {
        this.bookingPayments.set(Array.isArray(payments) ? payments : []);
        this.loadingPayments.set(false);
      },
      error: (err) => {
        console.error('Error al cargar el historial de señas:', err);
        this.bookingPayments.set([]);
        this.loadingPayments.set(false);
      }
    });
  }

  submitBookingPayment(): void {
    const booking = this.selectedBookingForPayment() as BookingWithAccount;
    const amount = this.newPaymentAmount();

    if (!booking || !amount || amount <= 0) {
      alert('Por favor, ingresa un monto válido.');
      return;
    }

    const bookingId = booking.id;
    const accountId = booking.accountId;

    if (!accountId) {
      alert('No se encontró una cuenta asociada a esta reserva.');
      return;
    }

    const request = {
      accountId: accountId,
      amount: amount,
      paymentMethod: this.newPaymentMethod(),
      transactionReference: this.newPaymentReference().trim()
    };

    this.accountService.addPayment(request).subscribe({
      next: () => {
        alert('Seña registrada exitosamente.');
        this.loadBookingPayments(bookingId);
        this.newPaymentAmount.set(null);
        this.newPaymentReference.set('');
      },
      error: (err: any) => {
        alert('Error al registrar la seña.');
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
      const qrDataUrl = await QRCode.toDataURL(booking.qrBooking, {
        width: 300,
        margin: 2
      });

      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `qr-reserva-${booking.id}-${booking.guestLastName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error al generar la imagen QR para la descarga', err);
      alert('No se pudo generar la imagen del código QR.');
    }
  }
}