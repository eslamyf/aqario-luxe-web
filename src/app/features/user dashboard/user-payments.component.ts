import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserDashboardService } from './user-dashboard.service';
import { AuthService } from '../../core/auth/auth.service';
import { Router } from '@angular/router';
import { NotificationService } from '../../shared/services/notification.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-user-payments',
  templateUrl: './user-payments.component.html',
  styleUrls: ['./user-payments.component.scss']
})
export class UserPaymentsComponent implements OnInit, OnDestroy {
  payments: any[] = [];
  isLoading = true;
  hasError = false;
  currentUser: any = null;
  private destroy$ = new Subject<void>();

  // Payout properties
  payouts: any[] = [];
  pendingPayoutsSum = 0;
  showModal = false;
  payoutAmount = 0;
  payoutMethod: 'paymob_wallet' | 'paypal' = 'paymob_wallet';
  payoutDetails = '';
  isSubmitting = false;

  constructor(
    private userService: UserDashboardService,
    private router: Router,
    public auth: AuthService,
    private notif: NotificationService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.auth.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => this.currentUser = user);
    this.load();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.isLoading = true;
    this.hasError = false;
    this.userService.getPayments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.payments = data; this.isLoading = false; },
        error: () => { this.isLoading = false; this.hasError = true; },
      });
    if (this.isOwnerOrAgent) {
      this.loadPayouts();
    }
  }

  loadPayouts(): void {
    this.userService.getPayouts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.payouts = res.payouts || [];
          this.calculatePendingSum();
        },
        error: (err) => {
          console.error('Failed to load payouts', err);
        }
      });
  }

  calculatePendingSum(): void {
    this.pendingPayoutsSum = this.payouts
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }

  get availableBalance(): number {
    return (this.currentUser?.cumulativeBalance || 0) - this.pendingPayoutsSum;
  }

  openPayoutModal(): void {
    this.showModal = true;
    this.payoutAmount = 0;
    this.payoutDetails = '';
    this.payoutMethod = 'paymob_wallet';
  }

  closePayoutModal(): void {
    this.showModal = false;
  }

  submitPayout(): void {
    if (this.payoutAmount <= 0) {
      this.notif.show(this.translate.instant('DASHBOARD.PAYOUT_MODAL.ERR_MIN_AMOUNT'), 'error');
      return;
    }
    if (this.payoutAmount > this.availableBalance) {
      this.notif.show(this.translate.instant('DASHBOARD.PAYOUT_MODAL.ERR_INSUFFICIENT'), 'error');
      return;
    }
    if (!this.payoutDetails.trim()) {
      return;
    }

    this.isSubmitting = true;
    this.userService.requestPayout(this.payoutAmount, this.payoutMethod, this.payoutDetails.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.notif.show(this.translate.instant('DASHBOARD.PAYOUT_MODAL.SUCCESS'), 'success');
          this.showModal = false;
          this.isSubmitting = false;
          this.loadPayouts();
          this.userService.getMe().subscribe();
        },
        error: (err) => {
          this.isSubmitting = false;
        }
      });
  }

  get isOwnerOrAgent(): boolean {
    return this.currentUser?.role === 'owner' || this.currentUser?.role === 'agent';
  }

  get totalPaid(): number {
    return this.payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + (p.totalAmount ?? 0), 0);
  }

  get completedCount(): number {
    return this.payments.filter((p) => p.status === 'paid').length;
  }

  propertyTitle(p: any): string {
    return p.booking?.property_id?.title ?? p.property?.title ?? 'Unknown Property';
  }

  goToCheckout(bookingId: string): void {
    if (bookingId) {
      this.router.navigate(['/checkout', bookingId]);
    }
  }
}
