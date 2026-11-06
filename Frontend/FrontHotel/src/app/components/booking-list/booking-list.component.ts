import { Component, OnInit, ChangeDetectionStrategy, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { BookingDtoResponse } from '../../models/Booking-model';
import { PaymentDTOResponse } from '../../models/Payment-model'; 
import { AuthService } from '../../core/services/auth.service';
import { AccountService } from '../../core/services/account.service';

export interface BookingWithAccount extends BookingDtoResponse {
  hasAccount?: boolean;
  accountId?: number;
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
  loading = signal<boolean>(true);
  errorMessage = signal<string>('');
  canModify = signal<boolean>(false);

  // Bandera para rastrear qué IDs están en proceso de cancelación y evitar doble envío
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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.checkUserRole();
    this.loadBookings();
  }

  checkUserRole(): void {
    const storedRoles = localStorage.getItem('role');
    if (storedRoles) {
      try {
        const roles = JSON.parse(storedRoles);
        if (Array.isArray(roles)) {
          const hasAccess = roles.some((r: any) => {
            const val = typeof r === 'string' ? r : (r.authority || '');
            return val === 'ADMIN' || val === 'ROLE_ADMIN' || val === 'RECEPCIONIST' || val === 'ROLE_RECEPCIONIST';
          });
          this.canModify.set(hasAccess);
        } else {
          const val = typeof roles === 'string' ? roles : '';
          this.canModify.set(val === 'ADMIN' || val === 'ROLE_ADMIN' || val === 'RECEPCIONIST' || val === 'ROLE_RECEPCIONIST');
        }
      } catch (e) {
        this.canModify.set(storedRoles.includes('ADMIN') || storedRoles.includes('RECEPCIONIST'));
      }
    } else {
      this.canModify.set(false);
    }
  }

  loadBookings(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    
    this.bookingService.processNoShows().subscribe({
      next: () => {
        this.fetchAndFilterBookings();
      },
      error: (err) => {
        console.warn('No se pudo ejecutar el procesamiento automático de No-Shows, continuando carga...', err);
        this.fetchAndFilterBookings();
      }
    });
  }

  activeTab = signal<'PENDING' | 'NO_SHOW'>('PENDING');

  private fetchAndFilterBookings(): void {
    this.bookingService.getAll().subscribe({
      next: (data) => {
        const allBookings = Array.isArray(data) ? [...data] : [];
        
        const filtered: BookingWithAccount[] = allBookings.filter(
          (b) => b.state === 'PENDING' || b.state === 'CONFIRMED' || b.state === 'NO_SHOW'
        );
        
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
    if (!this.canModify()) {
      alert('No tienes los permisos necesarios para realizar esta acción.');
      return;
    }

    // Evitar múltiples peticiones paralelas para la misma reserva
    if (this.isCancelling(id)) {
      return;
    }

    const reason = prompt('Por favor, ingrese el motivo de la cancelación:');
    if (reason === null) {
      return;
    }

    // Marcamos esta reserva como "en proceso de cancelación"
    this.cancellingIds.update(ids => [...ids, id]);

    console.log('Iniciando obtención de cuenta para bookingId:', id);
    this.accountService.getAccountByBookingId(id).subscribe({
      next: (account: any) => {
        console.log('Cuenta obtenida exitosamente:', account);
        const hasPayments = account && account.paidAmount > 0;
        let issueCreditNote = false;

        if (hasPayments) {
          issueCreditNote = confirm('Esta reserva cuenta con pagos registrados. ¿Desea emitir una nota de crédito/reintegro?');
        }

        const userIdStr = localStorage.getItem('userId');
        const userId = userIdStr ? Number(userIdStr) : 1;

        const request = {
          bookingId: id,
          reason: reason.trim(),
          userId: userId,
          issueCreditNote: issueCreditNote
        };

        console.log('Enviando petición de cancelación (con cuenta):', request);
        this.bookingService.cancelBooking(request).subscribe({
          next: () => {
            console.log('Cancelación exitosa (con cuenta)');
            alert(`Reserva ID ${id} cancelada exitosamente.`);
            this.cancellingIds.update(ids => ids.filter(item => item !== id));
            this.loadBookings();
          },
          error: (err) => {
            console.error('Error en el servicio al cancelar (con cuenta):', err);
            alert('Error al intentar cancelar la reserva.');
            this.cancellingIds.update(ids => ids.filter(item => item !== id));
            console.error(err);
          }
        });
      },
      error: (err) => {
        console.warn('No se pudo obtener la cuenta para validar pagos, procediendo a cancelar...', err);
        
        const userIdStr = localStorage.getItem('userId');
        const userId = userIdStr ? Number(userIdStr) : 1;

        const request = {
          bookingId: id,
          reason: reason.trim(),
          userId: userId,
          issueCreditNote: false
        };

        console.log('Enviando petición de cancelación (alternativa sin cuenta):', request);
        this.bookingService.cancelBooking(request).subscribe({
          next: () => {
            console.log('Cancelación exitosa (sin cuenta)');
            alert(`Reserva ID ${id} cancelada exitosamente.`);
            this.cancellingIds.update(ids => ids.filter(item => item !== id));
            this.loadBookings();
          },
          error: (errBooking) => {
            console.error('Error en el servicio al cancelar (sin cuenta):', errBooking);
            alert('Error al intentar cancelar la reserva.');
            this.cancellingIds.update(ids => ids.filter(item => item !== id));
            console.error(errBooking);
          }
        });
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
}