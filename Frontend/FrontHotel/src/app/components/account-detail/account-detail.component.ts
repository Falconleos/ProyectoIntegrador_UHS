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
  today = signal<Date>(new Date());
  
  // Control de permisos para edición (Admin / Recepción vs Guest)
  canModify = signal<boolean>(false);

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
    this.checkUserRole();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.checkInId = +idParam;
      this.loadData();
    }
  }

  // Verifica el rol almacenado en localStorage para determinar si el usuario puede modificar datos
  checkUserRole(): void {
    const storedRoles = localStorage.getItem('role') || '';
    try {
      const roles = JSON.parse(storedRoles);
      const hasAccess = Array.isArray(roles) 
        ? roles.some((r: any) => ['ADMIN', 'ROLE_ADMIN', 'RECEPCIONIST', 'ROLE_RECEPCIONIST'].includes(typeof r === 'string' ? r : r.authority))
        : ['ADMIN', 'ROLE_ADMIN', 'RECEPCIONIST', 'ROLE_RECEPCIONIST'].includes(storedRoles);
      this.canModify.set(hasAccess);
    } catch (e) {
      this.canModify.set(storedRoles.includes('ADMIN') || storedRoles.includes('RECEPCIONIST'));
    }
  }

  // Inicia la carga de la cuenta y coordina la obtención de datos complementarios
  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.accountService.getAccountByCheckInId(this.checkInId).subscribe({
      next: (accountData: AccountDTOResponse) => {
        this.handleAccountDataSuccess(accountData);
      },
      error: (err: any) => {
        this.errorMessage.set('No se pudo cargar el resumen de la cuenta.');
        this.loading.set(false);
        console.error(err);
      }
    });
  }

  // Procesa la cuenta base y solicita las atenciones de habitación asociadas
  private handleAccountDataSuccess(accountData: AccountDTOResponse): void {
    this.account.set(accountData);
    this.adjustmentPercentage.set(accountData.adjustmentPercentage ?? 0);

    this.roomAttentionService.getByBooking(this.checkInId).subscribe({
      next: (attentions) => {
        this.handleRoomAttentionsSuccess(attentions);
      },
      error: (attErr) => {
        console.error('Error al cargar las atenciones de habitación:', attErr);
        this.loading.set(false);
      }
    });
  }

  // Integra los consumos de room service a la cuenta y busca el estado del check-in
  private handleRoomAttentionsSuccess(attentions: any[]): void {
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
        this.handleCheckInsSuccess(checkIns);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  // Asigna el estado del check-in y finaliza el indicador de carga
  private handleCheckInsSuccess(checkIns: any[]): void {
    const currentCheckIn = checkIns.find(c => c.id === this.checkInId);
    if (currentCheckIn) {
      this.checkInState.set(currentCheckIn.checkInState);
    }
    this.loading.set(false);
  }

  // Calcula el subtotal sumando el monto base de la estadía y los ítems de consumo
  calculateRawTotal(): number {
    const acc = this.account();
    if (!acc) return 0;
    const base = acc.baseAmount ?? 0;
    const itemsTotal = acc.items ? acc.items.reduce((sum, item) => sum + item.subtotal, 0) : 0;
    return base + itemsTotal;
  }

  // Calcula el monto absoluto correspondiente al porcentaje de ajuste aplicado
  calculateAdjustmentAmount(): number {
    return Math.abs(this.calculateRawTotal() * (this.adjustmentPercentage() / 100));
  }

  // Envía al servidor la actualización del porcentaje de ajuste y recarga los datos
  applyAdjustments(): void {
    const acc = this.account();
    if (!acc || acc.isPaid || !this.canModify()) return;

    const numericAdjustment = Number(this.adjustmentPercentage());

    this.accountService.updateAdjustmentPercentage(this.checkInId, numericAdjustment).subscribe({
      next: () => {
        this.loadData();
      },
      error: (err: any) => {
        alert('Error al aplicar el porcentaje de ajuste.');
        console.error(err);
      }
    });
  }

  // Calcula el total final aplicando el porcentaje de ajuste sobre el subtotal
  calculateAdjustedTotal(): number {
    const rawTotal = this.calculateRawTotal();
    const adjustmentFactor = 1 + (this.adjustmentPercentage() / 100);
    return Math.max(0, rawTotal * adjustmentFactor);
  }

  // Calcula el saldo pendiente restando los pagos realizados al total ajustado
  calculateRemaining(): number {
    const acc = this.account();
    if (!acc) return 0;
    const totalPaid = acc.payments ? acc.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
    const remaining = Math.max(0, this.calculateAdjustedTotal() - totalPaid);
    return Number(remaining.toFixed(2));
  }

  // Registra un nuevo pago en el sistema y actualiza la información en pantalla
  submitPayment(): void {
    const acc = this.account();
    if (!acc || this.paymentAmount() <= 0 || acc.isPaid || !this.canModify()) return;

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

  // Dispara la funcionalidad nativa de impresión del navegador para el recibo
  printAccount(): void {
    window.print();
  }

  // Navega de regreso a la lista de check-ins utilizando el enrutador
  goBack(): void {
    this.router.navigate(['dashboard/check-in-list']);
  }
}