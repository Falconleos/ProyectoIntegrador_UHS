import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';

import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { RoomAttentionService } from '../../core/services/room-attention.service';

@Component({
    selector: 'app-dashboard',
    imports: [RouterOutlet, RouterLink, RouterLinkActive],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  
  // --- Propiedades de perfil e identidad del usuario ---
  username: string = 'Usuario';
  userRole: string = '';
  userId: number | null = null;
  avatarUrl: string | null = null;

  // --- Estados y control de UI ---
  sidebarOpen = false;
  pendingAttentionsCount = signal<number>(0);
  private attentionSub?: Subscription;

  // --- Inyecciones de dependencias ---
  private router = inject(Router);
  private authService = inject(AuthService);
  private roomAttentionService = inject(RoomAttentionService);

  /**
   * Ciclo de vida inicial del componente.
   * Carga los datos del usuario, las notificaciones pendientes y activa las escuchas en tiempo real.
   */
  ngOnInit(): void {
    this.initUserDataFromToken();
    this.loadPendingAttentions();
    this.initRealtimeSubscriptions();
  }

  /**
   * Ciclo de vida de destrucción del componente.
   * Limpia las suscripciones activas para evitar fugas de memoria.
   */
  ngOnDestroy(): void {
    if (this.attentionSub) {
      this.attentionSub.unsubscribe();
    }
  }

  /**
   * Alterna el estado de apertura del menú lateral en dispositivos móviles.
   */
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  /**
   * Cierra el menú lateral móvil.
   */
  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  /**
   * Decodifica el token JWT almacenado para extraer el nombre de usuario y su rol principal.
   */
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

  /**
   * Resuelve el ID del usuario actual, buscándolo en el almacenamiento local o consultándolo al servidor.
   */
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

  /**
   * Se suscribe al observable global para actualizar las notificaciones automáticamente ante nuevos eventos.
   */
  private initRealtimeSubscriptions(): void {
    this.attentionSub = this.roomAttentionService.attentionUpdated$.subscribe(() => {
      this.loadPendingAttentions();
    });
  }

  /**
   * Consulta al servidor las atenciones de habitación y actualiza el contador si el usuario no es huésped.
   */
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

  /**
   * Genera la URL para cargar la imagen de perfil del usuario mediante su ID.
   */
  loadProfilePictureById(id: number): void {
    this.avatarUrl = `http://localhost:8080/public/auth/${id}/profile-picture?t=${new Date().getTime()}`;
  }

  /**
   * Restablece la URL del avatar si ocurre un error al cargar la imagen.
   */
  onAvatarError(): void {
    this.avatarUrl = null; 
  }

  /**
   * Limpia el almacenamiento local y redirige al usuario a la página principal (Cierre de sesión).
   */
  logout(): void {
    localStorage.clear();
    this.router.navigate(['/']);
  }
}