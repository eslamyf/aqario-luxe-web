import { Injectable, inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpResponse,
  HttpClient,
  HttpBackend
} from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
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
    if (request.url.includes('/auth/login') || request.url.includes('/auth/google-login')) {
      this.isRefreshing = false;
      this.refreshTokenSubject.next(null);
      return next.handle(request);
    }

    if (request.url.includes('/auth/logout')) {
      return next.handle(request).pipe(
        catchError(() => {
          // Gracefully catch 401 on logout for unauthenticated sessions
          return of(new HttpResponse({ status: 200 }));
        })
      );
    }

    return next.handle(request).pipe(
      catchError((error) => {
        // Hard-stop dead-session auth paths before any retry / refresh logic can run.
        if (this.isDeadSessionAuthPath(request.url)) {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            return this.hardStopAuthLoop(error);
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
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      // Call refresh token endpoint, ensuring cookies are sent
      return this.http.post<any>(`${environment.apiUrl}/auth/refresh-token`, {}, { withCredentials: true }).pipe(
        switchMap((res: any) => {
          this.isRefreshing = false;
          const token = res.token;
          
          if (token) {
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
            return this.hardStopAuthLoop(err);
          }
          return this.logoutAndRedirect(err);
        })
      ) as Observable<HttpEvent<any>>;
    } else {
      // Queue the request while refreshing
      return this.refreshTokenSubject.pipe(
        filter((token) => token !== null),
        take(1),
        switchMap((token) => {
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
    localStorage.clear();
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

  private isDeadSessionAuthPath(url: string): boolean {
    return url.includes('/auth/logout') || url.includes('/auth/refresh-token') || url.includes('/users/me');
  }

  private hardStopAuthLoop(err: any): Observable<never> {
    this.isRefreshing = false;
    this.refreshTokenSubject.next(null);
    this.clearAuthState();
    this.authService.setCurrentUser(null);
    this.socketService.disconnect();

    const currentUrl = this.router.url;
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/account') || currentUrl.includes('/admin')) {
      void this.router.navigate(['/login']);
    }
    return throwError(() => err);
  }

  private logoutAndRedirect(err: any): Observable<never> {
    this.isRefreshing = false;
    this.refreshTokenSubject.next(null);
    this.clearAuthState();
    this.authService.setCurrentUser(null);
    this.socketService.disconnect();

    const currentUrl = this.router.url;
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/account') || currentUrl.includes('/admin')) {
      void this.router.navigate(['/login']);
    }
    return throwError(() => err);
  }
}
