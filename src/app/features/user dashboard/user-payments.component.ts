import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserDashboardService } from './user-dashboard.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-payments',
  templateUrl: './user-payments.component.html',
  styleUrls: ['./user-payments.component.scss']
})
export class UserPaymentsComponent implements OnInit, OnDestroy {
  payments: any[] = [];
  isLoading = true;
  hasError = false;
  private destroy$ = new Subject<void>();

  constructor(private userService: UserDashboardService, private router: Router) {}

  ngOnInit(): void { this.load(); }

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
