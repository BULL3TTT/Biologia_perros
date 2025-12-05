import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'auth_token';
  private adminTokenKey = 'admin_token';
  private userDataKey = 'user_data';
  private scoreKey = 'user_score';
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  
  private isAdminAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasAdminToken());
  public isAdminAuthenticated$ = this.isAdminAuthenticatedSubject.asObservable();

  constructor(private router: Router) {}

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.isAuthenticatedSubject.next(true);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setAdminToken(token: string): void {
    localStorage.setItem(this.adminTokenKey, token);
    this.isAdminAuthenticatedSubject.next(true);
  }

  getAdminToken(): string | null {
    return localStorage.getItem(this.adminTokenKey);
  }

  setUserData(data: any): void {
    localStorage.setItem(this.userDataKey, JSON.stringify(data));
  }

  getUserData(): any {
    const data = localStorage.getItem(this.userDataKey);
    return data ? JSON.parse(data) : null;
  }

  setScore(score: any): void {
    localStorage.setItem(this.scoreKey, JSON.stringify(score));
  }

  getScore(): any {
    const data = localStorage.getItem(this.scoreKey);
    return data ? JSON.parse(data) : null;
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  hasAdminToken(): boolean {
    return !!this.getAdminToken();
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userDataKey);
    localStorage.removeItem(this.scoreKey);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/']);
  }

  adminLogout(): void {
    localStorage.removeItem(this.adminTokenKey);
    this.isAdminAuthenticatedSubject.next(false);
    this.router.navigate(['/admin/login']);
  }

  clearAll(): void {
    localStorage.clear();
    this.isAuthenticatedSubject.next(false);
    this.isAdminAuthenticatedSubject.next(false);
  }
}

