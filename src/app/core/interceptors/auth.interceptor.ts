import { Injectable, inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private translate = inject(TranslateService);

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem('aqario_token');
    const lang = this.translate.currentLang || this.translate.defaultLang || 'en';

    // ✅ Clone request to enable withCredentials and Accept-Language for ALL requests
    // This ensures cookies (like refreshToken) are sent securely and backend uses the right locale
    let authRequest = request.clone({
      withCredentials: true,
      setHeaders: {
        'Accept-Language': lang
      }
    });

    if (token) {
      authRequest = authRequest.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'Accept-Language': lang
        },
      });
    }

    return next.handle(authRequest);
  }
}
