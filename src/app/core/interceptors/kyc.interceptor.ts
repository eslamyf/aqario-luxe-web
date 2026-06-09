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
        // ── KYC required (403) ────────────────────────────────────────────────
        if (error.status === 403 && error.error?.message?.toLowerCase().includes('kyc')) {
          this.notificationService.show('Identity verification is required for this action.', 'error');
          this.router.navigate(['/kyc']);
        }

        // ── Freemium cap reached (403 FREE_LIMIT_REACHED) ────────────────────
        // Triggered when a user without an active subscription tries to submit
        // their (FREE_LISTING_LIMIT + 1)th property. Show a specific "free
        // listings exhausted" message and redirect to the subscriptions page.
        if (error.status === 403 && error.error?.code === 'FREE_LIMIT_REACHED') {
          const freeLimit = error.error?.data?.freeLimit ?? 3;
          const msg  = this.translateService.instant('SUBSCRIPTION.FREE_LIMIT_REACHED', { limit: freeLimit });
          const hint = this.translateService.instant('SUBSCRIPTION.UPGRADE_HINT');
          this.notificationService.show(msg, 'error');
          setTimeout(() => this.notificationService.show(hint, 'warning' as any), 800);
          this.router.navigate(['/subscriptions']);
          (error as any).handled = true;
        }

        // ── No subscription at all — stale status edge-case (403 NO_SUBSCRIPTION)
        if (error.status === 403 && error.error?.code === 'NO_SUBSCRIPTION') {
          const msg  = this.translateService.instant('SUBSCRIPTION.REQUIRED');
          const hint = this.translateService.instant('SUBSCRIPTION.UPGRADE_HINT');
          this.notificationService.show(msg, 'error');
          setTimeout(() => this.notificationService.show(hint, 'warning' as any), 800);
          this.router.navigate(['/subscriptions']);
          (error as any).handled = true;
        }

        // ── Monthly listing limit reached (403 LISTING_LIMIT_REACHED) ─────────
        if (error.status === 403 && error.error?.code === 'LISTING_LIMIT_REACHED') {
          const used  = error.error?.data?.used  ?? '?';
          const limit = error.error?.data?.limit ?? '?';
          const msg = this.translateService.instant('SUBSCRIPTION.LIMIT_REACHED', { used, limit });
          this.notificationService.show(msg, 'error');
          this.router.navigate(['/subscriptions']);
          (error as any).handled = true;
        }

        // ── 409 Date Conflict errors ──────────────────────────────────────────
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
