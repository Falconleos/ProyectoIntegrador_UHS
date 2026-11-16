import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
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
  private attentionSub?: Subscription;

  private router = inject(Router);
  private authService = inject(AuthService);
  private roomAttentionService = inject(RoomAttentionService);

  ngOnInit(): void {
    this.initUserDataFromToken();
    this.loadPendingAttentions();
    this.initRealtimeSubscriptions();
  }

  ngOnDestroy(): void {
    // Evitamos fugas de memoria cancelando la suscripción activa al destruir el componente
    if (this.attentionSub) {
      this.attentionSub.unsubscribe();
    }
  }

  // Extrae la información del usuario y sus roles decodificando el token JWT almacenado
  private initUserDataFromToken(): void {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.username = payload.sub || localStorage.getItem('username') || 'Usuario';
      
      const roles = payload.roles || [];
      if (Array.isArray(roles) && roles.length > 0) {
        this.userRole = roles[0].replace(/^ROLE_/i, '').trim();
      }

      this.resolveUserId();
    } catch (e) {
      console.error('Error al decodificar el token:', e);
    }
  }

  // Obtiene el ID del usuario desde el almacenamiento local o lo consulta mediante el servicio si no existe
  private resolveUserId(): void {
    const storedId = localStorage.getItem('userId');
    if (storedId) {
      this.userId = Number(storedId);
      this.loadProfilePictureById(this.userId);
      return;
    }

    if (this.username && this.username !== 'Usuario') {
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
  }

  // Establece la suscripción reactiva para actualizar el contador de atenciones pendientes en tiempo real
  private initRealtimeSubscriptions(): void {
    this.attentionSub = this.roomAttentionService.attentionUpdated$.subscribe(() => {
      this.loadPendingAttentions();
    });
  }

  // Consulta al servidor las atenciones de habitación y actualiza el contador si el usuario no es huésped
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

  // Genera la URL con un parámetro temporal para refrescar la imagen de perfil del usuario
  loadProfilePictureById(id: number): void {
    this.avatarUrl = `http://localhost:8080/public/auth/${id}/profile-picture?t=${new Date().getTime()}`;
  }

  // Restablece la URL del avatar a nulo si ocurre un error al cargar la imagen
  onAvatarError(): void {
    this.avatarUrl = null; 
  }

  // Limpia el almacenamiento local de la sesión y redirige al usuario a la pantalla principal
  logout(): void {
    localStorage.clear();
    this.router.navigate(['/']);
  }
}