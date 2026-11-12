import { Injectable, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { UserLoginDtoRequest, AuthTokenResponse } from '../../models/Auth-model';
import { UserDtoRequest } from '../../models/User-model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/public/auth';

  // --- SEÑALES DE ESTADO ---
  public token = signal<string | null>(localStorage.getItem('authToken'));
  public roles = signal<string[]>(this.getInitialRoles());

  // --- SEÑALES COMPUTADAS (Soportan con o sin prefijo ROLE_) ---
  public estaLogueado = computed(() => !!this.token());
  
  public isAdmin = computed(() => 
    this.roles().some(r => {
      const upper = r.toUpperCase();
      return upper === 'ADMIN' || upper === 'ROLE_ADMIN';
    })
  );
  
  public isGuest = computed(() => 
    this.roles().some(r => {
      const upper = r.toUpperCase();
      return upper === 'GUEST' || upper === 'ROLE_GUEST';
    })
  );

  constructor(private http: HttpClient) {
    effect(() => {
      console.log('--- Estado de Autenticación Actualizado ---');
      console.log('¿Está logueado?:', this.estaLogueado());
      console.log('¿Es Admin?:', this.isAdmin());
      console.log('¿Es Guest?:', this.isGuest());
    });
  }

  private getInitialRoles(): string[] {
    try {
      const stored = localStorage.getItem('role');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  public updateSession(token: string, roles: string[]): void {
    localStorage.setItem('authToken', token);
    localStorage.setItem('role', JSON.stringify(roles));
    this.token.set(token);
    this.roles.set(roles);
  }

  public clearSession(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('name');
    localStorage.removeItem('surname');
    this.token.set(null);
    this.roles.set([]);
  }

  login(credentials: UserLoginDtoRequest): Observable<AuthTokenResponse> {
    return this.http.post<AuthTokenResponse>(`${this.apiUrl}/login`, credentials, { withCredentials: true }).pipe(
      tap(response => {
        if (response && response.token) {
          try {
            const payloadBase64 = response.token.split('.')[1];
            const decodedToken = JSON.parse(atob(payloadBase64));
            const roles = decodedToken.roles || [];
            this.updateSession(response.token, roles);
          } catch (e) {
            console.error('Error procesando token en login:', e);
          }
        }
      })
    );
  }


  register(request: any): Observable<AuthTokenResponse> {
    const formData = new FormData();

    Object.keys(request).forEach(key => {
      const value = request[key];
      if (value !== null && value !== undefined && value !== '') {
        if (key === 'profilePictureFile' && value instanceof File) {
          formData.append(key, value, value.name);
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    return this.http.post<AuthTokenResponse>(`${this.apiUrl}/register`, formData, { withCredentials: true }).pipe(
      tap(response => {
        if (response && response.token) {
          try {
            const payloadBase64 = response.token.split('.')[1];
            const decodedToken = JSON.parse(atob(payloadBase64));
            const roles = decodedToken.roles || [];
            this.updateSession(response.token, roles);
          } catch (e) {
            console.error('Error procesando token en registro:', e);
          }
        }
      })
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/logout`, {}, { withCredentials: true }).pipe(
      tap(() => {
        this.clearSession();
      })
    );
  }

  refreshToken(): Observable<AuthTokenResponse> {
    return this.http.post<AuthTokenResponse>(`${this.apiUrl}/refresh`, {}, { withCredentials: true }).pipe(
      tap(response => {
        if (response && response.token) {
          try {
            const payloadBase64 = response.token.split('.')[1];
            const decodedToken = JSON.parse(atob(payloadBase64));
            const roles = decodedToken.roles || [];
            this.updateSession(response.token, roles);
          } catch (e) {
            console.error('Error procesando token en refresh:', e);
          }
        }
      })
    );
  }

  getProfilePictureUrl(userId: number): string {
    return `${this.apiUrl}/${userId}/profile-picture`;
  }

  getUserIdByUsername(username: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/by-username/${username}`);
  }
}