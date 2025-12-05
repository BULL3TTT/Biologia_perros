import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

// API URL - Configurable via environment
const API_URL = (window as any).__API_URL__ || '/api';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

  private getAdminHeaders(): HttpHeaders {
    const token = this.authService.getAdminToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

  generateToken(userData: any): Observable<any> {
    return this.http.post(`${API_URL}/generate-token`, userData);
  }

  submitAnswers(answers: any): Observable<any> {
    // Ensure all keys are strings by creating a new object with explicit string keys
    const normalizedAnswers: { [key: string]: string } = {};
    Object.keys(answers).forEach(key => {
      normalizedAnswers[String(key)] = String(answers[key]);
    });
    
    // Force JSON serialization to ensure keys are strings
    // This creates a fresh object with string keys only
    const payload = { answers: normalizedAnswers };
    
    return this.http.post(`${API_URL}/submit-answers`, payload, {
      headers: this.getHeaders()
    });
  }

  adminLogin(credentials: any): Observable<any> {
    return this.http.post(`${API_URL}/admin/login`, credentials);
  }

  getResults(): Observable<any> {
    const headers = this.getAdminHeaders();
    return this.http.get(`${API_URL}/admin/results`, {
      headers: headers
    });
  }

  getTopScores(): Observable<any> {
    const headers = this.getAdminHeaders();
    return this.http.get(`${API_URL}/admin/top-scores`, {
      headers: headers
    });
  }

  getStats(): Observable<any> {
    const headers = this.getAdminHeaders();
    return this.http.get(`${API_URL}/admin/stats`, {
      headers: headers
    });
  }
}

