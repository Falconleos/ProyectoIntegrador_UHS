
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { UserService } from '../../core/services/user.service';
import { ChangePasswordDtoRequest } from '../../models/ChangePassword-model';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChangePasswordComponent {

  // Inyección de dependencias
  private fb = inject(NonNullableFormBuilder);
  private userService = inject(UserService);

  // Estados del componente
  loading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  // Formulario
  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [
      Validators.required,
      Validators.minLength(8)
    ]],
    confirmPassword: ['', Validators.required]
  });

  // Envío del formulario
  onSubmit(): void {

    this.successMessage.set('');
    this.errorMessage.set('');

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const {
      currentPassword,
      newPassword,
      confirmPassword
    } = this.passwordForm.getRawValue();

    // Validar coincidencia de contraseñas
    if (newPassword !== confirmPassword) {
      this.errorMessage.set(
        'La nueva contraseña y su confirmación no coinciden.'
      );
      return;
    }

    // Construir DTO
    const request: ChangePasswordDtoRequest = {
      currentPassword,
      newPassword
    };

    this.loading.set(true);

    // Llamada al servicio
    this.userService.changePassword(request).subscribe({

      next: () => {
        this.successMessage.set(
          'La contraseña se actualizó correctamente.'
        );

        this.passwordForm.reset();
        this.loading.set(false);
      },

      error: () => {
        this.errorMessage.set('Error al cambiar contraseña'
        );

        this.loading.set(false);
      }

    });
  }
}
