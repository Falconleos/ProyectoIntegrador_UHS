import { Component, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BookingService } from '../../core/services/booking.service';
import { BookingStateService } from '../../core/services/booking-state.service';
import { UserDtoResponse } from '../../models/User-model';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './booking-form.component.html',
  styleUrls: ['./booking-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookingFormComponent implements OnInit {
  bookingForm!: FormGroup;
  bookingData: any = null;
  
  // --- Estados con Signals ---
  usersList = signal<UserDtoResponse[]>([]);
  isRegisteredUser = signal<boolean>(false);
  loading = signal<boolean>(false);
  errorMessage = signal<string>('');

  constructor(
    private fb: FormBuilder,
    private bookingService: BookingService,
    private bookingStateService: BookingStateService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.bookingData = this.bookingStateService.getBookingData();

    if (!this.bookingData) {
      alert('No se ha seleccionado ninguna habitación previa.');
      this.router.navigate(['/dashboard/bookings/disponibilidad']);
      return;
    }

    this.initForm();
    this.loadUsers();
  }

  loadUsers(): void {
    this.http.get<UserDtoResponse[]>('http://localhost:8080/private/user', { withCredentials: true }).subscribe({
      next: (users: UserDtoResponse[]) => {
        this.usersList.set(Array.isArray(users) ? users : []);
      },
      error: (err: any) => {
        console.error('Error al cargar la lista de usuarios', err);
        this.usersList.set([]);
      }
    });
  }

  initForm(): void {
    this.bookingForm = this.fb.group({
      isRegisteredUser: [false],
      userId: [null],
      guestFirstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      guestLastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      guestPhone: ['', [Validators.required]],
      observation: ['', [Validators.maxLength(250)]]
    });

    // Control dinámico de validaciones mediante Signals
    this.bookingForm.get('isRegisteredUser')?.valueChanges.subscribe((isReg: boolean) => {
      this.isRegisteredUser.set(isReg);
      
      const firstNameCtrl = this.bookingForm.get('guestFirstName');
      const lastNameCtrl = this.bookingForm.get('guestLastName');
      const phoneCtrl = this.bookingForm.get('guestPhone');
      const userIdCtrl = this.bookingForm.get('userId');

      if (isReg) {
        firstNameCtrl?.clearValidators();
        lastNameCtrl?.clearValidators();
        phoneCtrl?.clearValidators();
        userIdCtrl?.setValidators([Validators.required]);
      } else {
        firstNameCtrl?.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(100)]);
        lastNameCtrl?.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(100)]);
        phoneCtrl?.setValidators([Validators.required]);
        userIdCtrl?.clearValidators();
        userIdCtrl?.setValue(null);
      }

      firstNameCtrl?.updateValueAndValidity();
      lastNameCtrl?.updateValueAndValidity();
      phoneCtrl?.updateValueAndValidity();
      userIdCtrl?.updateValueAndValidity();
    });
  }

  onSubmit(): void {
    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const formValues = this.bookingForm.value;

    let firstName = formValues.guestFirstName;
    let lastName = formValues.guestLastName;
    let phone = formValues.guestPhone;

    if (formValues.isRegisteredUser && formValues.userId) {
      const selectedUser = this.usersList().find(u => u.id === Number(formValues.userId));
      if (selectedUser) {
        firstName = selectedUser.name;
        lastName = selectedUser.surname;
        phone = selectedUser.phoneNumber || 'Sin teléfono';
      }
    }

    const requestPayload = {
      checkIn: this.bookingData.checkIn,
      checkOut: this.bookingData.checkOut,
      guestCount: this.bookingData.guestCount,
      roomId: this.bookingData.room.id,
      userId: formValues.isRegisteredUser ? Number(formValues.userId) : null,
      guestFirstName: firstName,
      guestLastName: lastName,
      guestPhone: phone || 'Sin teléfono',
      observation: formValues.observation || undefined,
      totalPrice: this.bookingData.totalPrice
    };

    this.bookingService.createBooking(requestPayload).subscribe({
      next: () => {
        this.loading.set(false);
        alert('¡Reserva creada con éxito!');
        this.bookingStateService.clear();
        this.router.navigate(['/dashboard/booking-list']);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Error al registrar la reserva en el sistema. Verifique los datos.');
        console.error(err);
      }
    });
  }
}