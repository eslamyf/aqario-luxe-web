import { Injectable, inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpClient,
  HttpBackend
} from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';
import { SocketService } from '../services/socket.service';

@Injectable()
export class TokenRefreshInterceptor implements HttpInterceptor {
  private authService = inject(AuthService);
  private router = inject(Router);
  private socketService = inject(SocketService);
  
  // Use HttpBackend to bypass interceptors for the refresh request
  private httpBackend = inject(HttpBackend);
  private http: HttpClient;

  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  constructor() {
    this.http = new HttpClient(this.httpBackend);
  }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error) => {
        // Explicitly bypass and throw 401 errors from authentication-handling endpoints
        if (
          request.url.includes('/auth/refresh-token') ||
          request.url.includes('/auth/logout') ||
          request.url.includes('/auth/login')
        ) {
          if (request.url.includes('/auth/refresh-token') && error instanceof HttpErrorResponse && error.status === 401) {
            return this.forceLogout('Refresh token rejected with 401');
          }
          return throwError(() => error);
        }

        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    console.log('[AuthInterceptor] Intercepted 401 error for:', request.url);
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);
      console.log('[AuthInterceptor] Starting token refresh process...');

      // Call refresh token endpoint, ensuring cookies are sent
      return this.http.post<any>(`${environment.apiUrl}/auth/refresh-token`, {}, { withCredentials: true }).pipe(
        switchMap((res: any) => {
          console.log('[AuthInterceptor] Refresh token response received:', res);
          this.isRefreshing = false;
          const token = res.token;
          
          if (token) {
            console.log('[AuthInterceptor] Successfully obtained new token. Retrying original request...');
            // Update token in storage
            localStorage.setItem('aqario_token', token);
            
            // Sync with AuthService user state
            const currentUser = this.authService.getCurrentUser<any>();
            if (currentUser) {
              currentUser.token = token;
              localStorage.setItem('aqario_user', JSON.stringify(currentUser));
              this.authService.setCurrentUser(currentUser);
            }

            // Sync token update with Socket.io connection
            this.socketService.updateTokenAndReconnect(token);

            this.refreshTokenSubject.next(token);
            return next.handle(this.addToken(request, token));
          }

          return this.logoutAndRedirect('No token returned');
        }),
        catchError((err) => {
          this.isRefreshing = false;
          if (err instanceof HttpErrorResponse && err.status === 401) {
            return this.forceLogout(err);
          }
          return this.logoutAndRedirect(err);
        })
      );
    } else {
      console.log('[AuthInterceptor] Refresh in progress. Queueing request:', request.url);
      // Queue the request while refreshing
      return this.refreshTokenSubject.pipe(
        filter((token) => token !== null),
        take(1),
        switchMap((token) => {
          console.log('[AuthInterceptor] Queue released! Retrying queued request:', request.url);
          return next.handle(this.addToken(request, token!));
        })
      );
    }
  }

  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private clearAuthState(): void {
    this.authService.clearSession();
    localStorage.removeItem('aqario_theme');
    localStorage.removeItem('aqario_lang');
    sessionStorage.clear();

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const eqIndex = cookie.indexOf('=');
      const name = (eqIndex > -1 ? cookie.slice(0, eqIndex) : cookie).trim();
      if (!name) continue;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
    }
  }

  private forceLogout(err: any): Observable<never> {
    console.error('[Auth] Refresh endpoint rejected the session, forcing logout', err);
    this.isRefreshing = false;
    this.refreshTokenSubject.next(null);
    this.clearAuthState();
    this.authService.logout();
    this.router.navigate(['/login']);
    return throwError(() => new Error('Session expired'));
  }

  private logoutAndRedirect(err: any): Observable<never> {
    console.error('[Auth] Token refresh failed, logging out', err);
    this.clearAuthState();
    this.authService.logout();
    this.router.navigate(['/login']);
    return throwError(() => new Error('Session expired'));
  }
}
