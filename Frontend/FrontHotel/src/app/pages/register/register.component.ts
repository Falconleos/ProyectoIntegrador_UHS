import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  errorMessage: string = '';
  loading: boolean = false;

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
    profilePictureFile: undefined as File | undefined
  };

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.formData.profilePictureFile = file;
    }
  }

  onSubmit(): void {
    console.log('--- Intentando registrar ---');
    console.log('Valores del formulario:', this.formData);

    this.loading = true;
    this.errorMessage = '';

    // Aseguramos que birthDay sea un string vacío si no se selecciona para cumplir con el tipo
    const payload = {
      username: this.formData.username,
      password: this.formData.password,
      name: this.formData.name,
      surname: this.formData.surname,
      dni: this.formData.dni,
      gender: this.formData.gender || '',
      email: this.formData.email,
      phoneNumber: this.formData.phoneNumber,
      address: this.formData.address || '',
      birthDay: this.formData.birthDay ? this.formData.birthDay : '',
      profilePictureFile: this.formData.profilePictureFile
    };

    this.authService.register(payload as any).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (response: any) => {
        console.log('Registro exitoso, respuesta:', response);
        const token = response.token;
        if (token) {
          localStorage.setItem('authToken', token);
        }

        const username = this.formData.username;
        localStorage.setItem('username', username);

        try {
          if (token) {
            const payloadBase64 = token.split('.')[1];
            const decodedJson = atob(payloadBase64);
            const decodedToken = JSON.parse(decodedJson);

            const roles = decodedToken.roles || [];
            localStorage.setItem('role', JSON.stringify(roles));

            if (decodedToken.name) localStorage.setItem('name', decodedToken.name);
            if (decodedToken.surname) localStorage.setItem('surname', decodedToken.surname);
          }
        } catch (e) {
          console.error('Error al decodificar el token en registro:', e);
        }

        this.authService.getUserIdByUsername(username).subscribe({
          next: (userId) => {
            if (userId) {
              localStorage.setItem('userId', userId.toString());
            }
            this.router.navigate(['/home']);
          },
          error: (err) => {
            console.warn('No se pudo obtener el ID tras el registro, redirigiendo de todas formas...', err);
            this.router.navigate(['/home']);
          }
        });
      },
      error: (err) => {
        this.errorMessage = err.error?.message || err.error?.mensaje || 'Ocurrió un error al registrarse. Verifique los datos o si el username/email/DNI ya existen.';
        this.cdr.markForCheck();
        console.error('Error de registro en backend:', err);
      }
    });
  }
}