import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AccountDTOResponse } from '../../models/Account-model';
import { PaymentDTORequest, PaymentDTOResponse } from '../../models/Payment-model';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private apiUrl = 'http://localhost:8080/private/accounts';

  constructor(private http: HttpClient) {}

  // Función privada para generar los headers con el token JWT actual
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getAllAccounts(): Observable<AccountDTOResponse[]> {
    return this.http.get<AccountDTOResponse[]>(this.apiUrl, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  getAccountById(id: number): Observable<AccountDTOResponse> {
    return this.http.get<AccountDTOResponse>(`${this.apiUrl}/${id}`, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  getAccountByBookingId(bookingId: number): Observable<AccountDTOResponse> {
    return this.http.get<AccountDTOResponse>(`${this.apiUrl}/booking/${bookingId}`, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  // Método alias para resolver la llamada desde AccountDetailComponent
  getAccountByCheckInId(checkInId: number): Observable<AccountDTOResponse> {
    return this.getAccountByBookingId(checkInId);
  }

  updateAdjustmentPercentage(bookingId: number, adjustmentPercentage: number): Observable<AccountDTOResponse> {
    return this.http.put<AccountDTOResponse>(
      `${this.apiUrl}/booking/${bookingId}/adjustment`, 
      { adjustmentPercentage }, 
      { 
        headers: this.getHeaders(),
        withCredentials: true 
      }
    );
  }

  addPayment(request: PaymentDTORequest): Observable<PaymentDTOResponse> {
    return this.http.post<PaymentDTOResponse>(`${this.apiUrl}/payments`, request, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }

  getPaymentsByBookingId(bookingId: number): Observable<PaymentDTOResponse[]> {
    return this.http.get<PaymentDTOResponse[]>(`${this.apiUrl}/bookings/${bookingId}/payments`, { 
      headers: this.getHeaders(),
      withCredentials: true 
    });
  }
}