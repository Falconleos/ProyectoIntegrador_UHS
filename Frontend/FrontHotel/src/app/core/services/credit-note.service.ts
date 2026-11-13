import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreditNoteDtoResponse } from '../../models/CreditNote-model';

@Injectable({
  providedIn: 'root'
})
export class CreditNoteService {

  private apiUrl = 'http://localhost:8080/private/credit-notes';

  constructor(private http: HttpClient) {}

  getAllCreditNotes(): Observable<CreditNoteDtoResponse[]> {
    return this.http.get<CreditNoteDtoResponse[]>(this.apiUrl, { withCredentials: true });
  }

  // Método para alternar el estado paid de la nota de crédito
  togglePaidStatus(id: number): Observable<CreditNoteDtoResponse> {
    return this.http.patch<CreditNoteDtoResponse>(`${this.apiUrl}/${id}/toggle-paid`, {}, { withCredentials: true });
  }
}