import { Component, OnInit, ChangeDetectionStrategy, signal, computed, ChangeDetectorRef } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BookingService } from '../../core/services/booking.service';
import { BookingStateService } from '../../core/services/booking-state.service';
import { UserDtoResponse } from '../../models/User-model';
import * as QRCode from 'qrcode';
import { BookingDtoResponse } from '../../models/Booking-model';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-booking-form',
    imports: [ReactiveFormsModule, RouterLink],
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
  isGuestUser = signal<boolean>(false);
  loading = signal<boolean>(false);
  errorMessage = signal<string>('');

  // --- Estados y señales para el Modal de Selección de Usuarios ---
  isUserModalOpen = signal(false);
  selectedUserName = '';
  userAvatars: { [key: number]: string } = {};
  searchText = signal('');

  // Computada para filtrar en tiempo real por nombre, apellido, username o DNI
  filteredUsers = computed(() => {
    const list = this.usersList();
    const search = this.searchText().toLowerCase().trim();

    if (!search) return list;

    return list.filter(user => {
      const name = user.name || '';
      const surname = user.surname || '';
      const username = user.username || '';
      const dni = user.dni || '';
      const searchString = `${name} ${surname} ${username} ${dni}`.toLowerCase();
      return searchString.includes(search);
    });
  });

  constructor(
    private fb: FormBuilder,
    private bookingService: BookingService,
    private bookingStateService: BookingStateService,
    private userService: UserService, 
    public authService: AuthService,
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.bookingData = this.bookingStateService.getBookingData();

    if (!this.bookingData) {
      alert('No se ha seleccionado ninguna habitación previa.');
      this.router.navigate(['/dashboard/availability']);
      return;
    }

    this.initForm();

    const storedRoles = localStorage.getItem('role');
    const isGuest = storedRoles ? storedRoles.includes('GUEST') : false;
    const currentUserId = localStorage.getItem('userId');

    this.isGuestUser.set(isGuest);

    if (isGuest && currentUserId) {
      this.isRegisteredUser.set(true);
      this.bookingForm.patchValue({
        isRegisteredUser: true,
        userId: Number(currentUserId)
      });
      this.bookingForm.get('isRegisteredUser')?.disable();
      this.bookingForm.get('userId')?.disable();

      this.loadUsersForGuest(Number(currentUserId));
    } else {
      this.loadUsers();
    }
  }

  private filterGuestUsers(users: any[]): UserDtoResponse[] {
    if (!Array.isArray(users)) return [];
    return users.filter(user => {
      const roles = user.roles || user.authorities || user.role;
      if (!roles) return false;

      if (Array.isArray(roles)) {
        return roles.some((r: any) => {
          const roleName = typeof r === 'string' ? r : (r.authority || r.name);
          return roleName && (roleName.includes('ROLE_GUEST') || roleName === 'GUEST');
        });
      } else if (typeof roles === 'string') {
        return roles.includes('ROLE_GUEST') || roles === 'GUEST';
      }
      return false;
    });
  }

  loadUsers(): void {
    this.http.get<UserDtoResponse[]>('http://localhost:8080/private/user', { withCredentials: true }).subscribe({
      next: (users: UserDtoResponse[]) => {
        const guestOnly = this.filterGuestUsers(users);
        this.usersList.set(guestOnly);
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.error('Error al cargar la lista de usuarios', err);
        this.usersList.set([]);
        this.cdr.markForCheck();
      }
    });
  }

  loadUsersForGuest(userId: number): void {
    this.http.get<UserDtoResponse[]>('http://localhost:8080/private/user', { withCredentials: true }).subscribe({
      next: (users: UserDtoResponse[]) => {
        const guestOnly = this.filterGuestUsers(users);
        this.usersList.set(guestOnly);
        this.cdr.markForCheck();
      },
      error: () => {
        const username = localStorage.getItem('username') || 'Mi Usuario';
        this.usersList.set([{ id: userId, username, name: username, surname: '', email: '', enabled: true } as any]);
        this.cdr.markForCheck();
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
        this.selectedUserName = '';
      }

      firstNameCtrl?.updateValueAndValidity();
      lastNameCtrl?.updateValueAndValidity();
      phoneCtrl?.updateValueAndValidity();
      userIdCtrl?.updateValueAndValidity();
    });
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchText.set(input.value);
  }

  openUserModal(): void {
    this.isUserModalOpen.set(true);
    this.usersList().forEach(user => {
      this.loadUserAvatar(user);
    });
  }

  closeUserModal(): void {
    this.isUserModalOpen.set(false);
    this.searchText.set('');
  }

  loadUserAvatar(user: UserDtoResponse): void {
    if (!user || !user.id) return;
    if (this.userAvatars[user.id]) return;

    this.userService.getProfilePicture(user.id).subscribe({
      next: (blob) => {
        const objectURL = URL.createObjectURL(blob);
        this.userAvatars[user.id] = objectURL;
        this.cdr.markForCheck();
      },
      error: () => {
        this.userAvatars[user.id] = 'assets/default-avatar.png';
        this.cdr.markForCheck();
      }
    });
  }

  getUserAvatarUrl(user: UserDtoResponse | null): string {
    if (!user || !user.id) return 'assets/default-avatar.png';
    return this.userAvatars[user.id] || 'assets/default-avatar.png';
  }

  selectUser(user: UserDtoResponse): void {
    this.selectedUserName = `${user.name} ${user.surname} (@${user.username})`;
    this.bookingForm.patchValue({ userId: user.id });
    this.closeUserModal();
    this.cdr.markForCheck();
  }

  goToCreateUser(): void {
    this.closeUserModal();
    this.router.navigate(['/dashboard/user-creation']);
  }

  getSubmitButtonIcon(): string {
    return this.loading() ? 'bi bi-arrow-repeat bi-spin' : 'bi bi-check-lg';
  }

  onSubmit(): void {
    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const formValues = this.bookingForm.getRawValue();

    const currentUserIdStr = localStorage.getItem('userId');
    const isGuestUser = this.isGuestUser(); // 👈 Usando la signal local

    const targetUserId = isGuestUser && currentUserIdStr 
      ? Number(currentUserIdStr) 
      : (formValues.isRegisteredUser ? Number(formValues.userId) : null);

    let firstName = formValues.guestFirstName;
    let lastName = formValues.guestLastName;
    let phone = formValues.guestPhone;

    if (isGuestUser) {
      firstName = localStorage.getItem('name') || 'Huésped';
      lastName = localStorage.getItem('surname') || 'Titular';
    } else if (formValues.isRegisteredUser && formValues.userId) {
      const selectedUser = this.usersList().find(u => u.id === Number(formValues.userId));
      if (selectedUser) {
        firstName = selectedUser.name;
        lastName = selectedUser.surname;
        phone = selectedUser.phoneNumber || phone;
      }
    }

    this.enviarCreacionReserva(targetUserId, firstName, lastName, phone, formValues.observation);
  }

  private enviarCreacionReserva(userId: number | null, firstName: string, lastName: string, phone: string, observation: string): void {
    const requestPayload = {
      checkIn: this.bookingData.checkIn,
      checkOut: this.bookingData.checkOut,
      guestCount: this.bookingData.guestCount,
      roomId: this.bookingData.room.id,
      userId: userId,
      guestFirstName: firstName || 'Huésped',
      guestLastName: lastName || 'Titular',
      guestPhone: phone || 'Sin teléfono',
      observation: observation || undefined,
      totalPrice: this.bookingData.totalPrice
    };

    this.bookingService.createBooking(requestPayload).subscribe({
      next: async (response: BookingDtoResponse) => {
        this.loading.set(false);

        if (response.qrBooking) {
          try {
            const qrDataUrl = await QRCode.toDataURL(response.qrBooking, {
              width: 300,
              margin: 2
            });

            const link = document.createElement('a');
            link.href = qrDataUrl;
            link.download = `qr-reserva-${response.id}-${response.guestLastName || 'guest'}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } catch (err) {
            console.error('Error al generar la imagen QR de la reserva', err);
          }
        }

        alert('¡Reserva creada con éxito y código QR descargado!');
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