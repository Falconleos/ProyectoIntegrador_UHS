import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { finalize } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

 
  errorMessage: string = '';
  loading: boolean = false;

  loginForm: FormGroup = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';

    const loginData = this.loginForm.value;

    this.authService.login(loginData).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (response: any) => {
    // Guardar el token principal
    localStorage.setItem('authToken', response.token);

    // Decodificar el JWT para extraer el ID, username, roles, nombre y apellido
    try {
      const payloadBase64 = response.token.split('.')[1];
      const decodedJson = atob(payloadBase64);
      const decodedToken = JSON.parse(decodedJson);

      // 1. Extraer y guardar el ID del usuario desde la respuesta
      const userId = response.id;
      if (userId) {
        localStorage.setItem('userId', userId.toString());
      }

      // 2. Guardar el username desde el formulario como respaldo
      const username = loginData.username;
      localStorage.setItem('username', username);

      // 3. Guardar roles, nombre y apellido desde el token JWT
      const roles = decodedToken.roles || [];
      localStorage.setItem('role', JSON.stringify(roles));

      if (decodedToken.name) {
        localStorage.setItem('name', decodedToken.name);
      }
      if (decodedToken.surname) {
        localStorage.setItem('surname', decodedToken.surname);
      }
    } catch (e) {
      console.error('Error al decodificar el token:', e);
      localStorage.setItem('username', loginData.username);
    }

    this.router.navigate(['/dashboard']);
  },
      error: (err) => {
        this.errorMessage = err.error?.mensaje || 'Usuario o contraseña incorrectos.';
        this.cdr.markForCheck();
        console.error('Error de login:', err);
      }
    });
  }
}