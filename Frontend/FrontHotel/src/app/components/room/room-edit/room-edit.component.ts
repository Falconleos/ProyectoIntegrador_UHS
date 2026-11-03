
import { Component, inject, OnInit, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  NonNullableFormBuilder,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { RoomService } from '../../../core/services/room.service';
import { RoomTypeService } from '../../../core/services/room-type.service';
import { RoomTypeDTOResponse } from '../../../models/RoomType-model';
import { RoomDtoResponse } from '../../../models/Room-model';

@Component({
  selector: 'app-room-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './room-edit.component.html',
  styleUrl: './room-edit.component.css'
})
export class RoomEditComponent implements OnInit {

  private fb = inject(NonNullableFormBuilder);
  private roomService = inject(RoomService);
  private roomTypeService = inject(RoomTypeService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  roomId = 0;

  roomTypes = signal<RoomTypeDTOResponse[]>([]);
  loading = signal(true);
  saving = signal(false);
  errorMessage = signal('');

  roomForm = this.fb.group({
    number: [0, [Validators.required, Validators.min(1)]],
    roomTypeId: [0, [Validators.required, Validators.min(1)]]
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id')); //Captura de id de la pagina

    if (!Number.isInteger(id) || id <= 0) {
      this.errorMessage.set('El ID de la habitación no es válido.');
      this.loading.set(false);
      return;
    }

    this.roomId = id;
    this.loadRoomData();
  }

  loadRoomData(): void { //Obtiene valores actuales de la habitacion
    this.loading.set(true);
    this.errorMessage.set('');

    this.roomService.getById(this.roomId).subscribe({
      next: (room: RoomDtoResponse) => {

        this.roomForm.patchValue({
          number: Number(room.number),
          roomTypeId: room.roomTypeDTOResponse?.id ?? 0
        });

        this.loadRoomTypes();
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar la habitación.');
        this.loading.set(false);
      }
    });
  }

  loadRoomTypes(): void {
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

  updateRoom(): void {
    if (this.roomForm.invalid || this.saving() || this.loading()) {
      this.roomForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const request = this.roomForm.getRawValue();

    this.roomService.updateRoom(this.roomId, request).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/dashboard/room-list']);
      },
      error: () => {
        this.errorMessage.set('No se pudo actualizar la habitación.');
        this.saving.set(false);
      }
    });
  }
}

