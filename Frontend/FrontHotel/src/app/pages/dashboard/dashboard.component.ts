import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs'; // <-- NUEVO
import { AuthService } from '../../core/services/auth.service';
import { RoomAttentionService } from '../../core/services/room-attention.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  username: string = 'Usuario';
  userRole: string = '';
  userId: number | null = null;
  avatarUrl: string | null = null;

  pendingAttentionsCount = signal<number>(0);
  private attentionSub?: Subscription; // <-- NUEVO

  private router = inject(Router);
  private authService = inject(AuthService);
  private roomAttentionService = inject(RoomAttentionService);

  ngOnInit(): void {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.username = payload.sub || localStorage.getItem('username') || 'Usuario';
        
        const roles = payload.roles || [];
        if (Array.isArray(roles) && roles.length > 0) {
          this.userRole = roles[0].replace(/^ROLE_/i, '').trim();
        }

        const storedId = localStorage.getItem('userId');
        if (storedId) {
          this.userId = Number(storedId);
          this.loadProfilePictureById(this.userId);
        } else if (this.username && this.username !== 'Usuario') {
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

    // Carga inicial de pendientes
    this.loadPendingAttentions();

    // --- NUEVO: Suscribirse a los cambios en tiempo real ---
    this.attentionSub = this.roomAttentionService.attentionUpdated$.subscribe(() => {
      this.loadPendingAttentions();
    });
  }

  ngOnDestroy(): void {
    // Evitar fugas de memoria desuscribiéndose al destruir el componente
    if (this.attentionSub) {
      this.attentionSub.unsubscribe();
    }
  }

  loadPendingAttentions(): void {
    if (this.userRole.toLowerCase() !== 'guest') {
      this.roomAttentionService.getAll().subscribe({
        next: (data) => {
          const pending = data.filter(item => !item.delivered).length;
          this.pendingAttentionsCount.set(pending);
        },
        error: (err) => {
          console.warn('No se pudieron cargar las notificaciones de servicio al cuarto', err);
        }
      });
    }
  }

  loadProfilePictureById(id: number): void {
    this.avatarUrl = `http://localhost:8080/public/auth/${id}/profile-picture?t=${new Date().getTime()}`;
  }

  onAvatarError(): void {
    this.avatarUrl = null; 
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/']);
  }
}