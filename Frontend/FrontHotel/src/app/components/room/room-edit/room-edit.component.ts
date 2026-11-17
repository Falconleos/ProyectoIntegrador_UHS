import { Component, inject, OnInit, signal, OnDestroy } from '@angular/core';
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
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './room-edit.component.html',
    styleUrl: './room-edit.component.css'
})
export class RoomEditComponent implements OnInit, OnDestroy {

  private fb = inject(NonNullableFormBuilder);
  private roomService = inject(RoomService);
  private roomTypeService = inject(RoomTypeService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  roomId = 0;

  roomTypes = signal<RoomTypeDTOResponse[]>([]);
  selectedImages = signal<File[]>([]); // Nuevas imágenes a subir
  selectedImagePreviews = signal<string[]>([]); // Vistas previas de las nuevas imágenes
  existingImages = signal<string[]>([]); // URLs temporales de las imágenes actuales

  loading = signal(true);
  loadingImages = signal(false);
  saving = signal(false);
  errorMessage = signal('');

  roomForm = this.fb.group({
    number: [0, [Validators.required, Validators.min(1)]],
    roomTypeId: [0, [Validators.required, Validators.min(1)]]
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      this.errorMessage.set('El ID de la habitación no es válido.');
      this.loading.set(false);
      return;
    }

    this.roomId = id;
    this.loadRoomData();
  }

  loadRoomData(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.roomService.getById(this.roomId).subscribe({
      next: (room: RoomDtoResponse) => {
        this.roomForm.patchValue({
          number: Number(room.number),
          roomTypeId: room.roomTypeDTOResponse?.id ?? 0
        });

        this.loadRoomTypes();
        this.loadExistingImages(room);
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

  loadExistingImages(room: RoomDtoResponse): void {
    const total = room.imagesCount ?? 0;
    if (total === 0) return;

    this.loadingImages.set(true);
    const urls: string[] = [];
    let descargadas = 0;

    for (let i = 0; i < total; i++) {
      this.roomService.getRoomImage(room.id, i).subscribe({
        next: (blob) => {
          urls[i] = URL.createObjectURL(blob);
          descargadas++;
          if (descargadas === total) {
            this.existingImages.set(urls);
            this.loadingImages.set(false);
          }
        },
        error: () => {
          descargadas++;
          if (descargadas === total) {
            this.loadingImages.set(false);
          }
        }
      });
    }
  }

  removeExistingImage(index: number): void {
    if (!window.confirm('¿Estás seguro de eliminar esta imagen?')) return;

    this.roomService.deleteRoomImage(this.roomId, index).subscribe({
      next: (roomActualizada) => {
        URL.revokeObjectURL(this.existingImages()[index]);
        this.existingImages.set([]);
        this.loadExistingImages(roomActualizada);
      },
      error: () => {
        this.errorMessage.set('No se pudo eliminar la imagen.');
      }
    });
  }

  // Captura los archivos nuevos y genera sus miniaturas temporales
  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      // Limpiamos previsualizaciones anteriores para evitar fugas de memoria
      this.selectedImagePreviews().forEach(url => URL.revokeObjectURL(url));

      const files = Array.from(input.files);
      this.selectedImages.set(files);

      const previews = files.map(file => URL.createObjectURL(file));
      this.selectedImagePreviews.set(previews);
    }
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
        const newImages = this.selectedImages();

        if (newImages.length > 0) {
          this.roomService.addImages(this.roomId, newImages).subscribe({
            next: () => {
              this.saving.set(false);
              this.router.navigate(['/dashboard/room-list']);
            },
            error: () => {
              this.errorMessage.set('Datos actualizados, pero falló la subida de nuevas imágenes.');
              this.saving.set(false);
            }
          });
        } else {
          this.saving.set(false);
          this.router.navigate(['/dashboard/room-list']);
        }
      },
      error: () => {
        this.errorMessage.set('No se pudo actualizar la habitación.');
        this.saving.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    // Limpieza de todas las URLs en memoria
    this.existingImages().forEach(url => URL.revokeObjectURL(url));
    this.selectedImagePreviews().forEach(url => URL.revokeObjectURL(url));
  }
}