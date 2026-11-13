import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RoomAttentionService } from '../../core/services/room-attention.service';
import { BookingService } from '../../core/services/booking.service'; // <-- Ajusta la ruta a tu servicio de reservas si es necesario
import { RoomAttentionDtoResponse } from '../../models/RoomAttention-model';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

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
  private bookingService = inject(BookingService); // <-- Inyecta tu servicio que trae las reservas o check-ins

  ngOnInit(): void {
    this.loadAllAttentions();
  }

  loadAllAttentions(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    // Traemos los consumos y las reservas en paralelo para cruzarlos
    forkJoin({
      attentions: this.roomAttentionService.getAll(),
      bookings: this.bookingService.getAll().pipe(catchError(() => of([]))) // Ajusta el método de tu servicio si se llama diferente (ej: getCheckIns)
    }).subscribe({
      next: ({ attentions, bookings }) => {
        // Creamos un mapa de bookingId -> roomNumber para búsqueda rápida O(1)
        const roomMap = new Map<number, string>();
        bookings.forEach((b: any) => {
          // Asume que la reserva tiene 'id' y el número de habitación está en 'roomNumber', 'room.number', etc.
          const roomNum = b.roomNumber || b.room?.number || b.roomEntity?.number || 'N/A';
          roomMap.set(b.id, roomNum);
        });

        // Enriquecemos cada consumo con su respectivo número de habitación
        const enriched = attentions.map(item => ({
          ...item,
          roomNumber: roomMap.get(item.bookingId) || 'N/A'
        }));

        // Ordenamiento: Pendientes arriba, luego por fecha descendente
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