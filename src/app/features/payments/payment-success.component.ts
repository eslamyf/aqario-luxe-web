import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { UserDashboardService } from '../user dashboard/user-dashboard.service';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="success-container">
      <div class="status-box">
        <ng-container *ngIf="status === 'pending'">
          <div class="spinner"></div>
          <h2>Confirming Payment...</h2>
          <p>We are waiting for the payment gateway to confirm your transaction. Please hold on, this usually takes a few seconds.</p>
        </ng-container>

        <ng-container *ngIf="status === 'success'">
          <div class="icon-circle success">
            <i class="fas fa-check"></i>
          </div>
          <h2>Payment Successful!</h2>
          <p>Your booking has been fully confirmed and paid.</p>
          <button class="action-btn primary" (click)="goToDashboard()">Go to Dashboard</button>
        </ng-container>

        <ng-container *ngIf="status === 'failed'">
          <div class="icon-circle error">
            <i class="fas fa-times"></i>
          </div>
          <h2>Verification Failed</h2>
          <p>We couldn't verify your payment. If you were charged, please contact support.</p>
          <button class="action-btn primary" (click)="goToDashboard()">Go to Dashboard</button>
        </ng-container>

        <ng-container *ngIf="status === 'delayed'">
          <div class="icon-circle delayed">
            <i class="fas fa-clock"></i>
          </div>
          <h2>Payment is taking longer than usual</h2>
          <p>We're still waiting for the payment provider's confirmation. This usually completes within a few minutes.</p>
          <div class="action-group" style="display:flex; gap:1rem; justify-content:center; margin-top:2rem;">
            <button class="action-btn primary" (click)="checkAgain()">Check Status Again</button>
            <button class="action-btn secondary" (click)="goToDashboard()">Go to My Bookings</button>
          </div>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .success-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60vh;
      text-align: center;
      color: #fff;
    }
    .status-box {
      background: #111;
      border: 1px solid #c9a96e;
      padding: 3rem;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      max-width: 500px;
      width: 100%;
    }
    .spinner {
      border: 4px solid rgba(201, 169, 110, 0.3);
      border-top: 4px solid #c9a96e;
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
      background: rgba(40, 167, 69, 0.2);
      color: #28a745;
      border: 1px solid #28a745;
    }
    .icon-circle.error {
      background: rgba(220, 53, 69, 0.2);
      color: #dc3545;
      border: 1px solid #dc3545;
    }
    .icon-circle.delayed {
      background: rgba(201, 169, 110, 0.2);
      color: #c9a96e;
      border: 1px solid #c9a96e;
    }
    h2 {
      color: #c9a96e;
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
      background: #c9a96e;
      color: #000;
    }
    .action-btn.secondary {
      background: transparent;
      color: #c9a96e;
      border: 1px solid #c9a96e;
    }
  `]
})
export class PaymentSuccessComponent implements OnInit, OnDestroy {
  status: 'pending' | 'success' | 'failed' | 'delayed' = 'pending';
  bookingId: string | null = null;
  private timer: any;
  private delays = [3000, 5000, 8000, 13000, 21000]; // Exponential backoff

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dashboardService = inject(UserDashboardService);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.bookingId = params['bookingId'];
      
      if (!this.bookingId) {
        this.bookingId = localStorage.getItem('lastCheckoutBookingId');
      }

      if (this.bookingId) {
        // Clean up fallback to prevent stale data in future visits
        localStorage.removeItem('lastCheckoutBookingId');
        this.pollBookingStatus(0);
      } else {
        this.status = 'failed';
      }
    });
  }

  pollBookingStatus(attempt: number): void {
    if (!this.bookingId) return;

    if (attempt >= this.delays.length) {
      this.status = 'delayed';
      return;
    }

    this.timer = setTimeout(() => {
      this.dashboardService.getBookingDetails(this.bookingId!).subscribe({
        next: (b) => {
          if (b.status === 'completed' || b.paymentStatus === 'paid') {
            this.status = 'success';
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
  }

  checkAgain(): void {
    this.status = 'pending';
    this.pollBookingStatus(0);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard/bookings']);
  }
}
