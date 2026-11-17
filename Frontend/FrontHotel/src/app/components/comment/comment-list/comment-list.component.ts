import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { CommentService } from '../../../core/services/comment.service';
import { CommentDtoResponse } from '../../../models/Comment-model';

@Component({
    selector: 'app-comment-list',
    imports: [RouterLink, CommonModule],
    templateUrl: './comment-list.component.html',
    styleUrl: './comment-list.component.css'
})
export class CommentListComponent implements OnInit {

  private commentService = inject(CommentService);

  comments = signal<CommentDtoResponse[]>([]);
  loading = signal(false);
  deletingId = signal<number | null>(null);
  togglingId = signal<number | null>(null);
  errorMessage = signal('');

  isAdminOrReceptionist = signal(false);
  isGuest = signal(false);
  currentUsername = signal('');

  // Diccionario local para llevar el control de qué usernames fallaron al cargar su foto (ej. no tienen imagen)
  avatarErrorMap = signal<{ [username: string]: boolean }>({});

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
    this.avatarErrorMap.set({});

    let request$;

    if (this.isAdminOrReceptionist()) {
      request$ = this.commentService.getAll();
    } else if (this.isGuest()) {
      request$ = this.commentService.getMyComments();
    } else {
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

  onToggleVisibility(comment: CommentDtoResponse): void {
    if (!this.isAdminOrReceptionist() || this.togglingId() !== null) return;

    this.togglingId.set(comment.id);
    this.commentService.toggleVisibility(comment.id).subscribe({
      next: (updatedComment) => {
        this.comments.update(list => 
          list.map(c => c.id === updatedComment.id ? { ...c, ...updatedComment } : c)
        );
        this.togglingId.set(null);
      },
      error: () => {
        this.errorMessage.set('No se pudo cambiar la visibilidad del comentario.');
        this.togglingId.set(null);
      }
    });
  }

  // Genera la URL pública directa basada en el username expuesto en tu PublicController
  getUserAvatarUrl(username: string): string {
    return `http://localhost:8080/public/users/username/${username}/profile-picture?t=${new Date().getTime()}`;
  }

  // Controla si la imagen del avatar falló al cargar (ej. 404 Not Found porque no tiene foto)
  onAvatarError(username: string): void {
    this.avatarErrorMap.update(map => ({ ...map, [username]: true }));
  }

  hasAvatarError(username: string): boolean {
    return !!this.avatarErrorMap()[username];
  }

  canCreate(): boolean {
    return true;
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