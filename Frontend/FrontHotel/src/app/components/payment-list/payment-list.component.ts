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
  
  // Estados reactivos gestionados con Signals
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

  // Método principal para obtener y completar los datos del listado de pagos
  loadPayments(): void {
    // 1. Iniciamos el estado de carga y limpiamos errores previos
    this.loading.set(true);
    this.errorMessage.set('');
    
    // 2. Invocamos al servicio principal para obtener todos los pagos
    this.paymentService.getAllPayments().subscribe({
      next: (data: PaymentDTOResponse[]) => {
        // 3. Procesamos la respuesta asegurando que sea un arreglo válido
        const rawPayments: PaymentWithGuest[] = Array.isArray(data) ? [...data] : [];
        this.payments.set(rawPayments);
        this.loading.set(false);

        // 4. Recorremos los pagos para consultar los datos del usuario mediante la cuenta asociada
        rawPayments.forEach(payment => {
          if (payment.accountId) {
            this.accountService.getAccountById(payment.accountId).subscribe({
              next: (account: any) => {
                if (account) {
                  // Asignamos los datos del huésped obtenidos desde la cuenta
                  payment.guestName = account.user?.name || account.name || '';
                  payment.guestSurname = account.user?.surname || account.surname || '';
                  
                  // Actualizamos la señal con una nueva copia del arreglo para notificar a la vista con OnPush
                  this.payments.set([...rawPayments]);
                }
              },
              error: (err) => {
                console.error(`Error al cargar cuenta #${payment.accountId}`, err);
              }
            });
          }
        });
      },
      error: (err: any) => {
        // 5. Manejamos el error de la petición principal y detenemos el indicador de carga
        this.errorMessage.set('No se pudieron cargar los pagos o no cuentas con los permisos necesarios.');
        this.loading.set(false);
        console.error(err);
      }
    });
  }
}