import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PaymentService } from './payment.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="checkout-container">
      <div class="loader-box" *ngIf="isLoading && !hasError">
        <div class="spinner"></div>
        <h2>Securely Connecting to Paymob...</h2>
        <p>Please wait while we set up your secure payment session. You will be redirected shortly.</p>
        <div class="security-badge">
          <span>🔒 256-bit Secure Encryption</span>
        </div>
      </div>

      <div class="error-box" *ngIf="hasError">
        <div class="icon-circle error">❌</div>
        <h2>Payment Initialization Failed</h2>
        <p>{{ errorMessage }}</p>
        <button class="action-btn" (click)="retry()">Retry Connection</button>
      </div>
    </div>
  `,
  styles: [`
    .checkout-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      background: radial-gradient(circle at center, #1a1a1a 0%, #0a0a0a 100%);
      color: #fff;
    }
    .loader-box {
      text-align: center;
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(10px);
      padding: 4rem;
      border-radius: 32px;
      border: 1px solid rgba(201, 169, 110, 0.3);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
      max-width: 500px;
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
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    h2 { color: #c9a96e; margin-bottom: 1rem; letter-spacing: 1px; }
    p { color: #aaa; line-height: 1.6; margin-bottom: 2rem; }
    .security-badge {
      display: inline-block;
      padding: 0.5rem 1.5rem;
      background: rgba(201, 169, 110, 0.1);
      border: 1px solid rgba(201, 169, 110, 0.2);
      border-radius: 50px;
      font-size: 0.8rem;
      color: #c9a96e;
    }
    .error-box {
      text-align: center;
      padding: 4rem;
      background: rgba(220, 53, 69, 0.05);
      border: 1px solid #dc3545;
      border-radius: 32px;
    }
    .icon-circle.error {
      font-size: 3rem;
      margin-bottom: 2rem;
    }
    .action-btn {
      background: #c9a96e;
      color: #000;
      padding: 1rem 3rem;
      border: none;
      border-radius: 12px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 2rem;
    }
  `]
})
export class CheckoutComponent implements OnInit {
  isLoading = true;
  hasError = false;
  errorMessage = '';
  bookingId: string | null = null;

  private route = inject(ActivatedRoute);
  private paymentService = inject(PaymentService);

  ngOnInit(): void {
    this.bookingId = this.route.snapshot.paramMap.get('bookingId');
    if (!this.bookingId) {
      this.showError('Invalid booking reference.');
      return;
    }
    this.startPaymobCheckout();
  }

  startPaymobCheckout(): void {
    this.isLoading = true;
    this.hasError = false;

    // Defaulting to Paymob as requested
    this.paymentService.checkout(this.bookingId!, 'paymob').subscribe({
      next: (res) => {
        if (res.data?.url) {
          localStorage.setItem('lastCheckoutBookingId', this.bookingId!);
          window.location.href = res.data.url;
        } else {
          this.showError('Could not generate Paymob secure URL.');
        }
      },
      error: (err) => {
        this.showError(err.error?.message || 'Connection to Paymob failed.');
      }
    });
  }

  retry(): void {
    this.startPaymobCheckout();
  }

  private showError(msg: string): void {
    this.isLoading = false;
    this.hasError = true;
    this.errorMessage = msg;
  }
}
