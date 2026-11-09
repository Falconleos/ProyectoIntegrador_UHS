import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { finalize } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  errorMessage: string = '';
  loading: boolean = false;

  registerForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required]],
    name: ['', Validators.required],
    surname: ['', Validators.required],
    dni: ['', Validators.required],
    gender: [''],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: [''],
    address: [''],
    birthDay: [''] // Relajado temporalmente a opcional para evitar bloqueo si no se selecciona
  });

  onSubmit(): void {
    console.log('--- Intentando registrar ---');
    console.log('¿Formulario válido?', this.registerForm.valid);
    console.log('Valores del formulario:', this.registerForm.value);

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      console.warn('El formulario es inválido. Campos con error:', this.findInvalidControlsRecursive(this.registerForm));
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const registerData = { ...this.registerForm.value };
    
    if (!registerData.birthDay) {
      registerData.birthDay = null;
    }

    this.authService.register(registerData).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (response: any) => {
        console.log('Registro exitoso, respuesta:', response);
        const token = response.token;
        localStorage.setItem('authToken', token);

        const username = registerData.username;
        localStorage.setItem('username', username);

        try {
          const payloadBase64 = token.split('.')[1];
          const decodedJson = atob(payloadBase64);
          const decodedToken = JSON.parse(decodedJson);

          const roles = decodedToken.roles || [];
          localStorage.setItem('role', JSON.stringify(roles));

          if (decodedToken.name) {
            localStorage.setItem('name', decodedToken.name);
          }
          if (decodedToken.surname) {
            localStorage.setItem('surname', decodedToken.surname);
          }
        } catch (e) {
          console.error('Error al decodificar el token en registro:', e);
        }

        // Obtener el ID consultando al endpoint público
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
        this.errorMessage = err.error?.message || err.error?.mensaje || 'Ocurrió un error al registrarse. Verifique los datos.';
        this.cdr.markForCheck();
        console.error('Error de registro en backend:', err);
      }
    });
  }

  // Función auxiliar para detectar qué campo exacto falló en la validación
  private findInvalidControlsRecursive(formToInvestigate: FormGroup | any): string[] {
    var invalidControls: string[] = [];
    let controls = formToInvestigate.controls;
    for (let name in controls) {
      if (controls[name].invalid) {
        invalidControls.push(name);
      }
    }
    return invalidControls;
  }
}