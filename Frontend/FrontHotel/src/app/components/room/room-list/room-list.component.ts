import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';

import { RoomService } from '../../../core/services/room.service';
import { RoomTypeService } from '../../../core/services/room-type.service';
import { RoomDtoResponse } from '../../../models/Room-model';
import { RoomTypeDTOResponse } from '../../../models/RoomType-model';

@Component({
  selector: 'app-room-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './room-list.component.html',
  styleUrl: './room-list.component.css'
})
export class RoomListComponent implements OnInit, OnDestroy {

  private roomService = inject(RoomService);
  private roomTypeService = inject(RoomTypeService);
  private route = inject(Router);

  rooms = signal<RoomDtoResponse[]>([]);
  roomTypes = signal<RoomTypeDTOResponse[]>([]); // Señal para los tipos de habitación
  loading = signal(true);
  errorMessage = signal(''); // Para errores al cargar habitaciones
  actionError = signal(''); // Para errores al eliminar o actualizar habitaciones

  selectedRoom = signal<RoomDtoResponse | null>(null);

  // Señales del proceso de carga de imagenes
  roomImages = signal<string[]>([]);
  loadingImages = signal(false);
  imageError = signal('');
  currentImageIndex = signal(0);

  private imageSubscription?: Subscription;

  ngOnInit(): void {
    this.loadRooms();
    this.loadRoomTypes(); // Cargamos los tipos de habitación al iniciar
  }

  loadRooms(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.roomService.getAll().subscribe({
      next: (data) => {
        this.rooms.set(Array.isArray(data) ? data : []);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar las habitaciones.');
        this.loading.set(false);
      }
    });
  }

  loadRoomTypes(): void {
    this.roomTypeService.getAll().subscribe({
      next: (data) => {
        this.roomTypes.set(Array.isArray(data) ? data : []);
      },
      error: () => {
        // Manejo opcional de error para tipos de habitación
        console.error('No se pudieron cargar los tipos de habitación.');
      }
    });
  }

  deleteRoom(id: number): void {
    this.actionError.set('');

    this.roomService.deleteRoom(id).subscribe({
      next: () => {
        this.rooms.update(rooms =>
          rooms.filter(room => room.id !== id)
        );
      },
      error: () => {
        this.actionError.set('No se pudo eliminar la habitación.');
      }
    });
  }

  putInMaintenance(id: number): void {
    this.actionError.set('');

    this.roomService.putInMaintenance(id).subscribe({
      next: () => {
        this.rooms.update(rooms =>
          rooms.map(room =>
            room.id === id
              ? { ...room, state: 'MAINTENANCE' }
              : room
          )
        );

        if (this.selectedRoom()?.id === id) {
          this.selectedRoom.update(room =>
            room ? { ...room, state: 'MAINTENANCE' } : null
          );
        }
      },
      error: () => {
        this.actionError.set('No se pudo cambiar el estado de la habitación.');
      }
    });
  }

  openRoomModal(room: RoomDtoResponse): void {
    this.closeRoomModal(); 
    this.selectedRoom.set(room); 
    this.loadRoomImages(room); 
  }

  loadRoomImages(room: RoomDtoResponse): void {
    const count = room.imagesCount ?? 0;

    this.loadingImages.set(count > 0);
    this.imageError.set('');
    this.currentImageIndex.set(0);

    if (count === 0) {
      return;
    }

    const requests = Array.from(
      { length: count },
      (_, index) => this.roomService.getRoomImage(room.id, index)
    );

    this.imageSubscription = forkJoin(requests).subscribe({
      next: (blobs) => {
        if (this.selectedRoom()?.id !== room.id) {
          return;
        }

        const urls = blobs.map(blob => URL.createObjectURL(blob));

        this.roomImages.set(urls);
        this.loadingImages.set(false);
      },
      error: () => {
        if (this.selectedRoom()?.id === room.id) {
          this.imageError.set('No se pudieron cargar las imágenes.');
          this.loadingImages.set(false);
        }
      }
    });
  }

  previousImage(): void {
    const total = this.roomImages().length;

    if (total === 0) return;

    this.currentImageIndex.update(index =>
      (index - 1 + total) % total
    );
  }

  nextImage(): void {
    const total = this.roomImages().length;

    if (total === 0) return;

    this.currentImageIndex.update(index =>
      (index + 1) % total
    );
  }

  closeRoomModal(): void {
    this.imageSubscription?.unsubscribe();
    this.imageSubscription = undefined;

    this.roomImages().forEach(url => URL.revokeObjectURL(url));

    this.roomImages.set([]);
    this.selectedRoom.set(null);
    this.loadingImages.set(false);
    this.imageError.set('');
    this.currentImageIndex.set(0);
  }

  ngOnDestroy(): void {
    this.closeRoomModal();
  }

  nuevaHabitacion(roomTypeId?: number): void {
    if (roomTypeId) {
      this.route.navigate(['/dashboard/room-form'], { 
        queryParams: { roomTypeId } 
      });
    } else {
      this.route.navigate(['/dashboard/room-form']);
    }
  }

}