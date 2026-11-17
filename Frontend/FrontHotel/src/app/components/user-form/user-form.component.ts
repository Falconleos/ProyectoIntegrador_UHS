import { Component, ChangeDetectorRef, ChangeDetectionStrategy, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../core/services/user.service';
import { UserDtoRequestCreation, RoleType } from '../../models/User-model';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-user-form',
    imports: [FormsModule, RouterLink],
    templateUrl: './user-form.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./user-form.component.css']
})
export class UserFormComponent {
  formData = {
    username: '',
    password: '',
    name: '',
    surname: '',
    dni: '',
    gender: '',
    email: '',
    phoneNumber: '',
    address: '',
    birthDay: '',
    role: 'GUEST' as RoleType,
    profilePictureFile: undefined as File | undefined,
    enabled: true
  };

  loading = false;
  errorMessage = '';

  private userService = inject(UserService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  
  
  // Capturo el archivo seleccionado desde el input de tipo file para la foto de perfil
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.formData.profilePictureFile = file;
    }
  }

  // Preparo el payload con los datos del formulario e invoco al servicio para registrar el usuario
  onSubmit(): void {
    this.errorMessage = '';
    this.loading = true;

    const payload: UserDtoRequestCreation = {
      username: this.formData.username,
      password: this.formData.password,
      name: this.formData.name,
      surname: this.formData.surname,
      dni: this.formData.dni,
      gender: this.formData.gender,
      email: this.formData.email,
      phoneNumber: this.formData.phoneNumber,
      address: this.formData.address || undefined,
      birthDay: this.formData.birthDay ? this.formData.birthDay : undefined,
      role: this.formData.role,
      profilePictureFile: this.formData.profilePictureFile,
      enabled: this.formData.enabled
    };

    // Envío el objeto de transferencia al backend mediante el servicio HTTP
    this.userService.createUser(payload).subscribe({
      next: () => {
        this.loading = false;
        alert('¡Usuario creado con éxito!');
        this.router.navigate(['/dashboard/usuarios']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.mensaje || err.error?.message || 'Error al registrar el usuario en el sistema. Verifique los datos o si el username/email/DNI ya existen.';
        this.cdr.markForCheck();
        alert(this.errorMessage);
        console.error(err);
      }
    });
  }
}