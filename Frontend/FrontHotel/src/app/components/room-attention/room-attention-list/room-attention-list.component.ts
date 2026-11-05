import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { RoomAttentionService } from '../../../core/services/room-attention.service';
import { RoomAttentionDtoResponse } from '../../../models/RoomAttention-model';

@Component({
  selector: 'app-room-attention-list',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './room-attention-list.component.html',
  styleUrl: './room-attention-list.component.css'
})
export class RoomAttentionListComponent implements OnInit {

  private roomAttentionService = inject(RoomAttentionService);
  private route = inject(ActivatedRoute);

  bookingId = signal<number | null>(null);
  attentions = signal<RoomAttentionDtoResponse[]>([]);

  loading = signal<boolean>(false);
  deletingId = signal<number | null>(null);
  deliveringId = signal<number | null>(null);

  errorMessage = signal<string>('');
  canModify = signal<boolean>(false);

  total = computed(() =>
    this.attentions().reduce(
      (acc, attention) => acc + (attention.subtotal || 0),
      0
    )
  );

  ngOnInit(): void {
    this.checkUserRole();

    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);

    if (idParam && Number.isInteger(id) && id > 0) {
      this.bookingId.set(id);
      this.loadAttentions();
    } else {
      this.errorMessage.set('ID de reserva no válido.');
    }
  }

  checkUserRole(): void {
    const storedRoles = localStorage.getItem('role');

    if (!storedRoles) {
      this.canModify.set(false);
      return;
    }

    let roles: unknown;

    try {
      roles = JSON.parse(storedRoles);
    } catch {
      roles = storedRoles;
    }

    const roleList = Array.isArray(roles) ? roles : [roles];

    const allowed = roleList.some((role: unknown) => {
      let value = '';

      if (typeof role === 'string') {
        value = role;
      } else if (role && typeof role === 'object' && 'authority' in role) {
        value = String((role as any).authority);
      }

      return [
        'ADMIN',
        'ROLE_ADMIN',
        'RECEPCIONIST',
        'ROLE_RECEPCIONIST'
      ].includes(value);
    });

    this.canModify.set(allowed);
  }

  loadAttentions(): void {
    const id = this.bookingId();

    if (id === null) return;

    this.loading.set(true);
    this.errorMessage.set('');

    this.roomAttentionService.getByBooking(id).subscribe({
      next: (data: RoomAttentionDtoResponse[]) => {
        this.attentions.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Error al cargar los consumos de la reserva.');
        this.loading.set(false);
      }
    });
  }

  deleteAttention(id: number): void {
    if (!this.canModify() || this.deletingId() !== null) return;

    this.deletingId.set(id);
    this.errorMessage.set('');

    this.roomAttentionService.deleteAttention(id).subscribe({
      next: () => {
        this.attentions.update(attentions =>
          attentions.filter(attention => attention.id !== id)
        );
        this.deletingId.set(null);
      },
      error: () => {
        this.errorMessage.set('Error al eliminar el consumo.');
        this.deletingId.set(null);
      }
    });
  }

  markAsDelivered(id: number): void {
    if (!this.canModify() || this.deliveringId() !== null) return;

    this.deliveringId.set(id);
    this.errorMessage.set('');

    this.roomAttentionService.markAsDelivered(id).subscribe({
      next: () => {
        this.deliveringId.set(null);
        this.loadAttentions();
      },
      error: () => {
        this.errorMessage.set('Error al marcar el consumo como entregado.');
        this.deliveringId.set(null);
      }
    });
  }
}