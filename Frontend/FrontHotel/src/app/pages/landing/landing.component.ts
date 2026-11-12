import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CommentService } from '../../core/services/comment.service';
import { CommentDtoResponse } from '../../models/Comment-model';
import { UserService } from '../../core/services/user.service';

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
  private userService = inject(UserService);

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
   * Carga los comentarios, filtra los de 5 estrellas y busca el ID del usuario por su username para su foto
   */
  loadFiveStarComments(): void {
    // Llamar al endpoint público que solo trae showable = true
    this.commentService.getVisibleComments().subscribe({
      next: (comments) => {
        // Filtramos los de 5 estrellas (o usamos todos si no hay)
        const filtered = comments.filter((c: any) => c.rating === 5 || c.puntuacion === 5);
        const listToProcess = filtered.length > 0 ? filtered : comments;

        // Consultamos en paralelo el ID de usuario usando el username de cada comentario
        const requests = listToProcess.map((c: any) => {
          if (!c.username) {
            return of({ ...c, authorAvatar: null });
          }
          return this.userService.getUserByUsername(c.username).pipe(
            map((user: any) => {
              return {
                ...c,
                authorAvatar: c.username ? `http://localhost:8080/public/users/username/${c.username}/profile-picture?t=${new Date().getTime()}` : null
              };
            }),
            catchError(() => of({ ...c, authorAvatar: null }))
          );
        });

        forkJoin(requests).subscribe({
          next: (processedComments) => {
            this.fiveStarComments.set(processedComments);
          },
          error: (err) => {
            console.error('Error al procesar avatares de comentarios:', err);
            this.fiveStarComments.set(listToProcess);
          }
        });
      },
      error: (err) => {
        console.error('Error al cargar comentarios visibles:', err);
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

  // --- Manejo de redirección para reservas con validación de sesión ---
  onReservarClick(event: Event): void {
    event.preventDefault();
    const token = localStorage.getItem('authToken');

    if (!token) {
      alert('Debes iniciar sesión en el sistema antes de realizar una reserva.');
      this.router.navigate(['/login']);
    } else {
      this.router.navigate(['/dashboard/availability']); 
    }
  }

}