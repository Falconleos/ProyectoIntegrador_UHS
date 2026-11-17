import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { UserService } from '../../core/services/user.service';
import { ChangePasswordDtoRequest } from '../../models/ChangePassword-model';
import { UserDtoRequest } from '../../models/User-model';

@Component({
    selector: 'app-change-password',
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './change-password.component.html',
    styleUrls: ['./change-password.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChangePasswordComponent implements OnInit {
  private fb = inject(NonNullableFormBuilder);
  private userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef);

  currentUserId = signal<number | null>(null);
  profilePictureFile: File | undefined = undefined;

  // Estados independientes para Datos Personales
  loadingProfile = signal(false);
  profileSuccess = signal('');
  profileError = signal('');

  // Estados independientes para Contraseña
  loadingPassword = signal(false);
  passwordSuccess = signal('');
  passwordError = signal('');

  // 1. Formulario de Datos de Usuario
  profileForm = this.fb.group({
    username: ['', Validators.required],
    name: ['', Validators.required],
    surname: ['', Validators.required],
    dni: ['', Validators.required],
    gender: [''],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: [''],
    address: [''],
    birthDay: ['']
  });

  // 2. Formulario de Cambio de Contraseña (con contraseña actual)
  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [
      Validators.required,
      Validators.minLength(8)
    ]],
    confirmPassword: ['', Validators.required]
  });

  ngOnInit(): void {
    this.loadCurrentUserData();
  }

  /**
   * Carga directamente los datos actuales del usuario autenticado
   * utilizando el nuevo endpoint /private/user/me
   */
  private loadCurrentUserData(): void {
    this.loadingProfile.set(true);

    this.userService.getAuthenticatedUser().subscribe({
      next: (fullUser) => {
        this.currentUserId.set(fullUser.id);

        this.profileForm.patchValue({
          username: fullUser.username || '',
          name: fullUser.name || '',
          surname: fullUser.surname || '',
          dni: fullUser.dni || '',
          gender: fullUser.gender || '',
          email: fullUser.email || '',
          phoneNumber: fullUser.phoneNumber || '',
          address: fullUser.address || '',
          birthDay: fullUser.birthDay ? fullUser.birthDay.split('T')[0] : ''
        });

        this.loadingProfile.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al obtener el usuario autenticado:', err);
        this.profileError.set('No se pudieron cargar los datos actuales de tu perfil.');
        this.loadingProfile.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.profilePictureFile = input.files[0];
    }
  }

  // Envío 1: Actualizar datos personales y foto
  onSubmitProfile(): void {
    const userId = this.currentUserId();
    if (!userId) return;

    this.profileSuccess.set('');
    this.profileError.set('');

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.loadingProfile.set(true);
    const raw = this.profileForm.getRawValue();

    const payload: UserDtoRequest = {
      username: raw.username,
      name: raw.name,
      surname: raw.surname,
      dni: raw.dni,
      gender: raw.gender || undefined,
      email: raw.email,
      phoneNumber: raw.phoneNumber || undefined,
      address: raw.address || undefined,
      birthDay: raw.birthDay || ''
    };

    this.userService.updateUser(userId, payload).subscribe({
      next: () => {
        if (this.profilePictureFile) {
          const formData = new FormData();
          formData.append('profilePicture', this.profilePictureFile);

          this.userService.updateProfilePicture(userId, formData).subscribe({
            next: () => {
              this.profilePictureFile = undefined;
              this.profileSuccess.set('Datos personales y foto actualizados correctamente.');
              this.loadingProfile.set(false);
              this.cdr.markForCheck();
            },
            error: () => {
              this.profileSuccess.set('Datos guardados, pero hubo un error al subir la foto.');
              this.loadingProfile.set(false);
              this.cdr.markForCheck();
            }
          });
        } else {
          this.profileSuccess.set('Datos personales actualizados correctamente.');
          this.loadingProfile.set(false);
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        const msg = err.error?.mensaje || err.error?.message || 'Error al actualizar los datos del usuario.';
        this.profileError.set(msg);
        this.loadingProfile.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  // Envío 2: Cambiar contraseña validando la actual
  onSubmitPassword(): void {
    this.passwordSuccess.set('');
    this.passwordError.set('');

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();

    if (newPassword !== confirmPassword) {
      this.passwordError.set('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    const request: ChangePasswordDtoRequest = {
      currentPassword,
      newPassword
    };

    this.loadingPassword.set(true);

    this.userService.changePassword(request).subscribe({
      next: () => {
        this.passwordSuccess.set('La contraseña se actualizó correctamente.');
        this.passwordForm.reset();
        this.loadingPassword.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        const msg = err.error?.mensaje || err.error?.message || 'Error al cambiar contraseña. Verificá tu clave actual.';
        this.passwordError.set(msg);
        this.loadingPassword.set(false);
        this.cdr.markForCheck();
      }
    });
  }
}