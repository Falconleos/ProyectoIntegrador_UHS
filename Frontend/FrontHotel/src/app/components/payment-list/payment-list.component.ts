import { Component, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentService } from '../../core/services/payment.service';
import { AccountService } from '../../core/services/account.service';
import { PaymentDTOResponse } from '../../models/Payment-model';

// Interfaz extendida para incluir los datos del huésped de forma limpia
export interface PaymentWithGuest extends PaymentDTOResponse {
  guestName?: string;
  guestSurname?: string;
}

@Component({
  selector: 'app-payment-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-list.component.html',
  styleUrls: ['./payment-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentListComponent implements OnInit {
  // --- Estados con Signals ---
  payments = signal<PaymentWithGuest[]>([]);
  loading = signal<boolean>(true);
  errorMessage = signal<string>('');

  constructor(
    private paymentService: PaymentService,
    private accountService: AccountService
  ) {}

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    
    this.paymentService.getAllPayments().subscribe({
      next: (data: PaymentDTOResponse[]) => {
        const rawPayments: PaymentWithGuest[] = Array.isArray(data) ? [...data] : [];
        this.payments.set(rawPayments);
        this.loading.set(false);

        // Recorremos cada pago para buscar los datos del titular usando el accountId
        rawPayments.forEach(payment => {
          if (payment.accountId) {
            this.accountService.getAccountById(payment.accountId).subscribe({
              next: (account: any) => {
                if (account) {
                  payment.guestName = account.user?.name || account.name || '';
                  payment.guestSurname = account.user?.surname || account.surname || '';
                  // Actualizamos la señal con el array modificado para que OnPush detecte el cambio reactivamente
                  this.payments.set([...rawPayments]);
                }
              },
              error: (err) => console.error(`Error al cargar cuenta #${payment.accountId}`, err)
            });
          }
        });
      },
      error: (err: any) => {
        this.errorMessage.set('No se pudieron cargar los pagos o no cuentas con los permisos necesarios.');
        this.loading.set(false);
        console.error(err);
      }
    });
  }
}