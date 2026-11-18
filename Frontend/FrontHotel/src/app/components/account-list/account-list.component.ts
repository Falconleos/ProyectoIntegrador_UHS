import { Component, OnInit, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AccountService } from '../../core/services/account.service';
import { AccountDTOResponse } from '../../models/Account-model';

@Component({
    selector: 'app-account-list',
    imports: [CommonModule, RouterModule],
    templateUrl: './account-list.component.html',
    styleUrls: ['./account-list.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountListComponent implements OnInit {
  accounts = signal<AccountDTOResponse[]>([]);
  loading = signal<boolean>(true);
  errorMessage = signal<string>('');

  // SEÑALES PARA LOS FILTROS
  searchTerm = signal<string>('');
  paymentFilter = signal<string>('ALL'); // 'ALL' | 'PAID' | 'UNPAID'

  // SEÑAL COMPUTADA QUE FILTRA LA LISTA AUTOMÁTICAMENTE
  filteredAccounts = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const filter = this.paymentFilter();

    return this.accounts().filter(account => {
      // 1. Filtro por Nombre / Apellido del huésped
      const guestName = account.user?.name ? account.user.name.toLowerCase() : '';
      const guestSurname = account.user?.surname ? account.user.surname.toLowerCase() : '';
      const fullName = `${guestName} ${guestSurname}`;
      const matchesSearch = fullName.includes(term);

      // 2. Filtro por Pago / Impago (basado en el saldo pendiente)
      let matchesPayment = true;
      const remaining = account.remainingBalance || 0;

      if (filter === 'PAID') {
        matchesPayment = remaining === 0;
      } else if (filter === 'UNPAID') {
        matchesPayment = remaining > 0;
      }

      return matchesSearch && matchesPayment;
    });
  });

  constructor(
    private accountService: AccountService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAccounts();
  }

  // Solicita al servicio la lista de cuentas e inicializa el estado del componente
  loadAccounts(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.accountService.getAllAccounts().subscribe({
      next: (data: AccountDTOResponse[]) => {
        const processedAccounts = Array.isArray(data) 
          ? data.map(account => this.calculateAccountTotals(account)) 
          : [];
        
        this.accounts.set(processedAccounts);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error cargando cuentas:', err);
        this.errorMessage.set('No se pudieron cargar las cuentas.');
        this.accounts.set([]);
        this.loading.set(false);
      }
    });
  }

  // Calcula de forma aislada los montos totales y saldos pendientes de una cuenta individual
  private calculateAccountTotals(acc: AccountDTOResponse): AccountDTOResponse {
    const base = acc.baseAmount || 0;
    const services = acc.servicesTotal || 0;
    const subtotal = base + services;
    
    const adjustment = acc.adjustmentPercentage || 0;
    const total = subtotal + (subtotal * (adjustment / 100));
    
    const paid = acc.paidAmount || 0;
    
    return {
      ...acc,
      totalAmount: total,
      remainingBalance: Math.max(0, total - paid)
    };
  }

  // Redirige a la vista de detalles utilizando el enrutador de Angular
  viewAccountDetail(id: number): void {
    this.router.navigate(['/dashboard/account-detail', id]);
  }
}