import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommentService } from '../../core/services/comment.service';
import { CommentDtoResponse } from '../../models/Comment-model';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingComponent implements OnInit {
  
  private commentService = inject(CommentService);
  private router = inject(Router);

  // --- Estados de Autenticación para el Navbar ---
  isLoggedIn = signal<boolean>(false);
  username = signal<string>('Usuario');
  userRole = signal<string>('');
  userId = signal<number | null>(null);
  avatarUrl = signal<string | null>(null);

  // --- Estado del Carrusel de Comentarios ---
  fiveStarComments = signal<any[]>([]);
  currentCommentIndex = signal<number>(0);

  ngOnInit(): void {
    this.checkAuthStatus();
    this.loadFiveStarComments();
  }

  /**
   * Verifica el estado de autenticación del usuario leyendo el localStorage y el token JWT
   */
  checkAuthStatus(): void {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.isLoggedIn.set(true);
        this.username.set(payload.sub || localStorage.getItem('username') || 'Usuario');
        
        const roles = payload.roles || [];
        if (Array.isArray(roles) && roles.length > 0) {
          this.userRole.set(roles[0].replace(/^ROLE_/i, '').trim());
        }

        const storedId = localStorage.getItem('userId');
        if (storedId) {
          this.userId.set(Number(storedId));
          this.loadProfilePictureById(Number(storedId));
        }
      } catch (e) {
        console.error('Error al decodificar el token en la landing:', e);
        this.logout();
      }
    }
  }

  loadProfilePictureById(id: number): void {
    this.avatarUrl.set(`http://localhost:8080/public/auth/${id}/profile-picture?t=${new Date().getTime()}`);
  }

  onAvatarError(): void {
    this.avatarUrl.set(null);
  }

  logout(): void {
    localStorage.clear();
    this.isLoggedIn.set(false);
    this.username.set('Usuario');
    this.userRole.set('');
    this.userId.set(null);
    this.avatarUrl.set(null);
    this.router.navigate(['/']);
  }

  /**
   * Carga los comentarios y filtra los de 5 estrellas
   */
  loadFiveStarComments(): void {
    this.commentService.getAll().subscribe({
      next: (comments) => {
        // Filtramos los de 5 estrellas (o usamos todos si no hay)
        const filtered = comments.filter((c: any) => c.rating === 5 || c.puntuacion === 5);
        const listToProcess = filtered.length > 0 ? filtered : comments;

        // Mapeamos para adjuntar la URL de la foto de perfil usando el ID del autor
        const processed = listToProcess.map((c: any) => {
          // Buscamos el ID del usuario en cualquiera de las propiedades posibles del DTO
          const userId = c.userId || c.usuarioId || c.idUser || c.user?.id || c.id;
          return {
            ...c,
            authorAvatar: userId ? `http://localhost:8080/public/auth/${userId}/profile-picture?t=${new Date().getTime()}` : null
          };
        });

        this.fiveStarComments.set(processed);
      },
      error: (err) => {
        console.error('Error al cargar comentarios:', err);
      }
    });
  }

  onCommentAvatarError(event: Event): void {
    const target = event.target as HTMLElement;
    target.style.display = 'none';
  }

  // --- Controles del Carrusel ---
  nextComment(): void {
    const total = this.fiveStarComments().length;
    if (total === 0) return;
    this.currentCommentIndex.update(index => (index + 1) % total);
  }

  prevComment(): void {
    const total = this.fiveStarComments().length;
    if (total === 0) return;
    this.currentCommentIndex.update(index => (index - 1 + total) % total);
  }
}