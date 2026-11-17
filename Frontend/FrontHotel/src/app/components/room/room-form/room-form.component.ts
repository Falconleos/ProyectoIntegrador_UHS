import { Component, inject, OnInit, signal, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import {
  ReactiveFormsModule,
  NonNullableFormBuilder,
  Validators
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';

import { RoomService } from '../../../core/services/room.service';
import { RoomTypeService } from '../../../core/services/room-type.service';
import { RoomTypeDTOResponse } from '../../../models/RoomType-model';

@Component({
    selector: 'app-room-form',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './room-form.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './room-form.component.css'
})
export class RoomFormComponent implements OnInit, OnDestroy {

  private fb = inject(NonNullableFormBuilder);
  private roomService = inject(RoomService);
  private roomTypeService = inject(RoomTypeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  roomTypes = signal<RoomTypeDTOResponse[]>([]);
  selectedImages = signal<File[]>([]);
  imagePreviews = signal<string[]>([]); // Señal para almacenar las URLs temporales de las miniaturas

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
    this.checkUrlParameters(); 
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

  checkUrlParameters(): void {
    const typeIdParam = this.route.snapshot.queryParamMap.get('roomTypeId');
    
    if (typeIdParam) {
      const parsedId = Number(typeIdParam);
      this.roomForm.patchValue({ roomTypeId: parsedId });
    }
  }

  // Captura los archivos y genera las URLs para las miniaturas
  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      // Limpiamos URLs anteriores para evitar fugas de memoria si selecciona varias veces
      this.imagePreviews().forEach(url => URL.revokeObjectURL(url));

      const files = Array.from(input.files);
      this.selectedImages.set(files);

      // Generamos las vistas previas en miniatura
      const previews = files.map(file => URL.createObjectURL(file));
      this.imagePreviews.set(previews);
    }
  }

  createRoom(): void {
    if (this.roomForm.invalid || this.saving()) {
      this.roomForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const request = this.roomForm.getRawValue();

    this.roomService.createRoom(request, this.selectedImages()).subscribe({
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

  ngOnDestroy(): void {
    // Liberamos las URLs temporales de memoria al destruir el componente
    this.imagePreviews().forEach(url => URL.revokeObjectURL(url));
  }
}