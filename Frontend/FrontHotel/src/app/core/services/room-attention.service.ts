
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  //Obtiene todas las atenciones registradas para una reserva
  getByBooking(bookingId: number): Observable<RoomAttentionDtoResponse[]> {
    return this.http.get<RoomAttentionDtoResponse[]>(`${this.apiUrl}/booking/${bookingId}`,
      { withCredentials: true });
  }
  
  //Registra un consumo para una reserva
  addAttention(request: RoomAttentionDtoRequest): Observable<RoomAttentionDtoResponse> {
    return this.http.post<RoomAttentionDtoResponse>(this.apiUrl, request,
      { withCredentials: true });
  }

  //Elimina una atención por su identificador de atencion
  deleteAttention(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`,
      { withCredentials: true });
  }

  //Marcar una atención como entregada
  markAsDelivered(id: number): Observable<RoomAttentionDtoResponse> {
    return this.http.patch<RoomAttentionDtoResponse>(`${this.apiUrl}/${id}/deliver`,{},
      { withCredentials: true });
  }
}
