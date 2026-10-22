import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  username: string = 'Usuario';
  userRole: string = '';
  userId: number | null = null;
  avatarUrl: string | null = null;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.username = payload.sub || localStorage.getItem('username') || 'Usuario';
        
        // Tu backend envía siempre 'roles' como un Array de Strings
        const roles = payload.roles || [];
        if (Array.isArray(roles) && roles.length > 0) {
          this.userRole = roles[0].replace(/^ROLE_/i, '').trim();
        }

        // 1. Revisar si tenemos el ID en localStorage
        const storedId = localStorage.getItem('userId');
        if (storedId) {
          this.userId = Number(storedId);
          this.loadProfilePictureById(this.userId);
        } else if (this.username && this.username !== 'Usuario') {
          // 2. Si no está en localStorage, lo consultamos
          this.authService.getUserIdByUsername(this.username).subscribe({
            next: (id) => {
              if (id) {
                this.userId = id;
                localStorage.setItem('userId', id.toString());
                this.loadProfilePictureById(id);
              }
            },
            error: (err) => {
              console.warn('No se pudo obtener el ID del usuario:', err);
            }
          });
        }

      } catch (e) {
        console.error('Error al decodificar el token:', e);
      }
    }
  }

  loadProfilePictureById(id: number): void {
    this.avatarUrl = `http://localhost:8080/public/auth/${id}/profile-picture?t=${new Date().getTime()}`;
  }

  // Método seguro para manejar el error de la imagen sin bucles infinitos
  onAvatarError(): void {
    this.avatarUrl = null; // Cambia la variable de forma controlada
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/']);
  }
}