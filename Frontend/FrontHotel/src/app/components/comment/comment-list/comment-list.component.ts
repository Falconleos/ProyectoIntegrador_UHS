import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { CommentService } from '../../../core/services/comment.service';
import { AuthService } from '../../../core/services/auth.service';
import { CommentDtoResponse } from '../../../models/Comment-model';

@Component({
  selector: 'app-comment-list',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './comment-list.component.html',
  styleUrl: './comment-list.component.css'
})
export class CommentListComponent implements OnInit {

  private commentService = inject(CommentService);
  private authService = inject(AuthService);

  comments = signal<CommentDtoResponse[]>([]);
  loading = signal(false);
  deletingId = signal<number | null>(null);
  togglingId = signal<number | null>(null);
  errorMessage = signal('');

  // Sincronizamos roles usando las señales y computed del AuthService (o lógica local robusta)
  isAdminOrReceptionist = signal(false);
  isGuest = signal(false);
  currentUsername = signal('');

  ngOnInit(): void {
    this.checkUserRoles();
    this.loadCommentsBasedOnRole();
  }

  checkUserRoles(): void {
    const storedRoles = localStorage.getItem('role') || '';
    const upperRoles = storedRoles.toUpperCase();
    
    const adminOrReceps = upperRoles.includes('ADMIN') || upperRoles.includes('RECEPCIONIST');
    const guest = upperRoles.includes('GUEST');

    this.isAdminOrReceptionist.set(adminOrReceps);
    this.isGuest.set(guest);
    this.currentUsername.set(localStorage.getItem('username') || '');
  }

  loadCommentsBasedOnRole(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    let request$;

    if (this.isAdminOrReceptionist()) {
      // Admin o Recepcionista ven todo el listado para poder moderar
      request$ = this.commentService.getAll();
    } else if (this.isGuest()) {
      // Invitado ve únicamente sus propios comentarios
      request$ = this.commentService.getMyComments();
    } else {
      // Visitante general (por si acaso) ve solo los visibles
      request$ = this.commentService.getVisibleComments();
    }

    request$.subscribe({
      next: (data) => {
        this.comments.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los comentarios.');
        this.loading.set(false);
      }
    });
  }

  // Método para que el admin pueda cambiar el estado showable desde el checkbox de la card
  onToggleVisibility(comment: CommentDtoResponse): void {
    if (!this.isAdminOrReceptionist() || this.togglingId() !== null) return;

    this.togglingId.set(comment.id);
    this.commentService.toggleVisibility(comment.id).subscribe({
      next: (updatedComment) => {
        // Actualizamos el estado localmente en la señal de la lista
        this.comments.update(list => 
          list.map(c => c.id === updatedComment.id ? updatedComment : c)
        );
        this.togglingId.set(null);
      },
      error: () => {
        this.errorMessage.set('No se pudo cambiar la visibilidad del comentario.');
        this.togglingId.set(null);
      }
    });
  }

  getUserAvatarUrl(userId: number): string {
    return `http://localhost:8080/private/user/${userId}/profile-picture`;
  }

  canCreate(): boolean {
    return true; // Permitimos a los usuarios logueados crear comentarios
  }

  canEdit(comment: CommentDtoResponse): boolean {
    return this.isAdminOrReceptionist() || (this.isGuest() && comment.username === this.currentUsername());
  }

  canDelete(): boolean {
    return this.isAdminOrReceptionist();
  }

  deleteComment(id: number): void {
    if (!this.canDelete() || this.deletingId() !== null) {
      return;
    }

    this.deletingId.set(id);
    this.errorMessage.set('');

    this.commentService.deleteComment(id).subscribe({
      next: () => {
        this.comments.update(comments => comments.filter(comment => comment.id !== id));
        this.deletingId.set(null);
      },
      error: () => {
        this.errorMessage.set('No se pudo eliminar el comentario.');
        this.deletingId.set(null);
      }
    });
  }
}