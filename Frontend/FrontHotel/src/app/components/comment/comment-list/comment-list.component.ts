import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { CommentService } from '../../../core/services/comment.service';
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

  comments = signal<CommentDtoResponse[]>([]);
  loading = signal(false);
  deletingId = signal<number | null>(null);
  errorMessage = signal('');

  isAdmin = signal(false);
  isGuest = signal(false);
  currentUsername = signal('');

  ngOnInit(): void {
    this.checkUserRoles();
    this.loadComments();
  }

  checkUserRoles(): void {
    const storedRoles = localStorage.getItem('role') || '';
    this.isAdmin.set(storedRoles.includes('ADMIN'));
    this.isGuest.set(storedRoles.includes('GUEST'));
    this.currentUsername.set(localStorage.getItem('username') || '');
  }

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

  getUserAvatarUrl(userId: number): string {
    return `http://localhost:8080/private/user/${userId}/profile-picture`;
  }

  canCreate(): boolean {
    return this.isAdmin() || this.isGuest();
  }

  canEdit(comment: CommentDtoResponse): boolean {
    return this.isAdmin() || (this.isGuest() && comment.username === this.currentUsername());
  }

  canDelete(): boolean {
    return this.isAdmin();
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