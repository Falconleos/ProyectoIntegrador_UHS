
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  CommentDtoRequest,
  CommentDtoResponse
} from '../../models/Comment-model';

@Injectable({
  providedIn: 'root'
})
export class CommentService {

  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:8080/public/comments';

  // Obtener comentarios según el rol del usuario (todos para admin y recep y los propios para guest)
  getAll(): Observable<CommentDtoResponse[]> {
    return this.http.get<CommentDtoResponse[]>( this.apiUrl,
      { withCredentials: true });
  }

  // Obtener los comentarios del usuario autenticado
  getMyComments(): Observable<CommentDtoResponse[]> {
    return this.http.get<CommentDtoResponse[]>( `${this.apiUrl}/my-comments`,
      { withCredentials: true });
  }

  // Crear un comentario
  create(comment: CommentDtoRequest): Observable<CommentDtoResponse> {
    return this.http.post<CommentDtoResponse>(this.apiUrl, comment,
      { withCredentials: true });
  }

  // Actualizar un comentario existente
  update( id: number, comment: CommentDtoRequest): Observable<CommentDtoResponse> {
    return this.http.put<CommentDtoResponse>(`${this.apiUrl}/${id}`, comment,
      { withCredentials: true });
  }

  // Eliminar un comentario
  deleteComment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`,
      { withCredentials: true });
  }
}