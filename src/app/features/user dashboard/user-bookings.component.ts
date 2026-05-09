import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';
import { UserDashboardService } from './user-dashboard.service';

@Component({
  selector: 'app-user-bookings',
  templateUrl: './user-bookings.component.html',
  styleUrls: ['./user-bookings.component.scss']
})
export class UserBookingsComponent implements OnInit, OnDestroy {
  bookings: any[] = [];
  isLoading = true;
  hasError = false;
  loadingMap: Record<string, boolean> = {};

  // For cancellation
  cancelDialogBooking: any = null;
  cancelReason = '';
  isCancelling = false;

  filter = 'all';
  private destroy$ = new Subject<void>();
  private router = inject(Router);

  constructor(private userService: UserDashboardService) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.isLoading = true;
    this.hasError = false;
    this.userService.getMyBookings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.bookings = data; this.isLoading = false; },
        error: () => { this.isLoading = false; this.hasError = true; },
      });
  }

  get filtered(): any[] {
    return this.filter === 'all'
      ? this.bookings
      : this.bookings.filter((b) => b.status === this.filter);
  }

  // Property title — handles both populated and flat structures
  propertyTitle(b: any): string {
    return b.property?.title ?? b.property_id?.title ?? 'N/A';
  }

  openCancelDialog(booking: any): void {
    this.cancelDialogBooking = booking;
    this.cancelReason = '';
  }

  closeCancelDialog(): void {
    this.cancelDialogBooking = null;
    this.cancelReason = '';
  }

  confirmCancel(): void {
    if (!this.cancelDialogBooking) return;
    const id = this.cancelDialogBooking._id;
    this.isCancelling = true;

    this.userService.cancelBooking(id, this.cancelReason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Instant sync
          this.bookings = this.bookings.map(b => b._id === id ? { ...b, status: 'cancelled' } : b);
          this.closeCancelDialog();
          this.isCancelling = false;
        },
        error: () => { this.isCancelling = false; },
      });
  }

  canCancel(b: any): boolean {
    return b.status !== 'cancelled' && b.status !== 'rejected' && b.status !== 'completed' && b.paymentStatus !== 'paid';
  }

  goToCheckout(booking: any): void {
    if (booking && booking._id) {
      this.router.navigate(['/checkout', booking._id]);
    }
  }
}
