
import { Component, inject, OnInit, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  NonNullableFormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { CommentService } from '../../../core/services/comment.service';
import {
  CommentDtoRequest,
  CommentDtoResponse
} from '../../../models/Comment-model';

@Component({
  selector: 'app-comment-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './comment-form.component.html',
  styleUrl: './comment-form.component.css'
})
export class CommentFormComponent implements OnInit {

  private fb = inject(NonNullableFormBuilder);
  private commentService = inject(CommentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Estados del componente
  isEditMode = signal(false);
  commentId = signal<number | null>(null);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');

  // Formulario reactivo
  commentForm = this.fb.group({
    content: ['', [
      Validators.required,
      Validators.maxLength(500),
      this.noWhitespaceValidator
    ]],
    rating: [5, [
      Validators.required,
      Validators.min(1),
      Validators.max(5)
    ]]
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam !== null) {
      const id = Number(idParam);

      if (!Number.isSafeInteger(id) || id <= 0) {
        this.errorMessage.set('ID de comentario inválido.');
        this.commentForm.disable();
        return;
      }

      this.isEditMode.set(true);
      this.commentId.set(id);
      this.loadCommentData(id);
    }
  }

  // Evitar comentarios formados solo por espacios
  noWhitespaceValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    const value = control.value as string;

    return value.trim().length === 0
      ? { whitespace: true }
      : null;
  }

  // Cargar datos del comentario para editar
  loadCommentData(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.commentForm.disable();

    this.commentService.getAll().subscribe({
      next: (comments: CommentDtoResponse[]) => {
        const comment = comments.find(c => c.id === id);

        if (comment) {
          this.commentForm.patchValue({
            content: comment.content,
            rating: comment.rating
          });

          this.commentForm.enable();
        } else {
          this.errorMessage.set('Comentario no encontrado.');
        }

        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el comentario.');
        this.loading.set(false);
      }
    });
  }

  // Crear o actualizar comentario
  saveComment(): void {
    if (
      this.commentForm.invalid ||
      this.loading() ||
      this.saving() ||
      this.commentForm.disabled
    ) {
      this.commentForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const formValue = this.commentForm.getRawValue();

    const payload: CommentDtoRequest = {
      content: formValue.content.trim(),
      rating: formValue.rating
    };

    const id = this.commentId();

    if (this.isEditMode()) {
      if (id === null) {
        this.errorMessage.set('ID de comentario inválido.');
        this.saving.set(false);
        return;
      }

      this.commentService.update(id, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/comments']);
        },
        error: () => {
          this.errorMessage.set('No se pudo actualizar el comentario.');
          this.saving.set(false);
        }
      });

    } else {
      this.commentService.create(payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/comment-list']);
        },
        error: () => {
          this.errorMessage.set('No se pudo crear el comentario.');
          this.saving.set(false);
        }
      });
    }
  }

  // Volver al listado
  goBack(): void {
    this.router.navigate(['/comments']);
  }
}