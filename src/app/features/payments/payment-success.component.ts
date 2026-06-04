import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { UserDashboardService } from '../user dashboard/user-dashboard.service';
import { PaymentService } from './payment.service';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './payment-success.component.html',
  styles: [`
    .success-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60vh;
      text-align: center;
      color: var(--text-main, #fff);
    }
    .status-box {
      background: var(--surface-color, #111);
      border: 1px solid var(--primary, #c9a96e);
      padding: 3rem;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      max-width: 500px;
      width: 100%;
    }
    .spinner {
      border: 4px solid rgba(var(--primary-rgb, 201, 169, 110), 0.3);
      border-top: 4px solid var(--primary, #c9a96e);
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1.5rem;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .icon-circle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
      font-size: 24px;
    }
    .icon-circle.success {
      background: rgba(var(--success-rgb, 40, 167, 69), 0.2);
      color: var(--success, #28a745);
      border: 1px solid var(--success, #28a745);
    }
    .icon-circle.error {
      background: rgba(var(--error-rgb, 220, 53, 69), 0.2);
      color: var(--error, #dc3545);
      border: 1px solid var(--error, #dc3545);
    }
    .icon-circle.delayed {
      background: rgba(var(--primary-rgb, 201, 169, 110), 0.2);
      color: var(--primary, #c9a96e);
      border: 1px solid var(--primary, #c9a96e);
    }
    h2 {
      color: var(--primary, #c9a96e);
      margin-bottom: 0.5rem;
    }
    .action-btn {
      padding: 0.75rem 2rem;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }
    .action-btn.primary {
      background: var(--primary, #c9a96e);
      color: var(--bg-main, #000);
    }
    .action-btn.secondary {
      background: transparent;
      color: var(--primary, #c9a96e);
      border: 1px solid var(--primary, #c9a96e);
    }
  `]
})
export class PaymentSuccessComponent implements OnInit, OnDestroy {
  status: 'pending' | 'success' | 'failed' | 'delayed' | 'capturing' = 'pending';
  paymentStatus: 'pending' | 'success' | 'failed' | 'delayed' | 'capturing' = 'pending';
  isLoading = true;
  bookingId: string | null = null;
  
  private timer: any;
  private delays = [3000, 5000, 8000, 13000, 21000]; // Exponential backoff
  private pollSubscription: Subscription | null = null;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dashboardService = inject(UserDashboardService);
  private paymentService = inject(PaymentService);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.bookingId = params['bookingId'];
      const token = params['token'];
      const payerId = params['PayerID'];

      if (!this.bookingId) {
        this.bookingId = localStorage.getItem('lastCheckoutBookingId');
      }

      if (this.bookingId) {
        // Clean up fallback to prevent stale data in future visits
        localStorage.removeItem('lastCheckoutBookingId');

        if (token && payerId) {
          // PayPal Checkout Approval Return sequence detected
          this.status = 'capturing';
          this.paymentStatus = 'pending';
          this.isLoading = true;

          this.pollSubscription = this.paymentService.capturePaypalOrder(this.bookingId, token, payerId).subscribe({
            next: (res) => {
              if (res.status === 'success' || res.data?.success) {
                this.status = 'success';
                this.paymentStatus = 'success';
                this.isLoading = false;
              } else {
                // Fallback to regular status polling
                this.status = 'pending';
                this.pollBookingStatus(0);
              }
            },
            error: (err) => {
              console.error('[PaymentSuccess] PayPal capture error:', err);
              // Fallback to status polling just in case backend processed it concurrently
              this.status = 'pending';
              this.pollBookingStatus(0);
            }
          });
        } else {
          // Regular flow (e.g. Paymob webhook polling)
          this.pollBookingStatus(0);
        }
      } else {
        this.status = 'failed';
        this.paymentStatus = 'failed';
        this.isLoading = false;
      }
    });
  }

  pollBookingStatus(attempt: number): void {
    if (!this.bookingId) return;

    if (attempt >= this.delays.length) {
      this.status = 'delayed';
      this.paymentStatus = 'delayed';
      this.isLoading = false;
      return;
    }

    // Clear any previous active subscription before rescheduling
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }

    this.timer = setTimeout(() => {
      this.pollSubscription = this.paymentService.verifyPaymentStatus(this.bookingId!).subscribe({
        next: (res) => {
          if (res.data?.paid || res.data?.paymentStatus === 'paid') {
            this.status = 'success';
            this.paymentStatus = 'success';
            this.isLoading = false;
            if (this.pollSubscription) {
              this.pollSubscription.unsubscribe();
            }
          } else if (res.data?.paymentStatus === 'failed' || res.data?.paymentStatus === 'expired') {
            this.status = 'failed';
            this.paymentStatus = 'failed';
            this.isLoading = false;
            if (this.pollSubscription) {
              this.pollSubscription.unsubscribe();
            }
          } else {
            this.pollBookingStatus(attempt + 1);
          }
        },
        error: () => {
          this.pollBookingStatus(attempt + 1);
        }
      });
    }, this.delays[attempt]);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
  }

  checkAgain(): void {
    this.status = 'pending';
    this.paymentStatus = 'pending';
    this.isLoading = true;
    this.pollBookingStatus(0);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard/bookings']);
  }
}
