import { Component, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { BookingStateService } from '../../core/services/booking-state.service';
import { RoomDtoResponse } from '../../models/Room-model';

@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './availability.component.html',
  styleUrls: ['./availability.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvailabilityComponent implements OnInit {
  availabilityForm!: FormGroup;
  
  // --- Estados con Signals en sintonía con tus otros componentes ---
  availableRooms = signal<RoomDtoResponse[]>([]);
  loading = signal<boolean>(false);
  hasSearched = signal<boolean>(false);
  errorMessage = signal<string>('');

  constructor(
    private fb: FormBuilder,
    private bookingService: BookingService,
    private bookingStateService: BookingStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
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
      error: (err) => {
        this.errorMessage.set('Error al consultar la disponibilidad en el sistema.');
        this.loading.set(false);
        console.error(err);
      }
    });
  }

  // <--- Calcula la cantidad de días entre checkIn y checkOut
  calculateDays(): number {
    const { checkIn, checkOut } = this.availabilityForm.value;
    if (!checkIn || !checkOut) return 1;
    
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 1;
  }

  // <--- Obtiene el precio por noche de forma segura según el modelo actual
  getRoomPrice(room: RoomDtoResponse): number {
    return room.roomTypeDTOResponse?.pricePerNight ?? room.pricePerNight ?? 0;
  }

  // <--- Calcula el costo total para una habitación específica
  calculateTotalPrice(room: RoomDtoResponse): number {
    return this.getRoomPrice(room) * this.calculateDays();
  }

  // <--- Pregunta antes de confirmar o cancelar
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
      this.router.navigate(['/dashboard/bookings/nuevo']);
    } else {
      console.log('Selección de habitación cancelada por el usuario.');
    }
  }
}