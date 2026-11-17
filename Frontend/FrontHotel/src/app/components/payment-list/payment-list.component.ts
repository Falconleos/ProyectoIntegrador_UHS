import { Component, OnInit, ChangeDetectionStrategy, signal, computed } from '@angular/core';
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

  // SEÑALES PARA LOS FILTROS
  searchTerm = signal<string>('');
  methodFilter = signal<string>('ALL'); // 'ALL' | 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER'

  // SEÑAL COMPUTADA QUE FILTRA LA LISTA AUTOMÁTICAMENTE
  filteredPayments = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const method = this.methodFilter();

    return this.payments().filter(payment => {
      // 1. Filtro por Nombre o Apellido del huésped
      const name = payment.guestName ? payment.guestName.toLowerCase() : '';
      const surname = payment.guestSurname ? payment.guestSurname.toLowerCase() : '';
      const fullName = `${name} ${surname}`;
      
      const matchesSearch = fullName.includes(term);

      // 2. Filtro por Método de Pago
      let matchesMethod = true;
      if (method !== 'ALL') {
        matchesMethod = payment.paymentMethod === method;
      }

      return matchesSearch && matchesMethod;
    });
  });

  constructor(
    private paymentService: PaymentService,
    private accountService: AccountService
  ) {}

  ngOnInit(): void {
    this.loadPayments();
  }

  // Método principal para obtener y completar los datos del listado de pagos
  loadPayments(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    
    this.paymentService.getAllPayments().subscribe({
      next: (data: PaymentDTOResponse[]) => {
        const rawPayments: PaymentWithGuest[] = Array.isArray(data) ? [...data] : [];
        
        // Ordenamos para que el más reciente (ID mayor) quede arriba
        rawPayments.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

        this.payments.set(rawPayments);
        this.loading.set(false);

        // Recorremos los pagos para consultar los datos del usuario mediante la cuenta asociada
        rawPayments.forEach(payment => {
          if (payment.accountId) {
            this.accountService.getAccountById(payment.accountId).subscribe({
              next: (account: any) => {
                if (account) {
                  payment.guestName = account.user?.name || account.name || '';
                  payment.guestSurname = account.user?.surname || account.surname || '';
                  
                  // Actualizamos la señal con una nueva copia del arreglo para notificar a la vista
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
        this.errorMessage.set('No se pudieron cargar los pagos o no cuentas con los permisos necesarios.');
        this.loading.set(false);
        console.error(err);
      }
    });
  }
}