import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserDashboardService } from './user-dashboard.service';
import { AuthService } from '../../core/auth/auth.service';
import { Router } from '@angular/router';
import { NotificationService } from '../../shared/services/notification.service';
import { TranslateService } from '@ngx-translate/core';
import { SocketService } from '../../core/services/socket.service';

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
  showModal = false;
  payoutAmount = 0;
  payoutMethod: 'paymob' | 'paypal' = 'paymob';
  payoutDetails = '';
  isSubmitting = false;
  modalCurrency: string = 'EGP';

  constructor(
    private userService: UserDashboardService,
    private router: Router,
    public auth: AuthService,
    private notif: NotificationService,
    private translate: TranslateService,
    private socketService: SocketService
  ) {}

  ngOnInit(): void {
    this.auth.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => this.currentUser = user);

    this.socketService.socket$
      .pipe(takeUntil(this.destroy$))
      .subscribe((socketInstance) => {
        if (socketInstance) {
          socketInstance.on('balanceUpdate', (data: any) => {
            if (this.currentUser) {
              this.currentUser.balance_USD = data.balance_USD;
            }
            this.load();
          });
        }
      });

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
        },
        error: (err) => {
          console.error('Failed to load payouts', err);
        }
      });
  }

  get balance_USD(): number {
    return this.currentUser?.balance_USD ?? 0;
  }

  get modalAvailableBalance(): number {
    return this.balance_USD;
  }

  openPayoutModal(method: 'paymob' | 'paypal' = 'paymob'): void {
    this.showModal = true;
    this.payoutAmount = 0;
    this.payoutDetails = '';
    this.payoutMethod = method;
    this.modalCurrency = 'EGP';
  }

  closePayoutModal(): void {
    this.showModal = false;
  }

  onMethodChange(): void {
    this.modalCurrency = 'EGP';
  }

  submitPayout(): void {
    if (this.payoutAmount <= 0) {
      this.notif.show(this.translate.instant('DASHBOARD.PAYOUT_MODAL.ERR_MIN_AMOUNT_USD'), 'error');
      return;
    }
    if (this.payoutAmount > this.modalAvailableBalance) {
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

  get isAr(): boolean {
    return this.translate.currentLang === 'ar';
  }

  get isOwnerOrAgent(): boolean {
    return this.currentUser?.role === 'owner' || this.currentUser?.role === 'agent';
  }

  get totalPaidUSD(): number {
    return this.payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + (p.totalAmount ?? 0), 0);
  }

  get totalPaid(): number {
    return this.totalPaidUSD;
  }

  get completedCount(): number {
    return this.payments.filter((p) => p.status === 'paid').length;
  }

  propertyTitle(p: any): string {
    return p.booking?.property_id?.title ?? p.property?.title ?? 'Unknown';
  }

  goToCheckout(bookingId: string): void {
    if (bookingId) {
      this.router.navigate(['/checkout', bookingId]);
    }
  }
}
