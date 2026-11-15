import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RoomAttentionService } from '../../core/services/room-attention.service';
import { BookingService } from '../../core/services/booking.service';
import { RoomAttentionDtoResponse } from '../../models/RoomAttention-model';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-room-attention-global-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './room-attention-global-list.component.html',
  styleUrls: ['./room-attention-global-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoomAttentionGlobalListComponent implements OnInit {
  attentions = signal<(RoomAttentionDtoResponse & { roomNumber?: string })[]>([]);
  loading = signal<boolean>(true);
  errorMessage = signal<string>('');
  deliveringId = signal<number | null>(null);
  deletingId = signal<number | null>(null);

  private roomAttentionService = inject(RoomAttentionService);
  private bookingService = inject(BookingService);

  ngOnInit(): void {
    this.loadAllAttentions();
  }

  // Traigo en paralelo los consumos y las reservas para unificar la información y ordenar la lista
  loadAllAttentions(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      attentions: this.roomAttentionService.getAll(),
      bookings: this.bookingService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ attentions, bookings }) => {
        // Mapeo las reservas para asociar cada ID con su respectivo número de habitación
        const roomMap = new Map<number, string>();
        bookings.forEach((b: any) => {
          const roomNum = b.roomNumber || b.room?.number || b.roomEntity?.number || 'N/A';
          roomMap.set(b.id, roomNum);
        });

        // Enriquezco los ítems de atención agregando el número de habitación correspondiente
        const enriched = attentions.map(item => ({
          ...item,
          roomNumber: roomMap.get(item.bookingId) || 'N/A'
        }));

        // Ordeno los elementos colocando los pendientes primero y luego por fecha descendente
        const sorted = enriched.sort((a, b) => {
          if (a.delivered === b.delivered) {
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          }
          return a.delivered ? 1 : -1;
        });
        
        this.attentions.set(sorted);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar consumos o reservas:', err);
        this.errorMessage.set('No se pudieron cargar los consumos de servicio al cuarto.');
        this.loading.set(false);
      }
    });
  }

  // Actualizo el estado del consumo a entregado mediante el servicio
  markAsDelivered(id: number): void {
    this.deliveringId.set(id);
    this.roomAttentionService.markAsDelivered(id).subscribe({
      next: () => {
        this.deliveringId.set(null);
        this.loadAllAttentions();
      },
      error: (err) => {
        console.error('Error al marcar como entregado:', err);
        this.deliveringId.set(null);
      }
    });
  }

  // Solicito confirmación y elimino el registro de consumo a través del servicio
  deleteAttention(id: number): void {
    if (confirm('¿Estás seguro de eliminar este consumo?')) {
      this.deletingId.set(id);
      this.roomAttentionService.deleteAttention(id).subscribe({
        next: () => {
          this.deletingId.set(null);
          this.loadAllAttentions();
        },
        error: (err) => {
          console.error('Error al eliminar consumo:', err);
          this.deletingId.set(null);
        }
      });
    }
  }
}