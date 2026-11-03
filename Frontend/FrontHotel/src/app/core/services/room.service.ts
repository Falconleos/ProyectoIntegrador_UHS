
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { RoomDtoResponse } from '../../models/Room-model';
import { RoomDTORequest } from '../../models/Room-model';
import { RoomUpdateDTORequest } from '../../models/Room-model';

@Injectable({
  providedIn: 'root'
})
export class RoomService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:8080/private/room';

  // Obtener todas las habitaciones
  getAll(): Observable<RoomDtoResponse[]> {
    return this.http.get<RoomDtoResponse[]>(
      this.apiUrl,
      { withCredentials: true }
    );
  }

  // Obtener una habitación por ID
  getById(id: number): Observable<RoomDtoResponse> {
    return this.http.get<RoomDtoResponse>(
      `${this.apiUrl}/${id}`,
      { withCredentials: true }
    );
  }

  // Obtener habitaciones disponibles
  getAvailableRooms(): Observable<RoomDtoResponse[]> {
    return this.http.get<RoomDtoResponse[]>(
      `${this.apiUrl}/available`,
      { withCredentials: true }
    );
  }

  // Crear una habitación con imágenes opcionales
  createRoom(
    request: RoomDTORequest,
    images: File[] = []
  ): Observable<RoomDtoResponse> {

    const formData = new FormData();

    formData.append('number', request.number.toString());
    formData.append('roomTypeId', request.roomTypeId.toString());
    formData.append('state', request.state ?? 'AVAILABLE');

    images.forEach(file => {
      formData.append('images', file, file.name);
    });

    return this.http.post<RoomDtoResponse>(
      this.apiUrl,
      formData,
      { withCredentials: true }
    );
  }

  // Actualizar una habitación
  updateRoom(
    id: number,
    request: RoomUpdateDTORequest
  ): Observable<RoomDtoResponse> {

    return this.http.put<RoomDtoResponse>(
      `${this.apiUrl}/${id}`,
      request,
      { withCredentials: true }
    );
  }

  // Eliminar una habitación
  deleteRoom(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`,
      { withCredentials: true }
    );
  }

  // Cambiar una habitación a mantenimiento
  putInMaintenance(id: number): Observable<RoomDtoResponse> {
    return this.http.patch<RoomDtoResponse>(
      `${this.apiUrl}/${id}/maintenance`,
      {},
      { withCredentials: true }
    );
  }

  // Obtener cantidad total de habitaciones
  getRoomCount(): Observable<number> {
    return this.http.get<number>(
      `${this.apiUrl}/count`,
      { withCredentials: true }
    );
  }

  // Agregar imágenes a una habitación existente
  addImages(
    id: number,
    images: File[]
  ): Observable<RoomDtoResponse> {

    const formData = new FormData();

    images.forEach(file => {
      formData.append('images', file, file.name);
    });

    return this.http.post<RoomDtoResponse>(
      `${this.apiUrl}/${id}/images`,
      formData,
      { withCredentials: true }
    );
  }

  // Obtener una imagen específica
  getRoomImage(
    id: number,
    index: number
  ): Observable<Blob> {

    return this.http.get(
      `${this.apiUrl}/${id}/images/${index}`,
      {
        responseType: 'blob',
        withCredentials: true
      }
    );
  }
}
