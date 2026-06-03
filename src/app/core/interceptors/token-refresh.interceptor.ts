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
        if (
          error instanceof HttpErrorResponse &&
          error.status === 401 &&
          !request.url.includes('auth/refresh-token') &&
          !request.url.includes('auth/login')
        ) {
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

  private logoutAndRedirect(err: any): Observable<never> {
    console.error('[Auth] Token refresh failed, logging out', err);
    this.authService.logout();
    this.router.navigate(['/']);
    return throwError(() => new Error('Session expired'));
  }
}
