import { Component, OnInit, ChangeDetectionStrategy, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { BookingDtoResponse } from '../../models/Booking-model';
import { PaymentDTOResponse } from '../../models/Payment-model'; 
import { AuthService } from '../../core/services/auth.service';
import { AccountService } from '../../core/services/account.service';
import * as QRCode from 'qrcode';

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
    console.log(`[DEBUG] Iniciando proceso de cancelación para la reserva ID: ${id}`);

    if (!this.canModify()) {
      console.warn('[DEBUG] Acción bloqueada: El usuario no cuenta con permisos de modificación.');
      alert('No tienes los permisos necesarios para realizar esta acción.');
      return;
    }

    // Evitar múltiples peticiones paralelas para la misma reserva
    if (this.isCancelling(id)) {
      console.warn(`[DEBUG] La reserva ID ${id} ya se encuentra en proceso de cancelación.`);
      return;
    }

    const reason = prompt('Por favor, ingrese el motivo de la cancelación:');
    if (reason === null) {
      console.log('[DEBUG] Cancelación abortada por el usuario (prompt cerrado o cancelado).');
      return;
    }

    if (!reason.trim()) {
      console.warn('[DEBUG] El motivo de cancelación ingresado está vacío.');
      alert('Debes ingresar un motivo válido.');
      return;
    }

    // Marcamos esta reserva como "en proceso de cancelación"
    this.cancellingIds.update(ids => [...ids, id]);
    console.log(`[DEBUG] Reserva ID ${id} agregada a cancellingIds. Consultando cuenta financiera...`);

    const userIdStr = localStorage.getItem('userId');
    const userId = userIdStr ? Number(userIdStr) : 1;
    console.log(`[DEBUG] ID de usuario recuperado para la cancelación: ${userId}`);

    // Consultamos la cuenta específica de esta reserva
    this.accountService.getAccountByBookingId(id).subscribe({
      next: (account: any) => {
        console.log(`[DEBUG] Cuenta obtenida exitosamente para bookingId ${id}:`, account);
        
        const hasPayments = account && account.paidAmount > 0;
        let issueCreditNote = false;

        if (hasPayments) {
          console.log(`[DEBUG] La cuenta posee pagos registrados (paidAmount: ${account.paidAmount}). Consultando emisión de nota de crédito...`);
          issueCreditNote = confirm('Esta reserva cuenta con pagos registrados. ¿Desea emitir una nota de crédito/reintegro?');
        } else {
          console.log('[DEBUG] La cuenta no registra pagos previos. No se requiere nota de crédito.');
        }

        const request = {
          bookingId: id,
          reason: reason.trim(),
          userId: userId,
          issueCreditNote: issueCreditNote
        };

        console.log(`[DEBUG] Enviando petición final de cancelación (con cuenta) para bookingId ${id}:`, request);
        this.executeCancellation(request, id);
      },
      error: (err) => {
        console.warn(`[DEBUG] No se pudo obtener la cuenta para la reserva ID ${id} (o no existe). Procediendo a cancelar sin cuenta...`, err);
        
        const request = {
          bookingId: id,
          reason: reason.trim(),
          userId: userId,
          issueCreditNote: false
        };

        console.log(`[DEBUG] Enviando petición final de cancelación (alternativa sin cuenta) para bookingId ${id}:`, request);
        this.executeCancellation(request, id);
      }
    });
  }

  private executeCancellation(request: any, id: number): void {
    this.bookingService.cancelBooking(request).subscribe({
      next: (response) => {
        console.log(`[DEBUG] ¡Cancelación exitosa en servidor para la reserva ID ${id}! Respuesta:`, response);
        alert(`Reserva ID ${id} cancelada exitosamente.`);
        this.cancellingIds.update(ids => ids.filter(item => item !== id));
        this.loadBookings();
      },
      error: (err) => {
        console.error(`[DEBUG ERROR] Falló el servicio al intentar cancelar la reserva ID ${id}. Objeto de error HTTP:`, err);
        console.error(`[DEBUG ERROR] Status code: ${err.status}, Mensaje: ${err.message}, Body error:`, err.error);
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

  // --- Método para descargar el Código QR desde la lista ---
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