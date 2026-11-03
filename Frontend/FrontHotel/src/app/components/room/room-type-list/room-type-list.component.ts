
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RoomTypeService } from '../../../core/services/room-type.service';
import { RoomTypeDTOResponse } from '../../../models/RoomType-model';

@Component({
  selector: 'app-room-type-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './room-type-list.component.html',
  styleUrl: './room-type-list.component.css'
})
export class RoomTypeListComponent implements OnInit {

  private roomTypeService = inject(RoomTypeService);

  roomTypes = signal<RoomTypeDTOResponse[]>([]);
  loading = signal(true);
  errorMessage = signal(''); //Para errores al obtener tipos
  actionError = signal(''); //Para errores al eliminar tipos

  ngOnInit(): void {
    this.loadRoomTypes();
  }

  loadRoomTypes(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.roomTypeService.getAll().subscribe({
      next: (data) => {
        this.roomTypes.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los tipos de habitación.');
        this.loading.set(false);
      }
    });
  }

  deleteRoomType(id: number): void {
    this.actionError.set('');

    this.roomTypeService.deleteRoomType(id).subscribe({
      next: () => {
        this.roomTypes.update(types =>types.filter(type => type.id !== id));
      },
      error: () => {
        this.actionError.set('No se pudo eliminar el tipo de habitación.');
      }
    });
  }
}
