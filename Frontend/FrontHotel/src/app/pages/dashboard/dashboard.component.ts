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

  // Estado para controlar la apertura del menú móvil (hamburguesa)
  sidebarOpen = false;

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
    if (this.attentionSub) {
      this.attentionSub.unsubscribe();
    }
  }

  // Métodos para controlar el menú lateral en móvil
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

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

  private initRealtimeSubscriptions(): void {
    this.attentionSub = this.roomAttentionService.attentionUpdated$.subscribe(() => {
      this.loadPendingAttentions();
    });
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