import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserDashboardService } from './user-dashboard.service';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-user-owner-viewing-requests',
  template: `
    <div class="ovr-wrapper">
      <div class="section-header">
        <div>
          <h2 class="section-title">Incoming Viewing Requests</h2>
          <p class="section-sub">Review and respond to property viewing requests from buyers.</p>
        </div>
        <div class="filter-tabs">
          <button *ngFor="let f of filters"
            class="filter-tab" [class.active]="activeFilter === f.key"
            (click)="setFilter(f.key)">
            {{ f.label }}
            <span class="badge" *ngIf="f.key === 'pending' && pendingCount > 0">{{ pendingCount }}</span>
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading" class="ovr-loading">
        <div class="skeleton" *ngFor="let i of [1,2,3]"></div>
      </div>

      <!-- Error -->
      <div *ngIf="errorMsg && !isLoading" class="ovr-error">
        <p>{{ errorMsg }}</p>
        <button class="btn-ghost" (click)="load()">Retry</button>
      </div>

      <!-- Empty -->
      <div *ngIf="!isLoading && !errorMsg && filteredRequests.length === 0" class="ovr-empty">
        <div class="empty-icon">&#128065;&#65039;</div>
        <h3>No {{ activeFilter === 'all' ? '' : activeFilter }} requests</h3>
        <p>When buyers request to view your properties, they will appear here.</p>
      </div>

      <!-- List -->
      <div *ngIf="!isLoading && !errorMsg && filteredRequests.length > 0" class="ovr-list">
        <div class="ovr-card" *ngFor="let r of filteredRequests; trackBy: trackById">

          <div class="ovr-card-header">
            <div class="prop-thumb" *ngIf="r.property?.images?.length">
              <img [src]="r.property.images[0]" [alt]="r.property.title" />
            </div>
            <div class="prop-thumb placeholder" *ngIf="!r.property?.images?.length">&#127968;</div>
            <div class="prop-info">
              <h3 class="prop-title">{{ r.property?.title || 'Property' }}</h3>
              <p class="prop-location">&#128205; {{ r.property?.location?.city || 'N/A' }}</p>
            </div>
            <div class="status-badge" [class]="'status-' + r.status">
              <span class="status-dot"></span>{{ r.status | titlecase }}
            </div>
          </div>

          <!-- Requester info -->
          <div class="requester-info">
            <div class="requester-avatar">
              <img *ngIf="r.requester?.photo" [src]="r.requester.photo" [alt]="r.requester.name" />
              <span *ngIf="!r.requester?.photo">{{ r.requester?.name?.charAt(0) | uppercase }}</span>
            </div>
            <div>
              <p class="requester-name">{{ r.requester?.name || 'Buyer' }}</p>
              <p class="requester-email">{{ r.requester?.email }}</p>
            </div>
          </div>

          <!-- Details -->
          <div class="ovr-details">
            <div class="detail-item" *ngIf="r.preferredDate">
              <span class="detail-label">Preferred Date</span>
              <span class="detail-value">{{ r.preferredDate | date:'dd MMM yyyy' }}</span>
            </div>
            <div class="detail-item" *ngIf="r.preferredTime">
              <span class="detail-label">Preferred Time</span>
              <span class="detail-value">{{ r.preferredTime }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Requested On</span>
              <span class="detail-value">{{ r.createdAt | date:'dd MMM yyyy' }}</span>
            </div>
          </div>

          <!-- Note -->
          <div class="ovr-message" *ngIf="r.message">
            <span class="msg-label">Buyer Note:</span>
            <p>"{{ r.message }}"</p>
          </div>

          <!-- Actions (pending only) -->
          <div class="ovr-actions" *ngIf="r.status === 'pending'">
            <button class="btn-approve"
              [disabled]="loadingMap[r._id]"
              (click)="approve(r._id)">
              <span *ngIf="loadingMap[r._id]" class="spinner-xs"></span>
              Approve
            </button>
            <button class="btn-reject"
              [disabled]="loadingMap[r._id]"
              (click)="openRejectDialog(r)">
              Decline
            </button>
          </div>

          <!-- Approved notice -->
          <div class="ovr-notice approved" *ngIf="r.status === 'approved'">
            Approved — buyer has been notified.
          </div>

          <!-- Rejected notice -->
          <div class="ovr-notice rejected" *ngIf="r.status === 'rejected'">
            Declined — buyer has been notified.
          </div>

        </div>
      </div>
    </div>

    <!-- Reject Dialog -->
    <div class="dialog-overlay" *ngIf="rejectTarget" (click)="closeRejectDialog()">
      <div class="dialog-box" (click)="$event.stopPropagation()">
        <h3>Decline Viewing Request</h3>
        <p>Provide a reason for declining (optional — sent to the buyer).</p>
        <textarea class="reject-input" rows="3" placeholder="e.g. Already booked for that date..."
          [(ngModel)]="rejectReason"></textarea>
        <div class="dialog-actions">
          <button class="btn-ghost" (click)="closeRejectDialog()">Cancel</button>
          <button class="btn-danger" (click)="confirmReject()" [disabled]="isRejecting">
            <span *ngIf="isRejecting" class="spinner-xs"></span>
            Confirm Decline
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ovr-wrapper { max-width: 960px; }
    .section-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem; }
    .section-title { font-size: 1.5rem; font-weight: 700; color: var(--color-text-primary, #fff); margin: 0 0 0.25rem; }
    .section-sub { color: var(--color-text-muted, #aaa); font-size: 0.875rem; margin: 0; }
    .filter-tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .filter-tab { padding: 0.45rem 1rem; border-radius: 999px; border: 1px solid rgba(255,255,255,0.12); background: transparent; color: var(--color-text-muted, #aaa); font-size: 0.8rem; cursor: pointer; transition: all 0.2s; position: relative; }
    .filter-tab.active, .filter-tab:hover { background: linear-gradient(135deg, #c9a96e, #e8c992); color: #111; border-color: transparent; font-weight: 600; }
    .badge { position: absolute; top: -6px; right: -6px; background: #ef4444; color: #fff; font-size: 0.7rem; font-weight: 700; border-radius: 999px; padding: 2px 6px; min-width: 18px; text-align: center; }
    .ovr-loading { display: flex; flex-direction: column; gap: 1rem; }
    .skeleton { height: 160px; border-radius: 16px; background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    .ovr-error { text-align: center; padding: 3rem; color: #f87171; }
    .btn-ghost { padding: 0.45rem 1.2rem; border-radius: 999px; border: 1px solid rgba(255,255,255,0.15); background: transparent; color: #aaa; cursor: pointer; font-size: 0.875rem; }
    .ovr-empty { text-align: center; padding: 3.5rem 2rem; background: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; display: block; }
    .ovr-empty h3 { color: var(--color-text-primary,#fff); margin: 0 0 0.5rem; }
    .ovr-empty p { color: var(--color-text-muted,#aaa); font-size: 0.875rem; }
    .ovr-list { display: flex; flex-direction: column; gap: 1.25rem; }
    .ovr-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.5rem; transition: border-color 0.2s; }
    .ovr-card:hover { border-color: rgba(201,169,110,0.3); }
    .ovr-card-header { display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .prop-thumb { width: 60px; height: 60px; border-radius: 10px; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.06); font-size: 1.5rem; }
    .prop-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .prop-info { flex: 1; min-width: 0; }
    .prop-title { font-weight: 600; color: var(--color-text-primary,#fff); font-size: 0.95rem; margin: 0 0 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .prop-location { color: var(--color-text-muted,#aaa); font-size: 0.8rem; margin: 0; }
    .status-badge { flex-shrink: 0; padding: 0.25rem 0.8rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.03em; display: inline-flex; align-items: center; gap: 5px; }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
    .status-pending   { background: rgba(251,191,36,0.12);  color: #fbbf24; border: 1px solid rgba(251,191,36,0.25); }
    .status-approved  { background: rgba(74,222,128,0.12);  color: #4ade80; border: 1px solid rgba(74,222,128,0.25); }
    .status-rejected  { background: rgba(239,68,68,0.12);   color: #ef4444; border: 1px solid rgba(239,68,68,0.25); }
    .status-cancelled { background: rgba(156,163,175,0.12); color: #9ca3af; border: 1px solid rgba(156,163,175,0.25); }
    .requester-info { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1rem; }
    .requester-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #c9a96e, #e8c992); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #111; font-size: 0.9rem; overflow: hidden; flex-shrink: 0; }
    .requester-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .requester-name { font-weight: 600; color: var(--color-text-primary,#fff); font-size: 0.9rem; margin: 0 0 0.2rem; }
    .requester-email { color: var(--color-text-muted,#aaa); font-size: 0.8rem; margin: 0; }
    .ovr-details { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
    .detail-item { display: flex; flex-direction: column; gap: 0.2rem; }
    .detail-label { font-size: 0.72rem; color: var(--color-text-muted,#aaa); text-transform: uppercase; letter-spacing: 0.05em; }
    .detail-value { font-size: 0.88rem; font-weight: 600; color: var(--color-text-primary,#fff); }
    .ovr-message { background: rgba(255,255,255,0.03); border-left: 3px solid rgba(201,169,110,0.4); padding: 0.65rem 1rem; border-radius: 0 8px 8px 0; margin-bottom: 1rem; font-size: 0.875rem; }
    .msg-label { font-weight: 600; color: #c9a96e; display: block; margin-bottom: 0.2rem; font-size: 0.75rem; }
    .ovr-message p { color: var(--color-text-muted,#aaa); margin: 0; font-style: italic; }
    .ovr-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
    .btn-approve { padding: 0.55rem 1.5rem; border-radius: 999px; border: none; background: linear-gradient(135deg, #4ade80, #22c55e); color: #fff; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: opacity 0.2s; display: flex; align-items: center; gap: 0.5rem; }
    .btn-approve:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-reject { padding: 0.55rem 1.5rem; border-radius: 999px; border: 1px solid rgba(239,68,68,0.4); background: rgba(239,68,68,0.08); color: #ef4444; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
    .btn-reject:hover { background: rgba(239,68,68,0.15); }
    .btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }
    .ovr-notice { font-size: 0.8rem; padding: 0.5rem 0.75rem; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem; }
    .ovr-notice.approved { background: rgba(74,222,128,0.08); color: #4ade80; }
    .ovr-notice.rejected { background: rgba(239,68,68,0.08); color: #ef4444; }
    .spinner-xs { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.3); border-top-color: currentColor; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .dialog-box { background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 2rem; width: 100%; max-width: 420px; }
    .dialog-box h3 { font-size: 1.2rem; font-weight: 700; color: #fff; margin: 0 0 0.5rem; }
    .dialog-box p { color: #aaa; font-size: 0.875rem; margin: 0 0 1rem; }
    .reject-input { width: 100%; padding: 0.75rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #fff; font-family: inherit; font-size: 0.875rem; resize: none; margin-bottom: 1rem; box-sizing: border-box; }
    .reject-input:focus { outline: none; border-color: rgba(201,169,110,0.5); }
    .dialog-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
    .btn-danger { padding: 0.5rem 1.25rem; border-radius: 999px; border: none; background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; font-weight: 600; font-size: 0.875rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; }
    .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class UserOwnerViewingRequestsComponent implements OnInit, OnDestroy {
  requests: any[] = [];
  isLoading = true;
  errorMsg = '';
  // Per-item loading map — each card locks independently, no global block
  loadingMap: Record<string, boolean> = {};
  activeFilter = 'all';
  filters = [
    { label: 'All', key: 'all' },
    { label: 'Pending', key: 'pending' },
    { label: 'Approved', key: 'approved' },
    { label: 'Declined', key: 'rejected' },
  ];
  rejectTarget: any = null;
  rejectReason = '';
  isRejecting = false;
  private destroy$ = new Subject<void>();

  constructor(
    private svc: UserDashboardService,
    private notif: NotificationService
  ) {}

  get filteredRequests(): any[] {
    if (this.activeFilter === 'all') return this.requests;
    return this.requests.filter(r => r.status === this.activeFilter);
  }

  get pendingCount(): number {
    return this.requests.filter(r => r.status === 'pending').length;
  }

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  setFilter(key: string): void { this.activeFilter = key; }

  load(): void {
    this.isLoading = true;
    this.errorMsg = '';
    this.svc.getOwnerViewingRequests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.requests = data; this.isLoading = false; },
        error: (err) => {
          this.errorMsg = err?.error?.message || 'Failed to load viewing requests.';
          this.isLoading = false;
        }
      });
  }

  approve(id: string): void {
    if (this.loadingMap[id]) return;
    this.loadingMap = { ...this.loadingMap, [id]: true };
    this.svc.approveViewingRequest(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notif.show('Viewing request approved!', 'success');
          // ✅ Instant state sync — tab count updates automatically via filteredRequests getter
          this.requests = this.requests.map(r =>
            r._id === id ? { ...r, status: 'approved' } : r
          );
          this.loadingMap = { ...this.loadingMap, [id]: false };
        },
        error: (err) => {
          this.notif.show(err?.error?.message || 'Failed to approve.', 'error');
          this.loadingMap = { ...this.loadingMap, [id]: false };
        }
      });
  }

  openRejectDialog(r: any): void { this.rejectTarget = r; this.rejectReason = ''; }
  closeRejectDialog(): void { this.rejectTarget = null; this.rejectReason = ''; }

  confirmReject(): void {
    if (!this.rejectTarget) return;
    const id = this.rejectTarget._id;
    this.isRejecting = true;
    this.svc.rejectViewingRequest(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notif.show('Viewing request declined.', 'info');
          // ✅ Instant state sync — no reload, no flicker
          this.requests = this.requests.map(r =>
            r._id === id ? { ...r, status: 'rejected' } : r
          );
          this.closeRejectDialog();
          this.isRejecting = false;
        },
        error: (err) => {
          this.notif.show(err?.error?.message || 'Failed to decline.', 'error');
          this.isRejecting = false;
        }
      });
  }

  trackById(_i: number, item: any): string { return item._id; }
}
