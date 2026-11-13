import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RoomTypeService } from '../../../core/services/room-type.service';
import { RoomTypeDTORequest } from '../../../models/RoomType-model';

@Component({
  selector: 'app-room-type-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './room-type-edit.component.html',
  styleUrl: './room-type-edit.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoomTypeEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private roomTypeService = inject(RoomTypeService);

  roomTypeId = signal<number | null>(null);
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  editForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    capacity: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
    description: [''],
    pricePerNight: [0, [Validators.required, Validators.min(0.01)]]
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);

    if (!idParam || isNaN(id)) {
      this.errorMessage.set('ID de tipo de habitación inválido.');
      this.isLoading.set(false);
      return;
    }

    this.roomTypeId.set(id);
    this.loadRoomType(id);
  }

  private loadRoomType(id: number): void {
    this.roomTypeService.getById(id).subscribe({
      next: (roomType) => {
        this.editForm.patchValue({
          name: roomType.name,
          capacity: roomType.capacity,
          description: roomType.description ?? '',
          pricePerNight: roomType.pricePerNight
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar tipo de habitación:', err);
        this.errorMessage.set('No se pudo cargar la información del tipo de habitación.');
        this.isLoading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.editForm.invalid || !this.roomTypeId()) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formValue = this.editForm.getRawValue();
    const request: RoomTypeDTORequest = {
      name: formValue.name.trim(),
      capacity: Number(formValue.capacity),
      description: formValue.description?.trim() || undefined,
      pricePerNight: Number(formValue.pricePerNight)
    };

    this.roomTypeService.updateRoomType(this.roomTypeId()!, request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/dashboard/room-list']); 
      },
      error: (err) => {
        console.error('Error al actualizar tipo de habitación:', err);
        this.errorMessage.set(err?.error?.message || 'Error al actualizar el tipo de habitación.');
        this.isSubmitting.set(false);
      }
    });
  }
}