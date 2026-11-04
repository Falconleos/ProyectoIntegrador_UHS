
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  EmployeeDtoResponse,
  EmployeeDtoRequest,
  EmployeeCreateUnifiedDTO,
  ShiftType
} from '../../models/Employee-model';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {

  private http = inject(HttpClient);

  private readonly apiUrl ='http://localhost:8080/private/employee';

  // Obtener todos los empleados
  getAll(): Observable<EmployeeDtoResponse[]> {
    return this.http.get<EmployeeDtoResponse[]>(this.apiUrl,
      { withCredentials: true });
  }

  // Obtener un empleado por ID
  getById(id: number): Observable<EmployeeDtoResponse> {
    return this.http.get<EmployeeDtoResponse>(`${this.apiUrl}/${id}`,
      { withCredentials: true });
  }

  // Crear un empleado con sus datos de usuario
  create( employee: EmployeeCreateUnifiedDTO): Observable<EmployeeDtoResponse> {

    const formData = new FormData();

    Object.entries(employee).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, String(value));
        }
      }
    });

    return this.http.post<EmployeeDtoResponse>(this.apiUrl, formData,
      { withCredentials: true });
  }

  // Actualizar los datos laborales de un empleado
  update( id: number, employee: EmployeeDtoRequest): Observable<EmployeeDtoResponse> {
    return this.http.put<EmployeeDtoResponse>(`${this.apiUrl}/${id}`, employee,
      { withCredentials: true });
  }

  // Cambiar el turno de un empleado
  updateShift( id: number, nuevoShift: ShiftType): Observable<EmployeeDtoResponse> {
    return this.http.patch<EmployeeDtoResponse>(`${this.apiUrl}/${id}/shift`, null,
      {
        params: { nuevoShift },
        withCredentials: true
      });
  }

  // Eliminar el perfil laboral de un empleado
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`,
      { withCredentials: true });
  }
}
