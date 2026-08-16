import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class QuickPropertyService {
  private modalOpenSubject = new BehaviorSubject<boolean>(false);
  modalOpen$: Observable<boolean> = this.modalOpenSubject.asObservable();

  private auth = inject(AuthService);
  private router = inject(Router);

  openModal(): void {
    const user = this.auth.currentUser;

    // ── Rule: If user is authenticated AND their KYC is approved ──────────────
    // Direct them to the main property creation page (Dashboard form with photos & full details)
    const isKycApproved = user?.kycStatus === 'approved';
    const isAuthorizedRole = user && (user.role === 'owner' || user.role === 'agent' || user.role === 'admin');

    if (user && (isKycApproved || isAuthorizedRole)) {
      this.router.navigate(['/dashboard/properties'], { queryParams: { view: 'form' } });
      return;
    }

    // ── Otherwise (Guests / Unapproved Users) ──────────────────────────────────
    // Open the simplified quick lead/contact form modal
    const currentUrl = this.router.url;
    if (currentUrl !== '/' && !currentUrl.startsWith('/#')) {
      this.router.navigate(['/']).then(() => {
        setTimeout(() => {
          this.modalOpenSubject.next(true);
        }, 150);
      });
    } else {
      this.modalOpenSubject.next(true);
    }
  }

  closeModal(): void {
    this.modalOpenSubject.next(false);
  }
}
