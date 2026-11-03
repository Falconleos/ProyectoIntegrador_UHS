
import { Component, inject, OnInit, signal } from '@angular/core';
import {ReactiveFormsModule, NonNullableFormBuilder, Validators} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { RoomTypeService } from '../../../core/services/room-type.service';
import { RoomTypeDTORequest } from '../../../models/RoomType-model';

@Component({
  selector: 'app-room-type-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './room-type-form.component.html',
  styleUrl: './room-type-form.component.css'
})
export class RoomTypeFormComponent implements OnInit {

  private fb = inject(NonNullableFormBuilder);
  private roomTypeService = inject(RoomTypeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = signal(false);
  roomTypeId = signal<number | null>(null);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  loadError = signal(false);

  roomTypeForm = this.fb.group({
    name: ['', [
      Validators.required,
      Validators.minLength(1),
      Validators.maxLength(50)
    ]],
    capacity: [1, [
      Validators.required,
      Validators.min(1)
    ]],
    description: ['', [
      Validators.required,
      Validators.maxLength(250)
    ]],
    pricePerNight: [0, [
      Validators.required,
      Validators.min(0.01)
    ]]
  });

  ngOnInit(): void { //Detecta si se debe crear o editar un tipo de habitacion
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam !== null) {
      const id = Number(idParam);

      if (!Number.isInteger(id) || id <= 0) {
        this.errorMessage.set('El ID del tipo de habitación no es válido.');
        this.loadError.set(true);
        return;
      }

      this.isEditMode.set(true);
      this.roomTypeId.set(id);
      this.loadRoomTypeData(id);
    }
  }

  loadRoomTypeData(id: number): void { //Carga datos de habitacion y crea formulario para su edicion
    this.loading.set(true);
    this.loadError.set(false);
    this.errorMessage.set('');

    this.roomTypeService.getById(id).subscribe({
      next: (data) => {
        this.roomTypeForm.patchValue({
          name: data.name,
          capacity: data.capacity,
          description: data.description ?? '',
          pricePerNight: data.pricePerNight
        });

        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar la información del tipo de habitación.');
        this.loadError.set(true);
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.roomTypeForm.invalid || this.saving() ||
        this.loading() || this.loadError()) {
      this.roomTypeForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const request: RoomTypeDTORequest = this.roomTypeForm.getRawValue();

    const id = this.roomTypeId();

    if (this.isEditMode() && id !== null) { //Modo edicion
      this.roomTypeService.updateRoomType(id, request).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/dashboard/room-type-list']);
        },
        error: () => {
          this.errorMessage.set('No se pudo actualizar el tipo de habitación.');
          this.saving.set(false);
        }
      });
    } else { //Modo creacion
      this.roomTypeService.createRoomType(request).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/dashboard/room-type-list']);
        },
        error: () => {
          this.errorMessage.set('No se pudo crear el tipo de habitación. Verificá que el nombre no exista previamente.');
          this.saving.set(false);
        }
      });
    }
  }
}
