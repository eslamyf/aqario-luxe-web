import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserDashboardService } from './user-dashboard.service';
import { NotificationService } from '../../shared/services/notification.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-user-viewing-requests',
  template: `
    <div class="vr-wrapper">
      <div class="page-header">
        <div class="section-eyebrow">{{ 'DASHBOARD.SCHEDULE' | translate }}</div>
        <h1>{{ 'DASHBOARD.MY_VIEWING_REQUESTS' | translate }}</h1>
        <p>{{ 'DASHBOARD.MY_VIEWING_REQUESTS_SUB' | translate }}</p>
      </div>
      <div class="panel-card">
        <div *ngIf="isLoading" class="vr-loading">
          <div class="skeleton" *ngFor="let i of [1,2,3]"></div>
        </div>
        <div *ngIf="errorMsg && !isLoading" class="vr-error">
          <span class="error-icon">&#9888;&#65039;</span>
          <p>{{ errorMsg }}</p>
          <button class="btn-ghost" (click)="load()">{{ 'DASHBOARD.RETRY' | translate }}</button>
        </div>
        <div *ngIf="!isLoading && !errorMsg && requests.length === 0" class="vr-empty">
          <div class="empty-icon">&#128065;&#65039;</div>
          <h3>{{ 'DASHBOARD.NO_VR' | translate }}</h3>
          <p>{{ 'DASHBOARD.NO_VR_SUB' | translate }}</p>
          <a routerLink="/properties" class="btn-browse">{{ 'DASHBOARD.BROWSE_PROPERTIES' | translate }}</a>
        </div>
        <div *ngIf="!isLoading && !errorMsg && requests.length > 0" class="vr-list">
          <div class="vr-card" *ngFor="let r of requests; trackBy: trackById">
            <div class="vr-card-header">
              <div class="prop-thumb" *ngIf="r.property?.images?.length">
                <img [src]="r.property.images[0]" [alt]="r.property.title" />
              </div>
              <div class="prop-thumb placeholder" *ngIf="!r.property?.images?.length">&#127968;</div>
              <div class="prop-info">
                <h3 class="prop-title">{{ (r.property?.title || ('DASHBOARD.TABLE.PROPERTY' | translate)) | translateProp }}</h3>
                <p class="prop-location">&#128205; {{ (r.property?.location?.city || 'N/A') | translateProp }}</p>
              </div>
              <div class="status-badge" [class]="'status-' + r.status">
                <span class="status-dot"></span>{{ 'DASHBOARD.FILTER_' + r.status.toUpperCase() | translate }}
              </div>
            </div>
            <div class="vr-details">
              <div class="detail-item" *ngIf="r.preferredDate">
                <span class="detail-label">{{ 'DASHBOARD.PREFERRED_DATE' | translate }}</span>
                <span class="detail-value">{{ r.preferredDate | date:'dd MMM yyyy' }}</span>
              </div>
              <div class="detail-item" *ngIf="r.preferredTime">
                <span class="detail-label">{{ 'DASHBOARD.PREFERRED_TIME' | translate }}</span>
                <span class="detail-value">{{ r.preferredTime }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ 'DASHBOARD.OWNER' | translate }}</span>
                <span class="detail-value">{{ r.owner?.name || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ 'DASHBOARD.SUBMITTED_DATE' | translate }}</span>
                <span class="detail-value">{{ r.createdAt | date:'dd MMM yyyy' }}</span>
              </div>
            </div>
            <div class="vr-message" *ngIf="r.message">
              <span class="msg-label">{{ 'DASHBOARD.YOUR_NOTE' | translate }}</span>
              <p>"{{ r.message }}"</p>
            </div>
            <div class="vr-actions" *ngIf="r.status === 'pending'">
              <button class="btn-cancel" [disabled]="loadingMap[r._id]" (click)="cancel(r._id)">
                <span *ngIf="loadingMap[r._id]" class="spinner-xs"></span>
                {{ 'DASHBOARD.CANCEL_REQUEST' | translate }}
              </button>
            </div>
            <div class="vr-notice approved" *ngIf="r.status === 'approved'">
              {{ 'DASHBOARD.VR_APPROVED' | translate }}
            </div>
            <div class="vr-notice rejected" *ngIf="r.status === 'rejected'">
              {{ 'DASHBOARD.VR_REJECTED' | translate }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .vr-wrapper { max-width: 860px; }
    .page-header { margin-bottom: 2rem; }
    .section-eyebrow { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--brand-gold); margin-bottom: 0.5rem; }
    .page-header h1 { font-size: 1.75rem; font-weight: 700; color: var(--text-main); margin: 0 0 0.5rem; letter-spacing: -0.02em; }
    .page-header p { color: var(--text-muted); font-size: 0.95rem; margin: 0; }
    .panel-card { background: var(--bg-elevated); border: 1px solid var(--border-color); border-radius: 20px; padding: 2rem; box-shadow: var(--shadow-soft); }
    .vr-loading { display: flex; flex-direction: column; gap: 1rem; }
    .skeleton { height: 140px; border-radius: 16px; background: linear-gradient(90deg, color-mix(in srgb, var(--text-main) 4%, transparent) 25%, color-mix(in srgb, var(--text-main) 8%, transparent) 50%, color-mix(in srgb, var(--text-main) 4%, transparent) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    .vr-error { text-align: center; padding: 3rem; color: #ef4444; }
    .error-icon { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
    .btn-ghost { padding: 0.5rem 1.25rem; border-radius: 999px; border: 1px solid var(--border-color); background: transparent; color: var(--text-muted); cursor: pointer; font-size: 0.875rem; margin-top: 0.75rem; transition: all 0.2s; }
    .btn-ghost:hover { background: color-mix(in srgb, var(--text-main) 5%, transparent); color: var(--text-main); }
    .vr-empty { text-align: center; padding: 3.5rem 2rem; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; display: block; }
    .vr-empty h3 { color: var(--text-main); font-size: 1.1rem; margin: 0 0 0.5rem; }
    .vr-empty p { color: var(--text-muted); font-size: 0.875rem; margin: 0 0 1.5rem; }
    .btn-browse { display: inline-block; padding: 0.6rem 1.5rem; border-radius: 999px; background: var(--brand-gold); color: #fff; font-weight: 600; font-size: 0.875rem; text-decoration: none; transition: all 0.2s; border: 1px solid var(--brand-gold); }
    .btn-browse:hover { background: var(--brand-gold-dark); border-color: var(--brand-gold-dark); box-shadow: var(--shadow-pop); }
    .vr-list { display: flex; flex-direction: column; gap: 1.25rem; }
    .vr-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem; transition: border-color 0.2s, box-shadow 0.2s; }
    .vr-card:hover { border-color: var(--brand-gold-soft); box-shadow: var(--shadow-pop); }
    .vr-card-header { display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); }
    .prop-thumb { width: 60px; height: 60px; border-radius: 10px; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--text-main) 5%, transparent); font-size: 1.5rem; border: 1px solid var(--border-color); }
    .prop-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .prop-info { flex: 1; min-width: 0; }
    .prop-title { font-weight: 600; color: var(--text-main); font-size: 1rem; margin: 0 0 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.01em; }
    .prop-location { color: var(--text-muted); font-size: 0.85rem; margin: 0; }
    .status-badge { flex-shrink: 0; padding: 0.25rem 0.8rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.03em; display: inline-flex; align-items: center; gap: 6px; }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
    .status-pending   { background: rgba(251,191,36,0.12);  color: #d97706; border: 1px solid rgba(251,191,36,0.3); }
    .status-approved  { background: rgba(74,222,128,0.12);  color: #16a34a; border: 1px solid rgba(74,222,128,0.3); }
    .status-rejected  { background: rgba(239,68,68,0.12);   color: #dc2626; border: 1px solid rgba(239,68,68,0.3); }
    .status-cancelled { background: rgba(156,163,175,0.12); color: #6b7280; border: 1px solid rgba(156,163,175,0.3); }
    .vr-details { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 1.25rem; }
    .detail-item { display: flex; flex-direction: column; gap: 0.25rem; }
    .detail-label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
    .detail-value { font-size: 0.9rem; font-weight: 600; color: var(--text-main); }
    .vr-message { background: var(--bg-deep); border-left: 3px solid var(--brand-gold); padding: 0.75rem 1rem; border-radius: 0 8px 8px 0; margin-bottom: 1.25rem; font-size: 0.875rem; border-top: 1px solid var(--border-color); border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); }
    .msg-label { font-weight: 600; color: var(--brand-gold-dark); display: block; margin-bottom: 0.25rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .vr-message p { color: var(--text-muted); margin: 0; font-style: italic; }
    .vr-actions { display: flex; gap: 0.75rem; margin-bottom: 0.5rem; }
    .btn-cancel { padding: 0.5rem 1.25rem; border-radius: 999px; border: 1px solid rgba(239,68,68,0.3); background: transparent; color: #dc2626; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem; }
    .btn-cancel:hover { background: rgba(239,68,68,0.08); border-color: #dc2626; }
    .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
    .vr-notice { font-size: 0.85rem; padding: 0.75rem 1rem; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem; font-weight: 500; }
    .vr-notice.approved { background: rgba(74,222,128,0.1); color: #16a34a; border: 1px solid rgba(74,222,128,0.2); }
    .vr-notice.rejected { background: rgba(239,68,68,0.1); color: #dc2626; border: 1px solid rgba(239,68,68,0.2); }
    .spinner-xs { width: 14px; height: 14px; border: 2px solid rgba(220,38,38,0.3); border-top-color: currentColor; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class UserViewingRequestsComponent implements OnInit, OnDestroy {
  requests: any[] = [];
  isLoading = true;
  errorMsg = '';
  loadingMap: Record<string, boolean> = {};
  private destroy$ = new Subject<void>();

  constructor(
    private svc: UserDashboardService,
    private notif: NotificationService,
    private translate: TranslateService
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
          this.errorMsg = err?.error?.message || this.translate.instant('DASHBOARD.ERR_LOAD_VR');
          this.isLoading = false;
        }
      });
  }

  cancel(id: string): void {
    if (this.loadingMap[id]) return;
    this.loadingMap = { ...this.loadingMap, [id]: true };
    this.svc.cancelViewingRequest(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notif.show(this.translate.instant('DASHBOARD.NOTIF_VR_CANCELLED'), 'info');
          this.requests = this.requests.map(r =>
            r._id === id ? { ...r, status: 'cancelled' } : r
          );
          this.loadingMap = { ...this.loadingMap, [id]: false };
        },
        error: (err) => {
          this.notif.show(err?.error?.message || this.translate.instant('DASHBOARD.NOTIF_VR_CANCEL_FAILED'), 'error');
          this.loadingMap = { ...this.loadingMap, [id]: false };
        }
      });
  }

  trackById(_i: number, item: any): string { return item._id; }
}
