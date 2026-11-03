

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  ItemDtoRequest,
  ItemDtoResponse
} from '../../models/Item-model';

@Injectable({
  providedIn: 'root'
})
export class ItemService {

  private http = inject(HttpClient);

  private apiUrl ='http://localhost:8080/private/items';

  //Obtiene todos los productos y servicios registrados.
  getAll(): Observable<ItemDtoResponse[]> {
    return this.http.get<ItemDtoResponse[]>(this.apiUrl,
      { withCredentials: true });
  }

  //Obtiene un producto o servicio específico
  getById(id: number): Observable<ItemDtoResponse> {
    return this.http.get<ItemDtoResponse>(`${this.apiUrl}/${id}`,
      { withCredentials: true });
  }

  //Crear items
  createItem( request: ItemDtoRequest, image?: File): Observable<ItemDtoResponse> {

    const formData = new FormData(); //Crea contenedor para enviar datos mediante multipart/form-data, ya que tenemos datos binarios(imagen) y datos en formato json

    formData.append('item', new Blob(
        [JSON.stringify(request)],
        { type: 'application/json' }
      )
    );

    if (image) { //Agrega la imagen solamente si se proporcionó una
      formData.append('file', image);
    }

    return this.http.post<ItemDtoResponse>(this.apiUrl, formData,
      { withCredentials: true });
  }


//Actualizar item (similar a crear item pero necesita un identificador)
  updateItem(id: number, request: ItemDtoRequest, image?: File): Observable<ItemDtoResponse> {

    const formData = new FormData();

    formData.append('item', new Blob(
        [JSON.stringify(request)],
        { type: 'application/json' }
      )
    );

    if (image) {
      formData.append('file', image);
    }

    return this.http.put<ItemDtoResponse>(`${this.apiUrl}/${id}`, formData,
      { withCredentials: true });
  }

  //Elimina un producto o servicio mediante su identificador
  deleteItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`,
      { withCredentials: true });
  }

  //Obtiene la imagen de un producto
  getItemImage(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/image`, {
        responseType: 'blob',
        withCredentials: true
      });
  }
}
