import { Component, inject, OnInit, OnDestroy, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { RoomService } from '../../../core/services/room.service';
import { RoomTypeService } from '../../../core/services/room-type.service';
import { RoomDtoResponse } from '../../../models/Room-model';
import { RoomTypeDTOResponse } from '../../../models/RoomType-model';

@Component({
    selector: 'app-room-list',
    imports: [RouterLink],
    templateUrl: './room-list.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './room-list.component.css'
})
export class RoomListComponent implements OnInit, OnDestroy {

  private roomService = inject(RoomService);
  private roomTypeService = inject(RoomTypeService);
  private route = inject(Router);

  rooms = signal<RoomDtoResponse[]>([]);
  roomTypes = signal<RoomTypeDTOResponse[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  actionError = signal('');

  selectedRoom = signal<RoomDtoResponse | null>(null);

  // Señales para el manejo de imágenes
  roomImages = signal<string[]>([]);
  loadingImages = signal(false);
  imageError = signal('');
  currentImageIndex = signal(0);

  private imageSubscription?: Subscription;

  ngOnInit(): void {
    this.loadRooms();
    this.loadRoomTypes();
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
        console.error('No se pudieron cargar los tipos de habitación.');
      }
    });
  }

  deleteRoom(id: number): void {
    this.actionError.set('');

    this.roomService.deleteRoom(id).subscribe({
      next: () => {
        // Creamos un nuevo arreglo excluyendo la habitación eliminada
        const habitacionesActualizadas = this.rooms().filter(room => room.id !== id);
        this.rooms.set(habitacionesActualizadas);
      },
      error: () => {
        this.actionError.set('No se pudo eliminar la habitación.');
      }
    });
  }

 putInMaintenance(id: number): void {
    this.actionError.set('');

    this.roomService.putInMaintenance(id).subscribe({
      next: (roomActualizada) => {
        // Obtenemos el nuevo estado que determinó el backend ('MAINTENANCE' o 'AVAILABLE')
        const nuevoEstado = roomActualizada.state;

        // Recorremos la lista y actualizamos el estado de la habitación correspondiente
        const listaModificada = this.rooms().map(room => {
          if (room.id === id) {
            return { ...room, state: nuevoEstado };
          }
          return room;
        });

        this.rooms.set(listaModificada);

        // Si la habitación seleccionada en el modal es la misma, actualizamos su estado también
        if (this.selectedRoom()?.id === id) {
          const habSeleccionada = this.selectedRoom();
          if (habSeleccionada) {
            this.selectedRoom.set({ ...habSeleccionada, state: nuevoEstado });
          }
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
    this.loadRoomImagesSimple(room);
  }

  
  loadRoomImagesSimple(room: RoomDtoResponse): void {
    const totalImagenes = room.imagesCount ?? 0;

    this.loadingImages.set(totalImagenes > 0);
    this.imageError.set('');
    this.currentImageIndex.set(0);

    if (totalImagenes === 0) {
      return;
    }

    const urlsTemporales: string[] = [];
    let imagenesDescargadas = 0;

    // Recorremos con un bucle
    for (let i = 0; i < totalImagenes; i++) {
      this.roomService.getRoomImage(room.id, i).subscribe({
        next: (blob) => {
          // Validamos que el usuario siga viendo la misma habitación
          if (this.selectedRoom()?.id !== room.id) return;

          // Convertimos el archivo binario a URL web
          const url = URL.createObjectURL(blob);
          urlsTemporales[i] = url; // Guardamos en la posición exacta
          imagenesDescargadas++;

          // Cuando terminamos de descargar todas las imágenes, actualizamos la señal
          if (imagenesDescargadas === totalImagenes) {
            this.roomImages.set(urlsTemporales);
            this.loadingImages.set(false);
          }
        },
        error: () => {
          if (this.selectedRoom()?.id === room.id) {
            this.imageError.set('No se pudieron cargar las imágenes.');
            this.loadingImages.set(false);
          }
        }
      });
    }
  }

  previousImage(): void {
    const total = this.roomImages().length;
    if (total === 0) return;

    let nuevoIndice = this.currentImageIndex() - 1;
    if (nuevoIndice < 0) {
      nuevoIndice = total - 1; // Si llega al principio, vuelve a la última foto
    }
    this.currentImageIndex.set(nuevoIndice);
  }

  nextImage(): void {
    const total = this.roomImages().length;
    if (total === 0) return;

    let nuevoIndice = this.currentImageIndex() + 1;
    if (nuevoIndice >= total) {
      nuevoIndice = 0; // Si llega al final, vuelve a la primera foto
    }
    this.currentImageIndex.set(nuevoIndice);
  }

  closeRoomModal(): void {
    this.imageSubscription?.unsubscribe();
    this.imageSubscription = undefined;

    // Liberamos memoria de las URLs creadas
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

  deleteRoomType(id: number): void {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este tipo de habitación?')) {
      return;
    }
    this.actionError.set('');

    this.roomTypeService.deleteRoomType(id).subscribe({
      next: () => {
        const tiposActualizados = this.roomTypes().filter(type => type.id !== id);
        this.roomTypes.set(tiposActualizados);
      },
      error: (err) => {
        console.error('Error al eliminar tipo de habitación:', err);
        const msg = err.error?.message || 'No se pudo eliminar el tipo de habitación. Es posible que existan habitaciones asociadas.';
        this.actionError.set(msg);
      }
    });
  }
}