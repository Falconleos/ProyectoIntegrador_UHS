
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CommentService } from '../../../core/services/comment.service';
import { CommentDtoResponse } from '../../../models/Comment-model';

@Component({
  selector: 'app-comment-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './comment-list.component.html',
  styleUrl: './comment-list.component.css'
})
export class CommentListComponent implements OnInit {

  private commentService = inject(CommentService);

  // Lista de comentarios
  comments = signal<CommentDtoResponse[]>([]);

  // Estados del componente
  loading = signal(false);
  deletingId = signal<number | null>(null);
  errorMessage = signal('');

  // Roles del usuario autenticado
  isAdmin = signal(false);
  isGuest = signal(false);

  // Usuario autenticado
  currentUsername = signal('');

  ngOnInit(): void {
    this.checkUserRoles();
    this.loadComments();
  }

  // Obtener los roles del usuario
  checkUserRoles(): void {
    const storedRoles = localStorage.getItem('role') || '';

    this.isAdmin.set(storedRoles.includes('ADMIN'));
    this.isGuest.set(storedRoles.includes('GUEST'));

    this.currentUsername.set(
      localStorage.getItem('username') || ''
    );
  }

  // Obtener comentarios desde el backend
  loadComments(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.commentService.getAll().subscribe({
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

  // Comprobar si puede crear comentarios
  canCreate(): boolean {
    return this.isAdmin() || this.isGuest();
  }

  // Comprobar si puede editar un comentario
  canEdit(comment: CommentDtoResponse): boolean {
    return this.isAdmin() ||
      (this.isGuest() &&
       comment.username === this.currentUsername());
  }

  // Comprobar si puede eliminar comentarios
  canDelete(): boolean {
    return this.isAdmin();
  }

  // Eliminar comentario
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

