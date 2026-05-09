import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserDashboardService } from './user-dashboard.service';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-user-viewing-requests',
  template: `
    <div class="vr-wrapper">
      <div class="page-header">
        <div class="section-eyebrow">Schedule</div>
        <h1>My Viewing Requests</h1>
        <p>Track your property viewing appointments and their status.</p>
      </div>
      <div class="panel-card">
        <div *ngIf="isLoading" class="vr-loading">
          <div class="skeleton" *ngFor="let i of [1,2,3]"></div>
        </div>
        <div *ngIf="errorMsg && !isLoading" class="vr-error">
          <span class="error-icon">&#9888;&#65039;</span>
          <p>{{ errorMsg }}</p>
          <button class="btn-ghost" (click)="load()">Retry</button>
        </div>
        <div *ngIf="!isLoading && !errorMsg && requests.length === 0" class="vr-empty">
          <div class="empty-icon">&#128065;&#65039;</div>
          <h3>No viewing requests yet</h3>
          <p>Request a viewing on any property to get started.</p>
          <a routerLink="/properties" class="btn-browse">Browse Properties</a>
        </div>
        <div *ngIf="!isLoading && !errorMsg && requests.length > 0" class="vr-list">
          <div class="vr-card" *ngFor="let r of requests; trackBy: trackById">
            <div class="vr-card-header">
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
            <div class="vr-details">
              <div class="detail-item" *ngIf="r.preferredDate">
                <span class="detail-label">Preferred Date</span>
                <span class="detail-value">{{ r.preferredDate | date:'dd MMM yyyy' }}</span>
              </div>
              <div class="detail-item" *ngIf="r.preferredTime">
                <span class="detail-label">Preferred Time</span>
                <span class="detail-value">{{ r.preferredTime }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Owner</span>
                <span class="detail-value">{{ r.owner?.name || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Submitted</span>
                <span class="detail-value">{{ r.createdAt | date:'dd MMM yyyy' }}</span>
              </div>
            </div>
            <div class="vr-message" *ngIf="r.message">
              <span class="msg-label">Your Note:</span>
              <p>"{{ r.message }}"</p>
            </div>
            <div class="vr-actions" *ngIf="r.status === 'pending'">
              <button class="btn-cancel" [disabled]="loadingMap[r._id]" (click)="cancel(r._id)">
                <span *ngIf="loadingMap[r._id]" class="spinner-xs"></span>
                Cancel Request
              </button>
            </div>
            <div class="vr-notice approved" *ngIf="r.status === 'approved'">
              Approved — your viewing has been confirmed by the owner.
            </div>
            <div class="vr-notice rejected" *ngIf="r.status === 'rejected'">
              Declined — the owner could not accommodate this request.
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .vr-wrapper { max-width: 860px; }
    .page-header { margin-bottom: 2rem; }
    .section-eyebrow { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #c9a96e; margin-bottom: 0.5rem; }
    .page-header h1 { font-size: 1.75rem; font-weight: 700; color: var(--color-text-primary, #fff); margin: 0 0 0.5rem; }
    .page-header p { color: var(--color-text-muted, #aaa); font-size: 0.9rem; margin: 0; }
    .panel-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 1.5rem; }
    .vr-loading { display: flex; flex-direction: column; gap: 1rem; }
    .skeleton { height: 140px; border-radius: 16px; background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    .vr-error { text-align: center; padding: 3rem; color: #f87171; }
    .error-icon { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
    .btn-ghost { padding: 0.45rem 1.2rem; border-radius: 999px; border: 1px solid rgba(255,255,255,0.15); background: transparent; color: #aaa; cursor: pointer; font-size: 0.875rem; margin-top: 0.75rem; }
    .vr-empty { text-align: center; padding: 3.5rem 2rem; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; display: block; }
    .vr-empty h3 { color: var(--color-text-primary,#fff); font-size: 1.1rem; margin: 0 0 0.5rem; }
    .vr-empty p { color: var(--color-text-muted,#aaa); font-size: 0.875rem; margin: 0 0 1.5rem; }
    .btn-browse { display: inline-block; padding: 0.6rem 1.5rem; border-radius: 999px; background: linear-gradient(135deg, #c9a96e, #e8c992); color: #111; font-weight: 600; font-size: 0.875rem; text-decoration: none; }
    .vr-list { display: flex; flex-direction: column; gap: 1.25rem; }
    .vr-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.25rem; transition: border-color 0.2s; }
    .vr-card:hover { border-color: rgba(201,169,110,0.3); }
    .vr-card-header { display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
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
    .vr-details { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
    .detail-item { display: flex; flex-direction: column; gap: 0.2rem; }
    .detail-label { font-size: 0.72rem; color: var(--color-text-muted,#aaa); text-transform: uppercase; letter-spacing: 0.05em; }
    .detail-value { font-size: 0.88rem; font-weight: 600; color: var(--color-text-primary,#fff); }
    .vr-message { background: rgba(255,255,255,0.03); border-left: 3px solid rgba(201,169,110,0.4); padding: 0.65rem 1rem; border-radius: 0 8px 8px 0; margin-bottom: 1rem; font-size: 0.875rem; }
    .msg-label { font-weight: 600; color: #c9a96e; display: block; margin-bottom: 0.2rem; font-size: 0.75rem; }
    .vr-message p { color: var(--color-text-muted,#aaa); margin: 0; font-style: italic; }
    .vr-actions { display: flex; gap: 0.75rem; margin-bottom: 0.5rem; }
    .btn-cancel { padding: 0.45rem 1.25rem; border-radius: 999px; border: 1px solid rgba(239,68,68,0.35); background: rgba(239,68,68,0.08); color: #ef4444; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem; }
    .btn-cancel:hover { background: rgba(239,68,68,0.15); }
    .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
    .vr-notice { font-size: 0.8rem; padding: 0.5rem 0.75rem; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem; }
    .vr-notice.approved { background: rgba(74,222,128,0.08); color: #4ade80; }
    .vr-notice.rejected { background: rgba(239,68,68,0.08); color: #ef4444; }
    .spinner-xs { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.3); border-top-color: currentColor; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class UserViewingRequestsComponent implements OnInit, OnDestroy {
  requests: any[] = [];
  isLoading = true;
  errorMsg = '';
  // Per-item loading map — prevents double-click spam on any single request
  loadingMap: Record<string, boolean> = {};
  private destroy$ = new Subject<void>();

  constructor(
    private svc: UserDashboardService,
    private notif: NotificationService
  ) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.isLoading = true;
    this.errorMsg = '';
    this.svc.getMyViewingRequests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.requests = data; this.isLoading = false; },
        error: (err) => {
          this.errorMsg = err?.error?.message || 'Failed to load viewing requests.';
          this.isLoading = false;
        }
      });
  }

  cancel(id: string): void {
    // Guard: prevent double-click on same item
    if (this.loadingMap[id]) return;
    this.loadingMap = { ...this.loadingMap, [id]: true };
    this.svc.cancelViewingRequest(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notif.show('Viewing request cancelled.', 'info');
          // ✅ Instant state sync — no full reload, no flicker
          this.requests = this.requests.map(r =>
            r._id === id ? { ...r, status: 'cancelled' } : r
          );
          this.loadingMap = { ...this.loadingMap, [id]: false };
        },
        error: (err) => {
          this.notif.show(err?.error?.message || 'Failed to cancel request.', 'error');
          this.loadingMap = { ...this.loadingMap, [id]: false };
        }
      });
  }

  trackById(_i: number, item: any): string { return item._id; }
}
