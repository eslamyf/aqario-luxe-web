import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-payment-failed',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="failed-container">
      <div class="error-box">
        <div class="icon-circle error">
          <i class="fas fa-times"></i>
        </div>
        <h2>Payment Failed</h2>
        <p>Unfortunately, your payment could not be processed. This could be due to a declined card or a network issue.</p>
        
        <div class="action-group">
          <button class="action-btn primary" (click)="retry()">Try Again</button>
          <button class="action-btn secondary" (click)="goToDashboard()">Back to Dashboard</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .failed-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60vh;
      text-align: center;
      color: #fff;
    }
    .error-box {
      background: #111;
      border: 1px solid #ff4d4f;
      padding: 3rem;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      max-width: 500px;
      width: 100%;
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
      background: rgba(220, 53, 69, 0.2);
      color: #dc3545;
      border: 1px solid #dc3545;
    }
    h2 {
      color: #ff4d4f;
      margin-bottom: 0.5rem;
    }
    .action-group {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
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
export class PaymentFailedComponent implements OnInit {
  bookingId: string | null = null;
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit(): void {
    this.bookingId = this.route.snapshot.queryParamMap.get('bookingId') || localStorage.getItem('lastCheckoutBookingId');
  }

  retry(): void {
    if (this.bookingId) {
      this.router.navigate(['/checkout', this.bookingId]);
    } else {
      this.goToDashboard();
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard/bookings']);
  }
}
