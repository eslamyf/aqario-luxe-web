// ─────────────────────────────────────────────────────────────────────────────
// AQARIO LUXE — Auth Service (Fully Implemented by Islam)
// Includes: Real LocalStorage DB, OTP Flow, and Team Interface Compatibility
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SocketService } from '../services/socket.service';

export type UserRole = 'buyer' | 'owner' | 'agent' | 'admin';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  photo?: string;
  token?: string;
  password?: string;
  isVerified?: boolean;
  otp?: string;
  resetToken?: string;
}

export interface AuthModalRequest {
  tab: 'login' | 'register';
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  // ── Storage Keys (Agreed upon with the team) ─────────────────────────────
  private readonly TOKEN_KEY = 'aqario_token';
  private readonly USER_KEY = 'aqario_user';
  private readonly DB_KEY = 'aqario_all_users';

  // ── Global User State ────────────────────────────────────────────────────
  private _currentUser$ = new BehaviorSubject<User | null>(null);
  currentUser$ = this._currentUser$.asObservable();

  get currentUser(): User | null {
    return this._currentUser$.value;
  }

  setCurrentUser(user: User | null): void {
    this._currentUser$.next(user);
  }

  // Team Compatibility: Observable for auth status
  private readonly _isAuthenticated$ = new BehaviorSubject<boolean>(!!localStorage.getItem(this.TOKEN_KEY));
  readonly isAuthenticated$ = this._isAuthenticated$.asObservable();

  // ─── Modal State ──────────────────────────────────────────────────────────
  private modalOpen$ = new BehaviorSubject<boolean>(false);
  readonly isModalOpen$ = this.modalOpen$.asObservable();

  private modalTab$ = new BehaviorSubject<'login' | 'register'>('login');
  readonly currentModalTab$ = this.modalTab$.asObservable();

  constructor() {
    this.restoreSession();
  }

  private restoreSession(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Migrate Token
      const oldToken = localStorage.getItem('luxe_token');
      if (oldToken && !localStorage.getItem(this.TOKEN_KEY)) {
        localStorage.setItem(this.TOKEN_KEY, oldToken);
        localStorage.removeItem('luxe_token');
      }
      // Migrate User
      const oldUser = localStorage.getItem('luxe_user');
      if (oldUser && !localStorage.getItem(this.USER_KEY)) {
        localStorage.setItem(this.USER_KEY, oldUser);
        localStorage.removeItem('luxe_user');
      }
      // Migrate Favorites
      const oldFavs = localStorage.getItem('luxe_favorites');
      if (oldFavs && !localStorage.getItem('aqario_favorites')) {
        localStorage.setItem('aqario_favorites', oldFavs);
        localStorage.removeItem('luxe_favorites');
      }
      // Migrate Theme
      const oldTheme = localStorage.getItem('luxe_theme');
      if (oldTheme && !localStorage.getItem('aqario_theme')) {
        localStorage.setItem('aqario_theme', oldTheme);
        localStorage.removeItem('luxe_theme');
      }
      // Migrate Language
      const oldLang = localStorage.getItem('luxe_lang');
      if (oldLang && !localStorage.getItem('aqario_lang')) {
        localStorage.setItem('aqario_lang', oldLang);
        localStorage.removeItem('luxe_lang');
      }
    }

    const token = localStorage.getItem(this.TOKEN_KEY);
    const userJson = localStorage.getItem(this.USER_KEY);

    if (token && userJson) {
      try {
        const user: User = JSON.parse(userJson);
        this._currentUser$.next(user);
        this._isAuthenticated$.next(true);
        this.socketService.connect(token);
      } catch {
        this.clearStorage();
      }
    }
  }

  // ── Team Expected Interfaces (Task 05 constraints) ───────────────────────

  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY) && !!this._currentUser$.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getCurrentUser<T = unknown>(): T | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  openModal(tab: 'login' | 'register' = 'login'): void {
    this.modalTab$.next(tab);
    this.modalOpen$.next(true);
  }

  closeModal(): void {
    this.modalOpen$.next(false);
  }

  isDemoMode(): boolean { return false; } // Disabled demo mode for real DB logic

  // ── Real Backend Integration (HttpClient) ────────────────────────────────
  private apiUrl = `${environment.apiUrl}/auth`;
  private http = inject(HttpClient);
  private socketService = inject(SocketService);

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { email, password }, { withCredentials: true }).pipe(
      tap((res) => {
        if (res.status === 'success' && res.token && res.data?.user) {
          this.handleAuthSuccess(res.token, res.data.user);
        }
      })
    );
  }

  loginWithGoogle(idToken: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/google-login`,
      { idToken },
      { withCredentials: true }
    ).pipe(
      tap((res) => {
        if (res.status === 'success' && res.data?.accessToken && res.data?.user) {
          this.handleAuthSuccess(res.data.accessToken, res.data.user);
        }
      })
    );
  }

  register(name: string, email: string, password: string): Observable<any> {
    // The backend handles the default role assignment securely
    return this.http.post<any>(`${this.apiUrl}/register`, { name, email, password }, { withCredentials: true });
  }

  verifyAccount(email: string, otp: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/verify-otp`, { email, otp }, { withCredentials: true });
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, { email }, { withCredentials: true });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/reset-password/${token}`, { password: newPassword }, { withCredentials: true });
  }

  logout(): void {
    // 1. Synchronously wipe local session state immediately
    this.clearSession();
    this.socketService.disconnect();
    this._currentUser$.next(null);
    this._isAuthenticated$.next(false);

    // 2. Asynchronously notify the backend to clean up cookies/sessions (fire-and-forget)
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).subscribe({
      next: () => {
        console.log('[Auth] Backend logout successful');
      },
      error: (err) => {
        console.warn('[Auth] Backend logout failed (safely ignored):', err?.message || err);
      }
    });
  }

  // ── Private Helpers ──────────────────────────────────────────────────────
  private handleAuthSuccess(token: string, user: User): User {
    const { password, ...safeUser } = user; // Strip password for security

    // Normalize role to lowercase to ensure type safety
    const normalizedUser = {
      ...safeUser,
      role: (safeUser.role?.toLowerCase() || 'buyer') as UserRole,
      token,
    };
    const fullUser: User = normalizedUser;

    localStorage.clear();
    sessionStorage.clear();

    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(fullUser));

    this._currentUser$.next(fullUser);
    this._isAuthenticated$.next(true); // Notify the team's observable
    this.socketService.connect(token);

    return fullUser;
  }

  private clearStorage(): void {
    this.clearSession();
    this._isAuthenticated$.next(false);
  }

  clearSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.USER_KEY);
    }
  }
}
