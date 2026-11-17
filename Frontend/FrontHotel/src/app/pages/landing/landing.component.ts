import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommentService } from '../../core/services/comment.service';
import { UserService } from '../../core/services/user.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
    selector: 'app-landing',
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

  // --- Estado del Menú Móvil (Hamburguesa) ---
  mobileMenuOpen = false;

  // --- Estado del Carrusel de Comentarios ---
  fiveStarComments = signal<any[]>([]);
  currentCommentIndex = signal<number>(0);

  ngOnInit(): void {
    this.checkAuthStatus();
    this.loadVisibleComments();
  }

  // Métodos para controlar el menú lateral en dispositivos móviles
  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  // Verifica el estado de autenticación del usuario leyendo el almacenamiento local y decodificando el JWT
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

  // Solicita el Blob de la foto de perfil del usuario logueado en el Navbar mediante su ID
  loadProfilePictureById(id: number): void {
    this.userService.getProfilePicture(id).subscribe({
      next: (blob) => {
        const objectURL = URL.createObjectURL(blob);
        this.avatarUrl.set(objectURL);
      },
      error: () => {
        this.avatarUrl.set(null);
      }
    });
  }

  // Restablece la URL del avatar principal si ocurre un error de carga
  onAvatarError(): void {
    this.avatarUrl.set(null);
  }

  // Limpia la sesión del usuario y redirige al inicio
  logout(): void {
    localStorage.clear();
    this.isLoggedIn.set(false);
    this.username.set('Usuario');
    this.userRole.set('');
    this.userId.set(null);
    this.avatarUrl.set(null);
    this.router.navigate(['/']);
  }

  // Carga los comentarios visibles y descarga la foto de perfil de cada autor como Blob de forma asíncrona
  loadVisibleComments(): void {
    this.commentService.getVisibleComments().subscribe({
      next: (comments) => {
        const commentList = Array.isArray(comments) ? comments : [];

        if (commentList.length === 0) {
          this.fiveStarComments.set([]);
          return;
        }

        const commentsWithAvatarObservables = commentList.map((c: any) => {
          const authorUsername = c.username || c.nombreUsuario;
          
          if (!authorUsername) {
            return of({ ...c, authorAvatar: null });
          }

          return this.userService.getProfilePictureByUsername(authorUsername).pipe(
            map((blob: Blob) => {
              const objectURL = URL.createObjectURL(blob);
              return { ...c, authorAvatar: objectURL };
            }),
            catchError(() => {
              return of({ ...c, authorAvatar: null });
            })
          );
        });

        forkJoin(commentsWithAvatarObservables).subscribe({
          next: (processedComments) => {
            this.fiveStarComments.set(processedComments);
          },
          error: (err) => {
            console.error('Error al procesar avatares de comentarios:', err);
            this.fiveStarComments.set(commentList);
          }
        });
      },
      error: (err) => {
        console.error('Error al cargar comentarios visibles:', err);
      }
    });
  }

  // Oculta la imagen del avatar del comentario si falla al cargar (ej. si el usuario no tiene foto)
  onCommentAvatarError(event: Event): void {
    const target = event.target as HTMLElement;
    target.style.display = 'none';
  }

  // Avanza al siguiente comentario en el carrusel
  nextComment(): void {
    const total = this.fiveStarComments().length;
    if (total === 0) return;
    this.currentCommentIndex.update(index => (index + 1) % total);
  }

  // Retrocede al comentario anterior en el carrusel
  prevComment(): void {
    const total = this.fiveStarComments().length;
    if (total === 0) return;
    this.currentCommentIndex.update(index => (index - 1 + total) % total);
  }

  // Valida la sesión activa antes de permitir el acceso al flujo de reservas
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