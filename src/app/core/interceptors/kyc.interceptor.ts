import { Injectable, inject } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { NotificationService } from '../../shared/services/notification.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable()
export class KycInterceptor implements HttpInterceptor {
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private translateService = inject(TranslateService);

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Intercept 403 Forbidden errors specifically for KYC requirements
        if (error.status === 403 && error.error?.message?.toLowerCase().includes('kyc')) {
          this.notificationService.show('Identity verification is required for this action.', 'error');
          this.router.navigate(['/kyc']);
        }
        // Intercept 409 Date Conflict errors
        if (error.status === 409 && (error.error?.code === 'DATE_ALREADY_BOOKED' || error.error?.message === 'DATE_ALREADY_BOOKED')) {
          const msg = this.translateService.instant('ERRORS.DATE_ALREADY_BOOKED');
          this.notificationService.show(msg, 'error');
          (error as any).handled = true;
        }
        return throwError(() => error);
      })
    );
  }
}
