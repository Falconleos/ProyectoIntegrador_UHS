import { Component, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AccountService } from '../../core/services/account.service';
import { AccountDTOResponse } from '../../models/Account-model';

@Component({
  selector: 'app-account-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './account-list.component.html',
  styleUrls: ['./account-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountListComponent implements OnInit {
  // --- Estados con Signals ---
  accounts = signal<AccountDTOResponse[]>([]);
  loading = signal<boolean>(true);
  errorMessage = signal<string>('');

  constructor(
    private accountService: AccountService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.accountService.getAllAccounts().subscribe({
      next: (data: AccountDTOResponse[]) => {
        const processedAccounts = Array.isArray(data) ? data.map(acc => {
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
        }) : [];
        
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

  viewAccountDetail(id: number): void {
    this.router.navigate([`/dashboard/account-detail/${id}`]);
  }
}