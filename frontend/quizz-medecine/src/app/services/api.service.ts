
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  get<T>(path: string): Observable<T> {
    return this.http.get<T>(
      `${this.base}${path}`,
      { headers: this.adminHeaders() }
    );
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(
      `${this.base}${path}`,
      body,
      { headers: this.adminHeaders() }
    );
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
  return this.http.patch<T>(
    `${this.base}${path}`,
    body ?? {},
    { headers: this.adminHeaders() }
  );
}

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(
      `${this.base}${path}`,
      body,
      { headers: this.adminHeaders() }
    );
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(
      `${this.base}${path}`,
      { headers: this.adminHeaders() }
    );
  }

  private adminHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('adminToken');

    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }
}
