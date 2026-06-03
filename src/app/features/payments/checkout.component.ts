import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from './payment.service';
import { BookingsService } from '../bookings/bookings.service';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="checkout-container">
      <div class="loader-box" *ngIf="isLoading && !hasError && !booking">
        <div class="spinner"></div>
        <h2>{{ 'CHECKOUT.LOADING' | translate }}</h2>
        <p>{{ 'CHECKOUT.RETRIEVING' | translate }}</p>
      </div>

      <div class="error-box" *ngIf="hasError">
        <div class="icon-circle error">&times;</div>
        <h2>{{ 'CHECKOUT.FAILED' | translate }}</h2>
        <p>{{ errorMessage }}</p>
        <button class="action-btn" (click)="loadBooking()">{{ 'CHECKOUT.RETRY' | translate }}</button>
      </div>

      <div class="checkout-content" *ngIf="booking && !hasError">
        
        <div class="invoice-section">
          <div class="invoice-header">
            <h2>{{ 'CHECKOUT.ORDER_SUMMARY' | translate }}</h2>
            <p class="ref-number">{{ 'CHECKOUT.REF' | translate }}: {{ booking._id }}</p>
          </div>

          <div class="property-summary">
            <h3>{{ booking.property?.title }}</h3>
            <p>{{ booking.start_date | date }} - {{ booking.end_date | date }}</p>
          </div>

          <div class="invoice-details">
            <div class="invoice-row">
              <span>{{ 'CHECKOUT.PROPERTY_TOTAL' | translate }}</span>
              <span>{{ booking.amount | currency:booking.property?.currency:'symbol':'1.0-0' }}</span>
            </div>
            <div class="invoice-row service-fee">
              <span>{{ 'CHECKOUT.SERVICE_FEE' | translate }}</span>
              <span>{{ serviceFee | currency:booking.property?.currency:'symbol':'1.0-0' }}</span>
            </div>
            <div class="invoice-row total-row">
              <span>{{ 'CHECKOUT.FINAL_TOTAL' | translate }}</span>
              <span class="final-price">{{ finalPrice | currency:booking.property?.currency:'symbol':'1.0-0' }}</span>
            </div>
          </div>
        </div>

        <div class="payment-section">
          <h2>{{ 'CHECKOUT.SELECT_PAYMENT_METHOD' | translate }}</h2>
          
          <div class="payment-methods">
            <label class="method-card" [class.selected]="selectedMethod === 'paymob'" (click)="selectedMethod = 'paymob'">
              <input type="radio" name="paymentMethod" value="paymob" [(ngModel)]="selectedMethod">
              <div class="method-info">
                <span class="method-name">{{ 'CHECKOUT.CREDIT_DEBIT' | translate }}</span>
                <span class="method-desc">{{ 'CHECKOUT.SECURE_PAYMOB' | translate }}</span>
              </div>
            </label>

            <label class="method-card" [class.selected]="selectedMethod === 'paypal'" (click)="selectedMethod = 'paypal'">
              <input type="radio" name="paymentMethod" value="paypal" [(ngModel)]="selectedMethod">
              <div class="method-info">
                <span class="method-name">{{ 'CHECKOUT.PAYPAL' | translate }}</span>
                <span class="method-desc">{{ 'CHECKOUT.SECURE_PAYPAL' | translate }}</span>
              </div>
            </label>
          </div>

          <div class="security-badge">
            <span>{{ 'CHECKOUT.SECURE_ENCRYPTION' | translate }}</span>
          </div>

          <button class="action-btn full-width" 
                  [disabled]="isProcessing" 
                  (click)="processPayment()">
            <span *ngIf="!isProcessing">{{ 'CHECKOUT.PAY' | translate }} {{ finalPrice | currency:booking.property?.currency:'symbol':'1.0-0' }}</span>
            <div *ngIf="isProcessing" class="spinner-small"></div>
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .checkout-container {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      background: var(--bg-base);
      color: var(--text-main);
      padding: 120px 20px 60px;
      font-family: 'DM Sans', sans-serif;
    }

    /* Loading & Error States */
    .loader-box, .error-box {
      text-align: center;
      background: var(--surface-glass);
      backdrop-filter: blur(10px);
      padding: 4rem;
      border-radius: 32px;
      border: 1px solid var(--brand-gold-soft);
      max-width: 500px;
      margin: auto;
    }

    .spinner {
      border: 4px solid rgba(201, 169, 110, 0.1);
      border-top: 4px solid #c9a96e;
      border-radius: 50%;
      width: 70px;
      height: 70px;
      animation: spin 1s linear infinite;
      margin: 0 auto 2.5rem;
    }

    .spinner-small {
      border: 3px solid rgba(0, 0, 0, 0.1);
      border-top: 3px solid #000;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }

    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    /* Layout */
    .checkout-content {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 40px;
      max-width: 1100px;
      width: 100%;
      animation: fadeIn 0.4s ease;
    }

    @media (max-width: 900px) {
      .checkout-content { grid-template-columns: 1fr; }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    h2 { 
      font-family: 'Cormorant Garamond', serif;
      font-size: 28px;
      color: var(--brand-gold);
      margin-bottom: 24px;
      font-weight: 400;
    }

    /* Invoice Section */
    .invoice-section, .payment-section {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 32px;
    }

    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 16px;
      margin-bottom: 24px;

      h2 { margin: 0; }
      .ref-number { font-family: monospace; color: var(--text-muted); font-size: 13px; }
    }

    .property-summary {
      margin-bottom: 32px;
      h3 { font-size: 18px; color: var(--text-main); margin-bottom: 8px; }
      p { color: var(--text-muted); font-size: 14px; }
    }

    .invoice-details {
      .invoice-row {
        display: flex;
        justify-content: space-between;
        padding: 12px 0;
        color: var(--text-main);
        font-size: 15px;

        &.service-fee {
          color: var(--text-muted);
          font-size: 14px;
        }

        &.total-row {
          margin-top: 16px;
          padding-top: 24px;
          border-top: 1px dashed var(--border-color);
          font-weight: 700;
          color: var(--text-main);
          font-size: 18px;

          .final-price { color: var(--brand-gold); font-size: 24px; }
        }
      }
    }

    /* Payment Methods */
    .payment-methods {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 32px;
    }

    .method-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;

      input[type="radio"] { display: none; }
      .method-icon { font-size: 24px; }
      .method-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        .method-name { font-weight: 600; color: var(--text-main); }
        .method-desc { font-size: 12px; color: var(--text-muted); }
      }

      &:hover {
        border-color: var(--brand-gold-soft);
      }

      &.selected {
        background: var(--brand-gold-soft);
        border-color: var(--brand-gold);
        box-shadow: 0 0 0 1px var(--brand-gold);
      }
    }

    .security-badge {
      text-align: center;
      margin-bottom: 24px;
      span {
        display: inline-block;
        padding: 6px 16px;
        background: rgba(201, 169, 110, 0.1);
        border-radius: 20px;
        font-size: 12px;
        color: #c9a96e;
      }
    }

    .action-btn {
      background: linear-gradient(135deg, #c9a96e, #e8d09f);
      color: #000;
      padding: 18px;
      border: none;
      border-radius: 4px;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 1px;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 56px;

      &.full-width { width: 100%; }

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(201, 169, 110, 0.2);
      }

      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
    }
  `]
})
export class CheckoutComponent implements OnInit {
  isLoading = true;
  hasError = false;
  isProcessing = false;
  errorMessage = '';
  bookingId: string | null = null;
  booking: any = null;

  serviceFee = 0;
  finalPrice = 0;
  selectedMethod = 'paymob';

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paymentService = inject(PaymentService);
  private bookingsService = inject(BookingsService);

  ngOnInit(): void {
    this.bookingId = this.route.snapshot.paramMap.get('bookingId');
    if (!this.bookingId) {
      this.showError('Invalid booking reference.');
      return;
    }
    this.loadBooking();
  }

  loadBooking(): void {
    this.isLoading = true;
    this.hasError = false;
    
    this.bookingsService.getBooking(this.bookingId!).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.booking = res.data?.booking;
        if (!this.booking) {
          this.showError('Booking not found.');
          return;
        }

        // Calculate fees: 5% service & platform fee
        const propertyTotal = this.booking.amount || 0;
        this.serviceFee = propertyTotal * 0.05;
        this.finalPrice = propertyTotal + this.serviceFee;
      },
      error: (err) => {
        this.showError(err.error?.message || 'Failed to load booking details.');
      }
    });
  }

  processPayment(): void {
    if (!this.selectedMethod) return;

    this.isProcessing = true;
    
    this.paymentService.checkout(this.bookingId!, this.selectedMethod).subscribe({
      next: (res) => {
        const url = res.data?.paymentUrl || res.data?.url;
        if (url) {
          localStorage.setItem('lastCheckoutBookingId', this.bookingId!);
          window.location.href = url;
        } else if (res.status === 'success') {
          // Fallback for bank_transfer if it completes immediately or redirects somewhere else
          this.router.navigate(['/payment/success'], { queryParams: { booking: this.bookingId, method: this.selectedMethod } });
        } else {
          this.isProcessing = false;
          this.showError('Could not generate secure payment URL.');
        }
      },
      error: (err) => {
        this.isProcessing = false;
        this.showError(err.error?.message || 'Connection to payment gateway failed.');
      }
    });
  }

  private showError(msg: string): void {
    this.isLoading = false;
    this.hasError = true;
    this.errorMessage = msg;
  }
}
