import { Injectable, inject } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { NotificationService } from '../../shared/services/notification.service';

@Injectable()
export class KycInterceptor implements HttpInterceptor {
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Intercept 403 Forbidden errors specifically for KYC requirements
        if (error.status === 403 && error.error?.message?.toLowerCase().includes('kyc')) {
          this.notificationService.show('Identity verification is required for this action.', 'error');
          this.router.navigate(['/kyc']);
        }
        return throwError(() => error);
      })
    );
  }
}
