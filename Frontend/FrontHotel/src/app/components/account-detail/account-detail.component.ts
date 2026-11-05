import { Component, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountService } from '../../core/services/account.service';
import { CheckInService } from '../../core/services/check-in.service';
import { RoomAttentionService } from '../../core/services/room-attention.service';
import { AccountDTOResponse } from '../../models/Account-model';

@Component({
  selector: 'app-account-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-detail.component.html',
  styleUrls: ['./account-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountDetailComponent implements OnInit {
  // --- Estados con Signals ---
  checkInId!: number;
  account = signal<AccountDTOResponse | null>(null);
  checkInState = signal<string>('');
  loading = signal<boolean>(true);
  errorMessage = signal<string>('');

  // Formulario de pago
  paymentAmount = signal<number>(0);
  paymentMethod = signal<string>('CASH');
  transactionReference = signal<string>('');

  // Ajuste por porcentaje
  adjustmentPercentage = signal<number>(0);
  adjustedTotal = signal<number>(0);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountService: AccountService,
    private checkInService: CheckInService,
    private roomAttentionService: RoomAttentionService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.checkInId = +idParam;
      this.loadData();
    }
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.accountService.getAccountByCheckInId(this.checkInId).subscribe({
      next: (accountData: AccountDTOResponse) => {
        this.account.set(accountData);
        this.adjustmentPercentage.set(accountData.adjustmentPercentage ?? 0);

        this.roomAttentionService.getByBooking(this.checkInId).subscribe({
          next: (attentions) => {
            const currentAccount = this.account();
            if (currentAccount) {
              const mappedItems = attentions.map(att => ({
                description: att.itemDTOResponse?.description || 'Room Service / Consumo',
                quantity: att.quantity,
                subtotal: att.subtotal
              }));
              
              this.account.set({
                ...currentAccount,
                items: mappedItems
              });
            }

            this.adjustedTotal.set(this.calculateAdjustedTotal());
            this.paymentAmount.set(this.calculateRemaining());

            this.checkInService.getAll().subscribe({
              next: (checkIns) => {
                const currentCheckIn = checkIns.find(c => c.id === this.checkInId);
                if (currentCheckIn) {
                  this.checkInState.set(currentCheckIn.checkInState);
                }
                this.loading.set(false);
              },
              error: () => {
                this.loading.set(false);
              }
            });
          },
          error: (attErr) => {
            console.error('Error al cargar las atenciones de habitación:', attErr);
            this.loading.set(false);
          }
        });
      },
      error: (err: any) => {
        this.errorMessage.set('No se pudo cargar el resumen de la cuenta.');
        this.loading.set(false);
        console.error(err);
      }
    });
  }

  calculateRawTotal(): number {
    const acc = this.account();
    if (!acc) return 0;
    const base = acc.baseAmount ?? 0;
    const itemsTotal = acc.items ? acc.items.reduce((sum, item) => sum + item.subtotal, 0) : 0;
    return base + itemsTotal;
  }

  calculateAdjustmentAmount(): number {
    return this.calculateRawTotal() * (this.adjustmentPercentage() / 100);
  }

  applyAdjustments(): void {
    const acc = this.account();
    if (!acc || acc.isPaid) return;

    this.accountService.updateAdjustmentPercentage(this.checkInId, this.adjustmentPercentage()).subscribe({
      next: (updatedAccount: AccountDTOResponse) => {
        this.account.set(updatedAccount);
        this.adjustmentPercentage.set(updatedAccount.adjustmentPercentage ?? this.adjustmentPercentage());
        this.adjustedTotal.set(this.calculateAdjustedTotal());
        this.paymentAmount.set(this.calculateRemaining());
      },
      error: (err: any) => {
        alert('Error al aplicar el porcentaje de ajuste.');
        console.error(err);
      }
    });
  }

  calculateAdjustedTotal(): number {
    const rawTotal = this.calculateRawTotal();
    const adjustmentFactor = 1 + (this.adjustmentPercentage() / 100);
    return rawTotal * adjustmentFactor;
  }

  calculateRemaining(): number {
    const acc = this.account();
    if (!acc) return 0;
    const totalPaid = acc.payments ? acc.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
    return Math.max(0, this.calculateAdjustedTotal() - totalPaid);
  }

  submitPayment(): void {
    const acc = this.account();
    if (!acc || this.paymentAmount() <= 0 || acc.isPaid) return;

    const paymentPayload = {
      accountId: acc.id,
      amount: this.paymentAmount(),
      paymentMethod: this.paymentMethod(),
      transactionReference: this.transactionReference() || 'Pago en mostrador'
    };

    this.accountService.addPayment(paymentPayload).subscribe({
      next: () => {
        this.paymentAmount.set(0);
        this.transactionReference.set('');
        this.loadData();
      },
      error: (err: any) => {
        alert('Error al registrar el pago.');
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['../../'], { relativeTo: this.route });
  }
}