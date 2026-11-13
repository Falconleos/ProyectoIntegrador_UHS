import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';

import {
  RoomAttentionDtoRequest,
  RoomAttentionDtoResponse
} from '../../models/RoomAttention-model';

@Injectable({
  providedIn: 'root'
})
export class RoomAttentionService {

  private http = inject(HttpClient);
  private apiUrl ='http://localhost:8080/private/room-attentions';

  // --- NUEVO: Canal reactivo para notificar cambios ---
  private attentionUpdatedSource = new Subject<void>();
  attentionUpdated$ = this.attentionUpdatedSource.asObservable();

  // Obtiene TODAS las atenciones del sistema
  getAll(): Observable<RoomAttentionDtoResponse[]> {
    return this.http.get<RoomAttentionDtoResponse[]>(this.apiUrl,
      { withCredentials: true });
  }

  // Obtiene todas las atenciones para una reserva específica
  getByBooking(bookingId: number): Observable<RoomAttentionDtoResponse[]> {
    return this.http.get<RoomAttentionDtoResponse[]>(`${this.apiUrl}/booking/${bookingId}`,
      { withCredentials: true });
  }
  
  // Registra un consumo y notifica el cambio
  addAttention(request: RoomAttentionDtoRequest): Observable<RoomAttentionDtoResponse> {
    return this.http.post<RoomAttentionDtoResponse>(this.apiUrl, request,
      { withCredentials: true }).pipe(
        tap(() => this.attentionUpdatedSource.next()) // <-- Notifica actualización
      );
  }

  // Elimina una atención y notifica el cambio
  deleteAttention(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`,
      { withCredentials: true }).pipe(
        tap(() => this.attentionUpdatedSource.next()) // <-- Notifica actualización
      );
  }

  // Marca como entregado y notifica el cambio
  markAsDelivered(id: number): Observable<RoomAttentionDtoResponse> {
    return this.http.patch<RoomAttentionDtoResponse>(`${this.apiUrl}/${id}/deliver`, {},
      { withCredentials: true }).pipe(
        tap(() => this.attentionUpdatedSource.next()) // <-- Notifica actualización
      );
  }
}