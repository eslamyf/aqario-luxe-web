import { Component, OnInit, inject } from '@angular/core';
import { UserDashboardService } from './user-dashboard.service';
import { NotificationService } from '../../shared/services/notification.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-owner-bookings',
  template: `
    <div class="owner-bookings-wrapper">
      <!-- Header -->
      <div class="section-header">
        <div>
          <h2 class="section-title">Incoming Requests</h2>
          <p class="section-sub">Manage rental and purchase requests for your properties</p>
        </div>
        <div class="filter-tabs">
          <button *ngFor="let f of filters"
            class="filter-tab"
            [class.active]="activeFilter === f.key"
            (click)="setFilter(f.key)">
            {{ f.label }}
            <span class="badge" *ngIf="f.key === 'pending' && pendingCount > 0">{{ pendingCount }}</span>
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading" class="bookings-loading">
        <div class="skeleton" *ngFor="let i of [1,2,3]"></div>
      </div>

      <!-- Error -->
      <div *ngIf="errorMsg && !isLoading" class="bookings-error">
        <span class="error-icon">⚠</span>
        <p>{{ errorMsg }}</p>
        <button class="btn-ghost" (click)="loadBookings()">Retry</button>
      </div>

      <!-- Empty -->
      <div *ngIf="!isLoading && !errorMsg && bookings.length === 0" class="bookings-empty">
        <div class="empty-icon">📋</div>
        <h3>No {{ activeFilter === 'all' ? '' : activeFilter }} requests yet</h3>
        <p>When buyers request to book or purchase your properties, they'll appear here.</p>
      </div>

      <!-- Bookings List -->
      <div *ngIf="!isLoading && !errorMsg && bookings.length > 0" class="bookings-list">
        <div class="booking-card" *ngFor="let booking of filteredBookings; trackBy: trackById">

          <!-- Booking Header -->
          <div class="booking-card-header">
            <div class="booking-type-badge" [class]="'type-' + booking.bookingType">
              {{ booking.bookingType === 'rent' ? '🏠 Rental Request' : '💰 Purchase Offer' }}
            </div>
            <div class="booking-status-badge" [class]="'status-' + booking.status">
              {{ booking.status | titlecase }}
            </div>
          </div>

          <!-- Property Info -->
          <div class="booking-property">
            <div class="property-thumb" *ngIf="booking.property_id?.images?.length">
              <img [src]="booking.property_id.images[0]" [alt]="booking.property_id.title" />
            </div>
            <div class="property-info">
              <h3 class="property-title">{{ booking.property_id?.title || 'Property' }}</h3>
              <p class="property-location">
                📍 {{ booking.property_id?.location?.city || 'N/A' }}
              </p>
            </div>
          </div>

          <!-- Buyer Info -->
          <div class="buyer-info">
            <div class="buyer-avatar">
              <img *ngIf="booking.user_id?.photo" [src]="booking.user_id.photo" [alt]="booking.user_id.name" />
              <span *ngIf="!booking.user_id?.photo">{{ booking.user_id?.name?.charAt(0) | uppercase }}</span>
            </div>
            <div>
              <p class="buyer-name">{{ booking.user_id?.name || 'Client' }}</p>
              <p class="buyer-email">{{ booking.user_id?.email }}</p>
            </div>
          </div>

          <!-- Booking Details -->
          <div class="booking-details">
            <!-- Rent -->
            <ng-container *ngIf="booking.bookingType === 'rent'">
              <div class="detail-item">
                <span class="detail-label">Check-in</span>
                <span class="detail-value">{{ booking.start_date | date:'dd MMM yyyy' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Check-out</span>
                <span class="detail-value">{{ booking.end_date | date:'dd MMM yyyy' }}</span>
              </div>
            </ng-container>
            <!-- Sale -->
            <ng-container *ngIf="booking.bookingType === 'sale'">
              <div class="detail-item">
                <span class="detail-label">Listed Price</span>
                <span class="detail-value">{{ booking.amount | currency:'EGP':'symbol':'1.0-0' }}</span>
              </div>
              <div class="detail-item" *ngIf="booking.offerPrice">
                <span class="detail-label">Offer Price</span>
                <span class="detail-value offer-price">{{ booking.offerPrice | currency:'EGP':'symbol':'1.0-0' }}</span>
              </div>
            </ng-container>
            <div class="detail-item">
              <span class="detail-label">Total</span>
              <span class="detail-value amount">{{ booking.amount | currency:'EGP':'symbol':'1.0-0' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Payment</span>
              <span class="detail-value" [class]="'pay-' + booking.paymentStatus">
                {{ booking.paymentStatus | titlecase }}
              </span>
            </div>
          </div>

          <!-- Notes -->
          <div class="booking-notes" *ngIf="booking.notes">
            <span class="notes-label">Client Note:</span>
            <p>"{{ booking.notes }}"</p>
          </div>

          <!-- Actions (only for pending bookings) -->
          <div class="booking-actions" *ngIf="booking.status === 'pending'">
            <button class="btn-approve"
              [disabled]="loadingMap[booking._id]"
              (click)="approve(booking._id)">
              <span *ngIf="loadingMap[booking._id]" class="spinner-xs"></span>
              ✓ Approve
            </button>
            <button class="btn-reject"
              [disabled]="loadingMap[booking._id]"
              (click)="openRejectDialog(booking)">
              ✕ Decline
            </button>
          </div>

          <!-- Approved — waiting for payment -->
          <div class="booking-approved-notice" *ngIf="booking.status === 'approved' && booking.paymentStatus === 'not_initiated'">
            <span class="notice-icon">⏳</span>
            Approved — awaiting client payment
            <button class="btn-ghost btn-sm" style="margin-left:auto" (click)="openCancelDialog(booking)">Cancel Booking</button>
          </div>

          <!-- Paid -->
          <div class="booking-paid-notice" *ngIf="booking.paymentStatus === 'paid'">
            <span class="notice-icon">✅</span>
            Payment confirmed — transaction complete
          </div>

          <!-- Request date -->
          <p class="booking-date">Requested {{ booking.created_at | date:'dd MMM yyyy, HH:mm' }}</p>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination" *ngIf="totalPages > 1">
        <button [disabled]="currentPage <= 1" (click)="changePage(currentPage - 1)" class="page-btn">← Prev</button>
        <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
        <button [disabled]="currentPage >= totalPages" (click)="changePage(currentPage + 1)" class="page-btn">Next →</button>
      </div>
    </div>

    <!-- Reject Dialog -->
    <div class="dialog-overlay" *ngIf="rejectDialogBooking" (click)="closeRejectDialog()">
      <div class="dialog-box" (click)="$event.stopPropagation()">
        <h3>Decline Request</h3>
        <p>Please provide a reason for declining this booking request.</p>
        <textarea
          class="reject-reason-input"
          placeholder="e.g. Property already reserved for those dates..."
          [(ngModel)]="rejectReason"
          rows="3">
        </textarea>
        <div class="dialog-actions">
          <button class="btn-ghost" (click)="closeRejectDialog()">Cancel</button>
          <button class="btn-danger" (click)="confirmReject()" [disabled]="isRejecting || !rejectReason.trim()">
            <span *ngIf="isRejecting" class="spinner-xs"></span>
            Confirm Decline
          </button>
        </div>
      </div>
    </div>

    <!-- Cancel Dialog -->
    <div class="dialog-overlay" *ngIf="cancelDialogBooking" (click)="closeCancelDialog()">
      <div class="dialog-box" (click)="$event.stopPropagation()">
        <h3>Cancel Booking</h3>
        <p>Are you sure you want to cancel this approved booking? Please provide a reason.</p>
        <textarea
          class="reject-reason-input"
          placeholder="Reason for cancellation..."
          [(ngModel)]="cancelReason"
          rows="3">
        </textarea>
        <div class="dialog-actions">
          <button class="btn-ghost" (click)="closeCancelDialog()">Close</button>
          <button class="btn-danger" (click)="confirmCancel()" [disabled]="isCancelling || !cancelReason.trim()">
            <span *ngIf="isCancelling" class="spinner-xs"></span>
            Confirm Cancel
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .owner-bookings-wrapper { max-width: 960px; }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .section-title { font-size: 1.5rem; font-weight: 700; color: var(--text-main); margin: 0 0 0.25rem; letter-spacing: -0.02em; }
    .section-sub { color: var(--text-muted); font-size: 0.95rem; margin: 0; }

    .filter-tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .filter-tab {
      padding: 0.5rem 1rem;
      border-radius: 999px;
      border: 1px solid var(--border-color);
      background: var(--bg-surface);
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      box-shadow: var(--shadow-soft);
    }
    .filter-tab.active, .filter-tab:hover {
      background: var(--brand-gold);
      color: #fff;
      border-color: var(--brand-gold);
      font-weight: 600;
    }
    .badge {
      position: absolute;
      top: -6px; right: -6px;
      background: #ef4444;
      color: #fff;
      font-size: 0.7rem;
      font-weight: 700;
      border-radius: 999px;
      padding: 2px 6px;
      min-width: 18px;
      text-align: center;
      border: 2px solid var(--bg-surface);
    }

    /* Skeleton */
    .bookings-loading { display: flex; flex-direction: column; gap: 1rem; }
    .skeleton {
      height: 160px;
      border-radius: 16px;
      background: linear-gradient(90deg, color-mix(in srgb, var(--text-main) 4%, transparent) 25%, color-mix(in srgb, var(--text-main) 8%, transparent) 50%, color-mix(in srgb, var(--text-main) 4%, transparent) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    /* Error / Empty */
    .bookings-error, .bookings-empty {
      text-align: center;
      padding: 3rem;
      background: var(--bg-elevated);
      border-radius: 16px;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-soft);
    }
    .bookings-error { color: #ef4444; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
    .bookings-empty h3 { color: var(--text-main); margin: 0 0 0.5rem; font-size: 1.1rem; }
    .bookings-empty p { color: var(--text-muted); font-size: 0.9rem; }

    /* Booking Card */
    .bookings-list { display: flex; flex-direction: column; gap: 1.25rem; }
    .booking-card {
      background: var(--bg-elevated);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 1.5rem;
      transition: border-color 0.2s, box-shadow 0.2s;
      box-shadow: var(--shadow-soft);
    }
    .booking-card:hover { border-color: var(--brand-gold-soft); box-shadow: var(--shadow-pop); }

    .booking-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .booking-type-badge {
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.3rem 0.75rem;
      border-radius: 999px;
    }
    .type-rent { background: rgba(59, 130, 246, 0.1); color: #2563eb; border: 1px solid rgba(59, 130, 246, 0.2); }
    .type-sale { background: rgba(139, 105, 20, 0.1); color: var(--brand-gold-dark); border: 1px solid rgba(139, 105, 20, 0.2); }

    .booking-status-badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.7rem;
      border-radius: 999px;
    }
    .status-pending  { background: rgba(251,191,36,0.12); color: #d97706; border: 1px solid rgba(251,191,36,0.3); }
    .status-approved { background: rgba(74,222,128,0.12); color: #16a34a; border: 1px solid rgba(74,222,128,0.3); }
    .status-rejected { background: rgba(239,68,68,0.12);  color: #dc2626; border: 1px solid rgba(239,68,68,0.3); }
    .status-cancelled{ background: rgba(156,163,175,0.12);color: #6b7280; border: 1px solid rgba(156,163,175,0.3); }
    .status-completed{ background: rgba(139,92,246,0.12); color: #7c3aed; border: 1px solid rgba(139,92,246,0.3); }

    /* Property */
    .booking-property {
      display: flex;
      gap: 1rem;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-color);
    }
    .property-thumb {
      width: 64px; height: 64px;
      border-radius: 10px;
      overflow: hidden;
      flex-shrink: 0;
      border: 1px solid var(--border-color);
    }
    .property-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .property-title { font-weight: 600; color: var(--text-main); margin: 0 0 0.25rem; font-size: 1rem; letter-spacing: -0.01em; }
    .property-location { color: var(--text-muted); font-size: 0.85rem; margin: 0; }

    /* Buyer */
    .buyer-info {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 1rem;
    }
    .buyer-avatar {
      width: 40px; height: 40px;
      border-radius: 50%;
      background: var(--bg-deep);
      border: 1px solid var(--border-color);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700;
      color: var(--text-main);
      font-size: 0.9rem;
      overflow: hidden;
      flex-shrink: 0;
    }
    .buyer-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .buyer-name { font-weight: 600; color: var(--text-main); font-size: 0.95rem; margin: 0 0 0.2rem; }
    .buyer-email { color: var(--text-muted); font-size: 0.85rem; margin: 0; }

    /* Details */
    .booking-details {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .detail-item { display: flex; flex-direction: column; gap: 0.25rem; }
    .detail-label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
    .detail-value { font-size: 0.9rem; font-weight: 600; color: var(--text-main); }
    .detail-value.amount { color: var(--brand-gold-dark); font-weight: 700; }
    .detail-value.offer-price { color: #16a34a; font-weight: 700; }
    .pay-not_initiated { color: #6b7280; }
    .pay-pending  { color: #d97706; }
    .pay-paid     { color: #16a34a; }
    .pay-refunded { color: #7c3aed; }

    /* Notes */
    .booking-notes {
      background: var(--bg-deep);
      border-left: 3px solid var(--brand-gold);
      padding: 0.75rem 1rem;
      border-radius: 0 8px 8px 0;
      margin-bottom: 1.25rem;
      font-size: 0.875rem;
      border-top: 1px solid var(--border-color);
      border-right: 1px solid var(--border-color);
      border-bottom: 1px solid var(--border-color);
    }
    .notes-label { font-weight: 600; color: var(--brand-gold-dark); margin-bottom: 0.25rem; display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .booking-notes p { color: var(--text-muted); margin: 0; font-style: italic; }

    /* Actions */
    .booking-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
    .btn-approve {
      padding: 0.65rem 2rem;
      border-radius: 12px;
      border: none;
      background: #16a34a;
      color: #fff;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
      display: flex; align-items: center; gap: 0.5rem;
      box-shadow: 0 4px 12px rgba(22, 163, 74, 0.2);
    }
    .btn-approve:hover { background: #15803d; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(22, 163, 74, 0.3); }
    .btn-approve:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

    .btn-reject {
      padding: 0.65rem 2rem;
      border-radius: 12px;
      border: 1px solid rgba(239, 68, 68, 0.4);
      background: transparent;
      color: #dc2626;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
      display: flex; align-items: center; gap: 0.5rem;
    }
    .btn-reject:hover { background: rgba(239, 68, 68, 0.08); border-color: #dc2626; transform: translateY(-2px); }
    .btn-reject:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

    /* Notices */
    .booking-approved-notice, .booking-paid-notice {
      font-size: 0.85rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      display: flex; align-items: center; gap: 0.5rem;
      font-weight: 500;
    }
    .booking-approved-notice { background: rgba(251,191,36,0.1); color: #d97706; border: 1px solid rgba(251,191,36,0.2); }
    .booking-paid-notice     { background: rgba(74,222,128,0.1); color: #16a34a; border: 1px solid rgba(74,222,128,0.2); }
    .notice-icon { font-size: 1.1rem; }

    .booking-date { font-size: 0.8rem; color: var(--text-muted); margin: 0; }

    /* Pagination */
    .pagination { display: flex; align-items: center; gap: 1rem; justify-content: center; margin-top: 2rem; }
    .page-btn {
      padding: 0.5rem 1.25rem;
      border-radius: 999px;
      border: 1px solid var(--border-color);
      background: transparent;
      color: var(--text-muted);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .page-btn:hover:not(:disabled) { border-color: var(--brand-gold); color: var(--brand-gold); background: color-mix(in srgb, var(--brand-gold) 5%, transparent); }
    .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .page-info { color: var(--text-muted); font-size: 0.9rem; font-weight: 500; }

    /* Spinner */
    .spinner-xs {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Dialogs */
    .dialog-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      padding: 1rem;
    }
    .dialog-box {
      background: var(--bg-elevated);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 2rem;
      width: 100%;
      max-width: 420px;
      box-shadow: var(--shadow-pop);
    }
    .dialog-box h3 { font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin: 0 0 0.5rem; letter-spacing: -0.01em; }
    .dialog-box p { color: var(--text-muted); font-size: 0.9rem; margin: 0 0 1.25rem; }
    .reject-reason-input {
      width: 100%;
      padding: 0.875rem;
      border-radius: 10px;
      border: 1px solid var(--border-color);
      background: var(--bg-input);
      color: var(--text-main);
      font-family: inherit;
      font-size: 0.9rem;
      resize: none;
      margin-bottom: 1.25rem;
      box-sizing: border-box;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .reject-reason-input:focus { outline: none; border-color: var(--brand-gold); box-shadow: 0 0 0 3px var(--brand-gold-soft); }
    .dialog-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
    .btn-ghost {
      padding: 0.5rem 1.25rem;
      border-radius: 999px;
      border: 1px solid var(--border-color);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }
    .btn-ghost:hover { background: color-mix(in srgb, var(--text-main) 5%, transparent); color: var(--text-main); }
    .btn-danger {
      padding: 0.6rem 1.5rem;
      border-radius: 999px;
      border: none;
      background: #ef4444;
      color: #fff;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      display: flex; align-items: center; gap: 0.5rem;
      transition: background 0.2s;
    }
    .btn-danger:hover { background: #dc2626; }
    .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class UserOwnerBookingsComponent implements OnInit {
  private svc  = inject(UserDashboardService);
  private notif = inject(NotificationService);
  private router = inject(Router);

  bookings: any[] = [];
  isLoading = true;
  errorMsg  = '';
  loadingMap: Record<string, boolean> = {};
  currentPage  = 1;
  totalPages   = 1;


  // Filters
  activeFilter = 'all';
  filters = [
    { label: 'All',       key: 'all' },
    { label: 'Pending',   key: 'pending' },
    { label: 'Approved',  key: 'approved' },
    { label: 'Completed', key: 'completed' },
    { label: 'Rejected',  key: 'rejected' },
  ];

  // Reject dialog
  rejectDialogBooking: any = null;
  rejectReason = '';
  isRejecting  = false;

  // Cancel dialog
  cancelDialogBooking: any = null;
  cancelReason = '';
  isCancelling = false;

  get filteredBookings(): any[] {
    if (this.activeFilter === 'all') return this.bookings;
    return this.bookings.filter(b => b.status === this.activeFilter);
  }

  get pendingCount(): number {
    return this.bookings.filter(b => b.status === 'pending').length;
  }

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.isLoading = true;
    this.errorMsg  = '';
    this.svc.getOwnerBookings(this.currentPage).subscribe({
      next: (data: any) => {
        this.bookings    = data.bookings ?? data ?? [];
        this.totalPages  = data.pages ?? 1;
        this.currentPage = data.page  ?? 1;
        this.isLoading   = false;
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.message || 'Failed to load booking requests.';
        this.isLoading = false;
      }
    });
  }

  setFilter(key: string): void {
    this.activeFilter = key;
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadBookings();
  }

  approve(bookingId: string): void {
    if (this.loadingMap[bookingId]) return;
    this.loadingMap[bookingId] = true;
    this.svc.approveBooking(bookingId).subscribe({
      next: () => {
        this.notif.show('✅ Booking approved successfully!', 'success');
        // Instant sync
        this.bookings = this.bookings.map(b => b._id === bookingId ? { ...b, status: 'approved' } : b);
        this.loadingMap[bookingId] = false;
      },
      error: (err: any) => {
        this.notif.show(err?.error?.message || 'Failed to approve booking.', 'error');
        this.loadingMap[bookingId] = false;
      }
    });
  }

  openRejectDialog(booking: any): void {
    this.rejectDialogBooking = booking;
    this.rejectReason = '';
  }

  closeRejectDialog(): void {
    this.rejectDialogBooking = null;
    this.rejectReason = '';
  }

  confirmReject(): void {
    if (!this.rejectDialogBooking) return;
    const id = this.rejectDialogBooking._id;
    this.isRejecting = true;
    this.svc.rejectBooking(id, this.rejectReason).subscribe({
      next: () => {
        this.notif.show('❌ Booking request declined.', 'info');
        // Instant sync
        this.bookings = this.bookings.map(b => b._id === id ? { ...b, status: 'rejected' } : b);
        this.closeRejectDialog();
        this.isRejecting = false;
      },
      error: (err: any) => {
        this.notif.show(err?.error?.message || 'Failed to decline booking.', 'error');
        this.isRejecting = false;
      }
    });
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

    this.svc.cancelBooking(id, this.cancelReason).subscribe({
      next: () => {
        this.notif.show('Booking cancelled successfully.', 'success');
        this.bookings = this.bookings.map(b => b._id === id ? { ...b, status: 'cancelled' } : b);
        this.closeCancelDialog();
        this.isCancelling = false;
      },
      error: (err: any) => {
        this.notif.show(err?.error?.message || 'Failed to cancel booking.', 'error');
        this.isCancelling = false;
      }
    });
  }

  trackById(_i: number, item: any): string { return item._id; }
}
