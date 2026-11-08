import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import {
  ReactiveFormsModule,
  NonNullableFormBuilder,
  Validators,
  FormsModule
} from '@angular/forms';

import { ActivatedRoute, Router } from '@angular/router';

import { RoomAttentionService } from '../../../core/services/room-attention.service';
import { ItemService } from '../../../core/services/item.service';

import { RoomAttentionDtoRequest } from '../../../models/RoomAttention-model';
import { ItemDtoResponse } from '../../../models/Item-model';

@Component({
  selector: 'app-room-attention-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './room-attention-form.component.html',
  styleUrl: './room-attention-form.component.css'
})
export class RoomAttentionFormComponent implements OnInit {

  private fb = inject(NonNullableFormBuilder);
  private roomAttentionService = inject(RoomAttentionService);
  private itemService = inject(ItemService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  bookingId = signal<number | null>(null);

  availableItems = signal<ItemDtoResponse[]>([]);

  loadingItems = signal(false);
  saving = signal(false);
  errorMessage = signal('');

  attentionForm = this.fb.group({
    itemId: [0, [Validators.required, Validators.min(1)]],
    quantity: [1, [Validators.required, Validators.min(1)]]
  });

  ngOnInit(): void {
    // CORREGIDO: Cambiado de 'bookingId' a 'id' para que coincida con la ruta (:id)
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);

    if (idParam && Number.isInteger(id) && id > 0) {
      this.bookingId.set(id);
      this.loadAvailableItems();
    } else {
      this.errorMessage.set('ID de reserva no válido.');
    }
  }

  // Obtiene catálogo de productos y servicios
  loadAvailableItems(): void {
    this.loadingItems.set(true);
    this.errorMessage.set('');

    this.itemService.getAll().subscribe({
      next: (items) => {
        this.availableItems.set(items);
        this.loadingItems.set(false);
      },
      error: () => {
        this.errorMessage.set('Error al cargar el catálogo de productos y servicios.');
        this.loadingItems.set(false);
      }
    });
  }

  // Busca el producto seleccionado
  getSelectedItem(): ItemDtoResponse | undefined {
    const itemId = this.attentionForm.controls.itemId.value;
    return this.availableItems().find(item => item.id === itemId);
  }

  calculateSubtotal(): number {
    const selectedItem = this.getSelectedItem();

    if (!selectedItem) {
      return 0;
    }

    const quantity = this.attentionForm.controls.quantity.value;
    return selectedItem.unitPrice * quantity;
  }

  // Registra un producto o servicio consumido por un huésped durante su reserva
  onSubmit(): void {
    if (this.attentionForm.invalid) {
      this.attentionForm.markAllAsTouched();
      return;
    }

    const id = this.bookingId();

    if (id === null || this.saving()) {
      return;
    }

    const formValue = this.attentionForm.getRawValue();

    const request: RoomAttentionDtoRequest = {
      bookingId: id,
      itemId: formValue.itemId,
      quantity: formValue.quantity
    };

    this.saving.set(true);
    this.errorMessage.set('');

    this.roomAttentionService.addAttention(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/dashboard/bookings', id, 'servicios']);
      },
      error: () => {
        this.errorMessage.set('Error al registrar el consumo o servicio.');
        this.saving.set(false);
      }
    });
  }
}