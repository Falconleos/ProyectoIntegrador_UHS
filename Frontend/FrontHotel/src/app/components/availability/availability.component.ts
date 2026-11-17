import { Component, OnInit, ChangeDetectionStrategy, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { BookingService } from '../../core/services/booking.service';
import { BookingStateService } from '../../core/services/booking-state.service';
import { RoomService } from '../../core/services/room.service';
import { RoomDtoResponse } from '../../models/Room-model';

@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './availability.component.html',
  styleUrls: ['./availability.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvailabilityComponent implements OnInit, OnDestroy {
  availabilityForm!: FormGroup;
  
  // --- Estados con Signals ---
  availableRooms = signal<RoomDtoResponse[]>([]);
  loading = signal<boolean>(false);
  hasSearched = signal<boolean>(false);
  errorMessage = signal<string>('');

  // --- Estados para el Modal de Detalle y Carrusel de Imágenes ---
  selectedRoom = signal<RoomDtoResponse | null>(null);
  roomImages = signal<string[]>([]);
  loadingImages = signal(false);
  imageError = signal('');
  currentImageIndex = signal(0);
  private imageSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private bookingService: BookingService,
    private bookingStateService: BookingStateService,
    private roomService: RoomService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  ngOnDestroy(): void {
    this.closeRoomModal();
  }

  initForm(): void {
    const today = new Date().toISOString().split('T')[0];
    
    this.availabilityForm = this.fb.group({
      checkIn: [today, [Validators.required]],
      checkOut: ['', [Validators.required]],
      guestCount: [1, [Validators.required, Validators.min(1)]]
    });
  }

  onSearch(): void {
    if (this.availabilityForm.invalid) {
      this.availabilityForm.markAllAsTouched();
      return;
    }

    const { checkIn, checkOut, guestCount } = this.availabilityForm.value;

    if (checkOut <= checkIn) {
      this.errorMessage.set('La fecha de check-out debe ser posterior al check-in.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.hasSearched.set(true);

    this.bookingService.getAvailableRooms(checkIn, checkOut, guestCount).subscribe({
      next: (rooms) => {
        this.availableRooms.set(Array.isArray(rooms) ? [...rooms] : []);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.errorMessage.set('Error al consultar la disponibilidad en el sistema.');
        this.loading.set(false);
        console.error(err);
      }
    });
  }

  calculateDays(): number {
    const { checkIn, checkOut } = this.availabilityForm.value;
    if (!checkIn || !checkOut) return 1;
    
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 1;
  }

  getRoomPrice(room: RoomDtoResponse): number {
    return room.roomTypeDTOResponse?.pricePerNight ?? room.pricePerNight ?? 0;
  }

  calculateTotalPrice(room: RoomDtoResponse): number {
    return this.getRoomPrice(room) * this.calculateDays();
  }

  selectRoomAndRedirect(room: RoomDtoResponse): void {
    const { checkIn, checkOut, guestCount } = this.availabilityForm.value;
    const pricePerNight = this.getRoomPrice(room);
    const days = this.calculateDays();
    const total = pricePerNight * days;

    const confirmationMessage = 
      `¿Desea confirmar la reserva de la Habitación #${room.number}?\n\n` +
      `Estadía: ${days} día(s) (Del ${checkIn} al ${checkOut})\n` +
      `Total estimado: $${total.toFixed(2)}`;

    const confirmed = window.confirm(confirmationMessage);

    if (confirmed) {
      this.bookingStateService.setBookingData({
        checkIn,
        checkOut,
        guestCount,
        room,
        nights: days,
        totalPrice: total
      });
      this.router.navigate(['/dashboard/booking-create']);
    }
  }

  // ==========================================
  // GESTIÓN DEL MODAL DE DETALLE Y CARRUSEL
  // ==========================================
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

    for (let i = 0; i < totalImagenes; i++) {
      this.roomService.getRoomImage(room.id, i).subscribe({
        next: (blob: Blob) => {
          if (this.selectedRoom()?.id !== room.id) return;

          const url = URL.createObjectURL(blob);
          urlsTemporales[i] = url;
          imagenesDescargadas++;

          if (imagenesDescargadas === totalImagenes) {
            this.roomImages.set(urlsTemporales);
            this.loadingImages.set(false);
          }
        },
        error: (err: unknown) => {
          if (this.selectedRoom()?.id === room.id) {
            this.imageError.set('No se pudieron cargar las imágenes.');
            this.loadingImages.set(false);
          }
          console.error(err);
        }
      });
    }
  }

  previousImage(): void {
    const total = this.roomImages().length;
    if (total === 0) return;

    let nuevoIndice = this.currentImageIndex() - 1;
    if (nuevoIndice < 0) {
      nuevoIndice = total - 1;
    }
    this.currentImageIndex.set(nuevoIndice);
  }

  nextImage(): void {
    const total = this.roomImages().length;
    if (total === 0) return;

    let nuevoIndice = this.currentImageIndex() + 1;
    if (nuevoIndice >= total) {
      nuevoIndice = 0;
    }
    this.currentImageIndex.set(nuevoIndice);
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
}