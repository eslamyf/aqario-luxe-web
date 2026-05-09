import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserDashboardService } from '../user dashboard/user-dashboard.service';
import { NotificationService } from '../../shared/services/notification.service';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-subscription-checkout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="checkout-page">
      <div class="checkout-container">

        <!-- Back button -->
        <button class="btn-back" (click)="router.navigate(['/dashboard'])">
          ← Back to Dashboard
        </button>

        <!-- Header -->
        <div class="checkout-header">
          <div class="checkout-crown">👑</div>
          <h1>Activate Your Plan</h1>
          <p>One step away from listing your properties on Luxe Estates</p>
        </div>

        <!-- Loading -->
        <div *ngIf="isLoading" class="checkout-loading">
          <div class="spinner"></div>
          <p>Loading plan details...</p>
        </div>

        <!-- Error -->
        <div *ngIf="errorMsg" class="checkout-error">
          <span>⚠</span>
          <p>{{ errorMsg }}</p>
          <button class="btn-ghost" (click)="router.navigate(['/dashboard'])">
            Return to Dashboard
          </button>
        </div>

        <!-- Plan Selection -->
        <div *ngIf="!isLoading && !errorMsg && !paymentInitiated" class="checkout-content">

          <!-- Plan Card -->
          <div class="plan-card" *ngIf="selectedPlan">
            <div class="plan-badge">{{ selectedPlan.name }}</div>
            <div class="plan-price">
              <span class="price-amount">{{ selectedPlan.price | currency:'EGP':'symbol':'1.0-0' }}</span>
              <span class="price-period">/ {{ selectedPlan.durationDays }} days</span>
            </div>
            <ul class="plan-features">
              <li *ngFor="let f of selectedPlan.features">✓ {{ f }}</li>
            </ul>
          </div>

          <!-- Platform Fee Breakdown -->
          <div class="fee-breakdown" *ngIf="selectedPlan">
            <div class="fee-row">
              <span>Plan Price</span>
              <span>{{ selectedPlan.price | currency:'EGP':'symbol':'1.0-0' }}</span>
            </div>
            <div class="fee-row">
              <span>Platform Fee (2.5%)</span>
              <span>{{ platformFee | currency:'EGP':'symbol':'1.0-0' }}</span>
            </div>
            <div class="fee-row total">
              <span>Total</span>
              <span>{{ totalAmount | currency:'EGP':'symbol':'1.0-0' }}</span>
            </div>
          </div>

          <!-- Payment Method Selection -->
          <div class="payment-methods">
            <h3>Choose Payment Method</h3>
            <div class="methods-grid">
              <button class="method-card"
                [class.selected]="paymentMethod === 'paymob'"
                (click)="paymentMethod = 'paymob'">
                <div class="method-logo">💳</div>
                <div class="method-info">
                  <span class="method-name">Paymob</span>
                  <span class="method-sub">Egyptian Cards & Wallets</span>
                </div>
                <div class="method-check" *ngIf="paymentMethod === 'paymob'">✓</div>
              </button>

              <button class="method-card"
                [class.selected]="paymentMethod === 'paypal'"
                (click)="paymentMethod = 'paypal'">
                <div class="method-logo">🌐</div>
                <div class="method-info">
                  <span class="method-name">PayPal</span>
                  <span class="method-sub">International Payments (USD)</span>
                </div>
                <div class="method-check" *ngIf="paymentMethod === 'paypal'">✓</div>
              </button>
            </div>
          </div>

          <!-- Security Notice -->
          <div class="security-notice">
            🔒 Your payment is secured by 256-bit SSL encryption. We never store card details.
          </div>

          <!-- Checkout Button -->
          <button class="btn-checkout"
            [disabled]="!paymentMethod || isCheckingOut"
            (click)="checkout()">
            <span *ngIf="isCheckingOut" class="spinner-sm"></span>
            <span *ngIf="!isCheckingOut">🚀 Proceed to Payment</span>
            <span *ngIf="isCheckingOut">Processing...</span>
          </button>
        </div>

        <!-- Payment Initiated — redirect state -->
        <div *ngIf="paymentInitiated" class="payment-initiated">
          <div class="redirect-icon">🔄</div>
          <h2>Redirecting to Payment...</h2>
          <p>You will be redirected to {{ paymentMethod === 'paymob' ? 'Paymob' : 'PayPal' }} to complete your payment.</p>
          <p class="redirect-note">Do not close this window. Your subscription will activate automatically after payment.</p>
          <div class="spinner spinner-lg"></div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .checkout-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #0a0a1a 0%, #111132 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }
    .checkout-container {
      width: 100%;
      max-width: 560px;
    }

    .btn-back {
      background: none;
      border: none;
      color: #c9a96e;
      cursor: pointer;
      font-size: 0.875rem;
      margin-bottom: 2rem;
      padding: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: opacity 0.2s;
    }
    .btn-back:hover { opacity: 0.7; }

    .checkout-header {
      text-align: center;
      margin-bottom: 2.5rem;
    }
    .checkout-crown { font-size: 3rem; margin-bottom: 1rem; }
    .checkout-header h1 {
      font-size: 2rem;
      font-weight: 800;
      background: linear-gradient(135deg, #c9a96e, #e8c992);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0 0 0.5rem;
    }
    .checkout-header p { color: #aaa; font-size: 0.95rem; margin: 0; }

    .checkout-loading {
      text-align: center;
      padding: 3rem;
      color: #aaa;
    }

    .checkout-error {
      text-align: center;
      padding: 2rem;
      background: rgba(239,68,68,0.08);
      border: 1px solid rgba(239,68,68,0.2);
      border-radius: 16px;
    }
    .checkout-error p { color: #ef4444; margin: 0.5rem 0 1rem; }

    .plan-card {
      background: linear-gradient(135deg, rgba(201,169,110,0.08), rgba(232,201,146,0.04));
      border: 1px solid rgba(201,169,110,0.3);
      border-radius: 20px;
      padding: 1.75rem;
      margin-bottom: 1.5rem;
      text-align: center;
    }
    .plan-badge {
      display: inline-block;
      background: linear-gradient(135deg, #c9a96e, #e8c992);
      color: #111;
      font-weight: 700;
      font-size: 0.85rem;
      padding: 0.3rem 1rem;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1rem;
    }
    .plan-price { margin-bottom: 1rem; }
    .price-amount {
      font-size: 2.5rem;
      font-weight: 800;
      color: #c9a96e;
    }
    .price-period { font-size: 0.9rem; color: #aaa; }
    .plan-features {
      list-style: none;
      padding: 0;
      margin: 0;
      text-align: left;
    }
    .plan-features li {
      padding: 0.3rem 0;
      color: #aaa;
      font-size: 0.875rem;
    }
    .plan-features li::before { color: #4ade80; margin-right: 0.25rem; }

    .fee-breakdown {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      margin-bottom: 1.5rem;
    }
    .fee-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.4rem 0;
      color: #aaa;
      font-size: 0.875rem;
    }
    .fee-row + .fee-row { border-top: 1px solid rgba(255,255,255,0.05); }
    .fee-row.total {
      font-weight: 700;
      font-size: 1rem;
      color: #fff;
      border-top: 1px solid rgba(201,169,110,0.3) !important;
      margin-top: 0.25rem;
      padding-top: 0.75rem;
    }

    .payment-methods { margin-bottom: 1.5rem; }
    .payment-methods h3 {
      font-size: 0.9rem;
      font-weight: 600;
      color: #fff;
      margin: 0 0 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .methods-grid { display: flex; flex-direction: column; gap: 0.75rem; }
    .method-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03);
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
      width: 100%;
    }
    .method-card:hover { border-color: rgba(201,169,110,0.3); }
    .method-card.selected {
      border-color: #c9a96e;
      background: rgba(201,169,110,0.08);
    }
    .method-logo { font-size: 1.5rem; }
    .method-info { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; }
    .method-name { font-weight: 600; color: #fff; font-size: 0.9rem; }
    .method-sub  { color: #aaa; font-size: 0.8rem; }
    .method-check {
      width: 24px; height: 24px;
      border-radius: 50%;
      background: linear-gradient(135deg, #c9a96e, #e8c992);
      color: #111;
      font-weight: 700;
      font-size: 0.75rem;
      display: flex; align-items: center; justify-content: center;
    }

    .security-notice {
      background: rgba(74,222,128,0.06);
      border: 1px solid rgba(74,222,128,0.15);
      border-radius: 10px;
      padding: 0.75rem 1rem;
      font-size: 0.8rem;
      color: #4ade80;
      margin-bottom: 1.5rem;
    }

    .btn-checkout {
      width: 100%;
      padding: 1rem;
      border-radius: 14px;
      border: none;
      background: linear-gradient(135deg, #c9a96e, #e8c992);
      color: #111;
      font-weight: 700;
      font-size: 1rem;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .btn-checkout:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
    .btn-checkout:disabled { opacity: 0.5; cursor: not-allowed; }

    .payment-initiated {
      text-align: center;
      padding: 3rem 2rem;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 20px;
    }
    .redirect-icon { font-size: 3rem; margin-bottom: 1rem; animation: spin 2s linear infinite; }
    .payment-initiated h2 { color: #fff; margin: 0 0 0.5rem; }
    .payment-initiated p { color: #aaa; font-size: 0.9rem; margin: 0 0 0.5rem; }
    .redirect-note { font-size: 0.8rem !important; color: #fbbf24 !important; margin-top: 1rem !important; }

    .spinner {
      width: 48px; height: 48px;
      border: 3px solid rgba(201,169,110,0.2);
      border-top-color: #c9a96e;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 2rem auto 0;
    }
    .spinner-sm {
      width: 16px; height: 16px;
      border: 2px solid rgba(0,0,0,0.2);
      border-top-color: #111;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      display: inline-block;
    }
    .spinner-lg { width: 56px; height: 56px; }

    @keyframes spin { to { transform: rotate(360deg); } }

    .btn-ghost {
      padding: 0.5rem 1.25rem;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.12);
      background: transparent;
      color: #aaa;
      cursor: pointer;
      font-size: 0.875rem;
      margin-top: 1rem;
    }
  `]
})
export class SubscriptionCheckoutComponent implements OnInit {
  router      = inject(Router);
  private route = inject(ActivatedRoute);
  private svc   = inject(UserDashboardService);
  private notif = inject(NotificationService);

  selectedPlan: any  = null;
  plans: any[]       = [];
  paymentMethod: 'paymob' | 'paypal' | '' = '';
  isLoading      = true;
  isCheckingOut  = false;
  paymentInitiated = false;
  errorMsg       = '';
  planKey        = '';

  get platformFee(): number {
    if (!this.selectedPlan) return 0;
    return Math.round(this.selectedPlan.price * 0.025 * 100) / 100;
  }

  get totalAmount(): number {
    return (this.selectedPlan?.price || 0) + this.platformFee;
  }

  ngOnInit(): void {
    this.planKey = this.route.snapshot.queryParams['plan'] || '';
    this.loadPlans();
  }

  loadPlans(): void {
    this.svc.getPlans().subscribe({
      next: (plans) => {
        this.plans = plans;
        if (this.planKey) {
          this.selectedPlan = plans.find((p: any) =>
            p.key === this.planKey || p.name?.toLowerCase() === this.planKey.toLowerCase()
          );
        }
        if (!this.selectedPlan && plans.length > 0) {
          this.selectedPlan = plans[0];
          this.planKey = this.selectedPlan.key;
        }
        this.isLoading = false;
      },
      error: () => {
        this.errorMsg = 'Failed to load plan details. Please try again.';
        this.isLoading = false;
      }
    });
  }

  checkout(): void {
    if (!this.paymentMethod || !this.planKey) return;
    this.isCheckingOut = true;

    this.svc.subscriptionCheckout(this.planKey, this.paymentMethod as 'paymob' | 'paypal').subscribe({
      next: (data) => {
        this.isCheckingOut  = false;
        this.paymentInitiated = true;

        // Redirect to provider payment page
        const redirectUrl = data.paymentUrl || data.iframeUrl;
        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else if (data.paymentKey) {
          // Paymob iframe integration
          const iframeId = '{{ PAYMOB_IFRAME_ID }}'; // From environment
          window.location.href = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${data.paymentKey}`;
        } else {
          this.notif.show('Payment session created. Check your dashboard.', 'info');
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isCheckingOut = false;
        const msg = err?.error?.message || 'Failed to initiate payment. Please try again.';
        this.notif.show(msg, 'error');
        if (err?.error?.code === 'PENDING_SUBSCRIPTION_EXISTS') {
          this.notif.show('You have a pending payment. Please complete it first.', 'info');
        }
      }
    });
  }
}
