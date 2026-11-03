import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  RoomTypeDTORequest,
  RoomTypeDTOResponse
} from '../../models/RoomType-model';

@Injectable({
  providedIn: 'root'
})
export class RoomTypeService {

  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:8080/private/room-type';

  // Obtener todos los tipos de habitación
  getAll(): Observable<RoomTypeDTOResponse[]> {
    return this.http.get<RoomTypeDTOResponse[]>(this.apiUrl,
      { withCredentials: true });
  }

  // Obtener un tipo de habitación por ID
  getById(id: number): Observable<RoomTypeDTOResponse> {
    return this.http.get<RoomTypeDTOResponse>(`${this.apiUrl}/${id}`,
      { withCredentials: true });
  }

  // Crear un tipo de habitación
  createRoomType(request: RoomTypeDTORequest): Observable<RoomTypeDTOResponse> {
    return this.http.post<RoomTypeDTOResponse>(this.apiUrl,request,
      { withCredentials: true });
  }

  // Actualizar un tipo de habitación
  updateRoomType(id: number, request: RoomTypeDTORequest): Observable<RoomTypeDTOResponse> {
    return this.http.put<RoomTypeDTOResponse>(`${this.apiUrl}/${id}`,request,
      { withCredentials: true });
  }

  // Eliminar un tipo de habitación
  deleteRoomType(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`,
      { withCredentials: true });
  }

}
