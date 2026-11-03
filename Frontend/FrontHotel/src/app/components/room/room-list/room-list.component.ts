
import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';

import { RoomService } from '../../../core/services/room.service';
import { RoomDtoResponse } from '../../../models/Room-model';

@Component({
  selector: 'app-room-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './room-list.component.html',
  styleUrl: './room-list.component.css'
})
export class RoomListComponent implements OnInit, OnDestroy {

  private roomService = inject(RoomService);

  rooms = signal<RoomDtoResponse[]>([]);
  loading = signal(true);
  errorMessage = signal(''); //Para errores al cargar habitaciones
  actionError = signal(''); //Para errores al eliminar o actualizar habitaciones

  selectedRoom = signal<RoomDtoResponse | null>(null);

  //Señales del proceso de carga de imagenes
  roomImages = signal<string[]>([]);
  loadingImages = signal(false);
  imageError = signal('');
  currentImageIndex = signal(0);

  private imageSubscription?: Subscription;

  ngOnInit(): void {
    this.loadRooms();
  }

  loadRooms(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.roomService.getAll().subscribe({
      next: (data) => {
        this.rooms.set(Array.isArray(data) ? data : []); //Antes de setear, verifica si los datos son un arreglo
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar las habitaciones.');
        this.loading.set(false);
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

        //Si el boton borrar es el mismo modal
        /*
        if (this.selectedRoom()?.id === id) {
          this.closeRoomDetail();
        }
          */
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
    this.closeRoomModal(); //Cierra recursos previos del modal anterior
    this.selectedRoom.set(room); //Almacena habitacion seleccionada por el usuario
    this.loadRoomImages(room); //Solicita al back imagenes de la habitacion
  }


  //Obtiene imagenes dsde el back y las almacena para mostrarlas en el modal
  loadRoomImages(room: RoomDtoResponse): void {
    const count = room.imagesCount ?? 0; //nro de imagenes de la habitacion

    this.loadingImages.set(count > 0);
    this.imageError.set('');
    this.currentImageIndex.set(0); //posiciona carrusel en la primera imagen

    if (count === 0) {
      return;
    }

    const requests = Array.from( //Crea arreglo con peticiones de imagenes
      { length: count },
      (_, index) => this.roomService.getRoomImage(room.id, index)
    );

    this.imageSubscription = forkJoin(requests).subscribe({ //Espera a que se carguen todas las imagenes antes de ejecutar el next
      next: (blobs) => {
        if (this.selectedRoom()?.id !== room.id) {
          return;
        }

        //Recorre arreglo de blob y transformar cada elemento en una url
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
    this.imageSubscription?.unsubscribe(); //Cancela descarga de imagenes del back
    this.imageSubscription = undefined;

    this.roomImages().forEach(url => URL.revokeObjectURL(url)); //LiberaURL temporales

    this.roomImages.set([]);
    this.selectedRoom.set(null);
    this.loadingImages.set(false);
    this.imageError.set('');
    this.currentImageIndex.set(0);
  }

  ngOnDestroy(): void {
    this.closeRoomModal();
  }
}

