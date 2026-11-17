import { Component, ChangeDetectorRef, inject, ChangeDetectionStrategy } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { finalize } from 'rxjs';

@Component({
    selector: 'app-register',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './register.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);

  errorMessage: string = '';
  loading: boolean = false;
  selectedFile: File | undefined = undefined;

  registerForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required]],
    name: ['', [Validators.required]],
    surname: ['', [Validators.required]],
    dni: ['', [Validators.required]],
    gender: [''],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required]],
    address: [''],
    birthDay: ['']
  });

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    console.log('--- Intentando registrar ---');
    const formValues = this.registerForm.value;
    console.log('Valores del formulario:', formValues);

    this.loading = true;
    this.errorMessage = '';

    const payload = {
      ...formValues,
      gender: formValues.gender || '',
      address: formValues.address || '',
      birthDay: formValues.birthDay ? formValues.birthDay : '',
      profilePictureFile: this.selectedFile
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

        const username = formValues.username;
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