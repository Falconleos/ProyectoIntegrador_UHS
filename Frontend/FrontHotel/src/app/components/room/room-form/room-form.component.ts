import { Component, inject, OnInit, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  NonNullableFormBuilder,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { RoomService } from '../../../core/services/room.service';
import { RoomTypeService } from '../../../core/services/room-type.service';
import { RoomTypeDTOResponse } from '../../../models/RoomType-model';

@Component({
  selector: 'app-room-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './room-form.component.html',
  styleUrl: './room-form.component.css'
})
export class RoomFormComponent implements OnInit {

  private fb = inject(NonNullableFormBuilder);
  private roomService = inject(RoomService);
  private roomTypeService = inject(RoomTypeService);
  private router = inject(Router);

  roomTypes = signal<RoomTypeDTOResponse[]>([]);
  selectedImages = signal<File[]>([]);

  loadingTypes = signal(false);
  saving = signal(false);
  errorMessage = signal('');

  roomForm = this.fb.group({
    number: [0, [Validators.required, Validators.min(1)]],
    roomTypeId: [0, [Validators.required, Validators.min(1)]],
    state: ['AVAILABLE', Validators.required]
  });

  ngOnInit(): void {
    this.loadRoomTypes();
  }

  loadRoomTypes(): void {
    this.loadingTypes.set(true);
    this.errorMessage.set('');

    this.roomTypeService.getAll().subscribe({
      next: (data) => {
        this.roomTypes.set(data);
        this.loadingTypes.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los tipos de habitación.');
        this.loadingTypes.set(false);
      }
    });
  }

  //Capura de imagenes para la habitacion
  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.selectedImages.set(
      Array.from(input.files ?? [])
    );
  }

  createRoom(): void {
    if (this.roomForm.invalid || this.saving()) {
      this.roomForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const request = this.roomForm.getRawValue();

    this.roomService.createRoom(
      request,
      this.selectedImages()
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/dashboard/room-list']);
      },
      error: () => {
        this.errorMessage.set('No se pudo crear la habitación.');
        this.saving.set(false);
      }
    });
  }
}
