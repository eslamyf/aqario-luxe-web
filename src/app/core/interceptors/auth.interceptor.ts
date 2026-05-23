import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem('aqario_token');

    // ✅ Clone request to enable withCredentials for ALL requests
    // This ensures cookies (like refreshToken) are sent securely to the backend
    let authRequest = request.clone({
      withCredentials: true
    });

    if (token) {
      authRequest = authRequest.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return next.handle(authRequest);
  }
}
