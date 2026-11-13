import { Component, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CheckInService } from '../../core/services/check-in.service';
import { BookingDtoResponse } from '../../models/Booking-model';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { AccountService } from '../../core/services/account.service'; // <-- Importado para verificar cuentas y pagos
import * as QRCode from 'qrcode';
// @ts-ignore
import jsQR from 'jsqr';

@Component({
  selector: 'app-check-in-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './check-in-list.component.html',
  styleUrls: ['./check-in-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckInListComponent implements OnInit {
  // --- Estados con Signals ---
  pendingBookingsToday = signal<BookingDtoResponse[]>([]);
  checkedInBookings = signal<BookingDtoResponse[]>([]);

  loading = signal<boolean>(true);
  errorMessage = signal<string>('');
  canModify = signal<boolean>(false);

  selectedBookingForCheckIn = signal<BookingDtoResponse | null>(null);
  inputDni = signal<string>('');
  
  users = signal<any[]>([]);
  selectedUserId = signal<number | null>(null);
  showUserSelector = signal<boolean>(false);
  
  showNewUserForm = signal<boolean>(false);
  newUser = signal({
    username: '', email: '', password: '', name: '', surname: '', dni: '', phoneNumber: ''
  });
  
  checkInError = signal<string>('');
  checkInSuccess = signal<string>('');

  // --- PROPIEDADES PARA LECTURA DE QR MEDIANTE ARCHIVO ---
  qrInputCode = signal<string>('');
  selectedBookingForQr = signal<BookingDtoResponse | null>(null);
  qrError = signal<string>('');
  qrSuccess = signal<string>('');

  // Mapa interno para almacenar las URLs de las miniaturas de QR por ID de reserva
  qrDataUrls = signal<{ [key: number]: string }>({});

  constructor(
    private checkInService: CheckInService,
    private authService: AuthService,
    private userService: UserService,
    private accountService: AccountService, // <-- Inyectado aquí
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkUserRole();
    this.loadData();
    this.loadUsers();
  }

  // --- NUEVA FUNCIÓN AUXILIAR PARA MOSTRAR EL NOMBRE CORRECTO ---
  getGuestDisplayName(booking: BookingDtoResponse): string {
    if (booking.name || booking.surname) {
      return `${booking.name || ''} ${booking.surname || ''}`.trim();
    }
    return `${booking.guestFirstName || ''} ${booking.guestLastName || ''}`.trim();
  }

  checkUserRole(): void {
    const storedRoles = localStorage.getItem('role');
    if (storedRoles) {
      try {
        const roles = JSON.parse(storedRoles);
        const hasAccess = Array.isArray(roles) 
          ? roles.some((r: any) => ['ADMIN', 'ROLE_ADMIN', 'RECEPCIONIST', 'ROLE_RECEPCIONIST'].includes(typeof r === 'string' ? r : r.authority))
          : ['ADMIN', 'ROLE_ADMIN', 'RECEPCIONIST', 'ROLE_RECEPCIONIST'].includes(storedRoles);
        this.canModify.set(hasAccess);
      } catch (e) {
        this.canModify.set(storedRoles.includes('ADMIN') || storedRoles.includes('RECEPCIONIST'));
      }
    }
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.checkInService.getTodayCheckIns().subscribe({
      next: (todayBookings) => {
        const filtered = Array.isArray(todayBookings) 
          ? todayBookings.filter(b => b.state === 'CONFIRMED' || b.state === 'PENDING') 
          : [];
        
        this.pendingBookingsToday.set(filtered);
        this.generateQrThumbnails(filtered);
        this.loadCheckedInBookings();
      },
      error: (err) => {
        console.error('Error cargando reservas:', err);
        this.errorMessage.set('No se pudieron cargar las reservas.');
        this.pendingBookingsToday.set([]);
        this.loadCheckedInBookings();
      }
    });
  }

  // Genera las miniaturas de QR en base64 para cada tarjeta
  private async generateQrThumbnails(bookings: BookingDtoResponse[]): Promise<void> {
    const map: { [key: number]: string } = {};
    for (const b of bookings) {
      if (b.qrBooking) {
        try {
          map[b.id] = await QRCode.toDataURL(b.qrBooking, { width: 120, margin: 1 });
        } catch (e) {
          console.error(`Error generando QR para reserva #${b.id}`, e);
        }
      }
    }
    this.qrDataUrls.set(map);
  }

  loadCheckedInBookings(): void {
    this.checkInService.getBookingsByState('CHECKED_IN').subscribe({
      next: (bookings) => {
        this.checkedInBookings.set(Array.isArray(bookings) ? bookings : []);
        this.loading.set(false);
      },
      error: () => {
        this.checkedInBookings.set([]);
        this.loading.set(false);
      }
    });
  }

  loadUsers(): void {
    this.userService.getAll().subscribe({
      next: (data) => { 
        this.users.set(Array.isArray(data) ? data : []); 
      },
      error: (err: any) => console.error('Error al cargar usuarios:', err)
    });
  }

  // --- GESTIÓN DE LECTURA QR MEDIANTE ADJUNTO DE IMAGEN PNG ---
  onQrFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.qrError.set('');
    this.qrSuccess.set('');

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          this.qrError.set('No se pudo inicializar el contexto de lectura de imagen.');
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0, img.width, img.height);

        const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);

        if (code) {
          this.processDecodedQrCode(code.data);
        } else {
          this.qrError.set('No se pudo detectar un código QR válido en la imagen adjunta.');
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  private processDecodedQrCode(cleanCode: string): void {
    this.qrError.set('');
    this.qrSuccess.set('');

    const found = this.pendingBookingsToday().find(
      (b: any) => b.qrBooking === cleanCode
    );

    if (found) {
      this.goToCreateCheckIn(found);
    } else {
      this.qrError.set('No se encontró ninguna reserva activa para hoy con el código QR decodificado.');
    }
  }

  closeQrModal(): void {
    this.selectedBookingForQr.set(null);
    this.qrError.set('');
    this.qrSuccess.set('');
  }
  // ------------------------------------------

  goToCreateCheckIn(booking: BookingDtoResponse): void {
    if (!this.canModify()) return;

    this.selectedBookingForCheckIn.set(booking);
    this.inputDni.set(booking.guestPhone || '');
    this.showNewUserForm.set(false);
    this.checkInSuccess.set('');
    this.checkInError.set('');
    this.selectedUserId.set(null);

    const hasUser = !!booking.username;

    if (hasUser) {
      this.showUserSelector.set(false);
      this.executeCheckInDirectly(booking.id);
    } else {
      this.showUserSelector.set(true);
      this.checkInError.set("Please select a valid user before checking in.");
    }
  }

  executeCheckInDirectly(bookingId: number): void {
    this.checkInService.checkInBooking(bookingId).subscribe({
      next: () => {
        this.checkInSuccess.set('¡Check-in realizado con éxito!');
        this.pendingBookingsToday.set(
          this.pendingBookingsToday().filter(b => b.id !== bookingId)
        );

        setTimeout(() => { 
          this.selectedBookingForCheckIn.set(null); 
          this.loadData(); 
        }, 1200);
      },
      error: (err: any) => { 
        this.checkInError.set(err.error?.message || 'Error en el proceso de check-in.'); 
      }
    });
  }

  assignAndCheckIn(): void {
    const booking = this.selectedBookingForCheckIn();
    const userId = this.selectedUserId();

    if (!booking || !userId) {
      this.checkInError.set('Debe seleccionar un usuario.');
      return;
    }

    const bId = booking.id;
    this.checkInService.assignUserToBooking(bId, userId).subscribe({
      next: () => {
        this.checkInService.checkInBooking(bId).subscribe({
          next: () => {
            this.checkInSuccess.set('¡Check-in y asociación realizados con éxito!');
            this.pendingBookingsToday.set(
              this.pendingBookingsToday().filter(b => b.id !== bId)
            );
            setTimeout(() => { 
              this.selectedBookingForCheckIn.set(null); 
              this.showUserSelector.set(false); 
              this.loadData(); 
            }, 1500);
          },
          error: (err: any) => {
            this.checkInError.set(err.error?.message || 'Error al hacer check-in tras asociar usuario.');
          }
        });
      },
      error: (err: any) => { 
        this.checkInError.set(err.error?.message || 'Error al asociar el usuario.'); 
      }
    });
  }

  submitCheckInWithDni(): void {
    const booking = this.selectedBookingForCheckIn();
    if (!booking) return;
    const bId = booking.id;

    this.checkInService.checkInBooking(bId, this.inputDni()).subscribe({
      next: () => {
        this.checkInSuccess.set('¡Check-in realizado con éxito!');
        this.pendingBookingsToday.set(
          this.pendingBookingsToday().filter(b => b.id !== bId)
        );
        setTimeout(() => { 
          this.selectedBookingForCheckIn.set(null); 
          this.loadData(); 
        }, 1200);
      },
      error: (err: any) => {
        const errorMsg = err.error?.message || 'Error en proceso.';
        this.checkInError.set(errorMsg);
        if (errorMsg.includes('no user associated')) {
          this.showUserSelector.set(false);
          this.showNewUserForm.set(true);
        }
      }
    });
  }

  createNewUserAndProceed(): void {
    const booking = this.selectedBookingForCheckIn();
    if (!booking) return;
    const bId = booking.id;

    this.checkInService.createUser(this.newUser()).subscribe({
      next: (createdUser) => {
        this.checkInService.assignUserToBooking(bId, createdUser.id).subscribe({
          next: () => {
            this.checkInService.checkInBooking(bId, createdUser.dni).subscribe({
              next: () => {
                this.checkInSuccess.set('¡Check-in exitoso!');
                this.pendingBookingsToday.set(
                  this.pendingBookingsToday().filter(b => b.id !== bId)
                );
                setTimeout(() => { 
                  this.selectedBookingForCheckIn.set(null); 
                  this.showNewUserForm.set(false); 
                  this.loadData(); 
                }, 1500);
              }
            });
          }
        });
      },
      error: (err: any) => { 
        this.checkInError.set(err.error?.message || 'Error al crear usuario.'); 
      }
    });
  }

  updateNewUserField(field: string, value: any): void {
    this.newUser.update(u => ({ ...u, [field]: value }));
  }

  // --- INTERRUPCIÓN DE ESTADÍA SIMPLIFICADA (SIN NOTA DE CRÉDITO) ---
  interruptStay(id: number): void {
    const reason = prompt('Motivo de interrupción de estadía:');
    if (!reason || !reason.trim()) {
      return;
    }

    // 1. Consultamos la cuenta financiera asociada para validar si está pagada
    this.accountService.getAccountByBookingId(id).subscribe({
      next: (account: any) => {
        if (!account || !account.isPaid) {
          alert('Advertencia: No se puede interrumpir la estadía porque la cuenta asociada no está totalmente pagada.');
          return;
        }

        const requestPayload = {
          bookingId: id,
          reason: reason.trim(),
          issueCreditNote: false // Ya no aplica para interrupciones
        };

        // 2. Ejecutamos la interrupción de forma directa
        this.checkInService.interruptStay(requestPayload).subscribe({
          next: () => {
            alert('Estadía interrumpida con éxito.');
            this.loadData();
          },
          error: (err: any) => {
            alert(err.error?.message || 'Error al intentar interrumpir la estadía.');
          }
        });
      },
      error: () => {
        alert('No se pudo verificar la cuenta financiera asociada a la reserva.');
      }
    });
  }

  viewAccountPlaceholder(id: number): void { 
    this.router.navigate([`/dashboard/account-detail/${id}`]);
  }

  servicesPlaceholder(id: number): void { 
    this.router.navigate([`/dashboard/bookings/${id}/servicios`]);
  }
}