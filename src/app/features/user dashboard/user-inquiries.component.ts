import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';
import { UserDashboardService } from './user-dashboard.service';
import { NotificationService } from '../../shared/services/notification.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-user-inquiries',
  template: `
    <div class="inquiries-wrapper">
      <div class="page-header">
        <div class="section-eyebrow">{{ 'DASHBOARD.INQUIRIES' | translate }}</div>
        <h1>{{ 'DASHBOARD.PROPERTY_INQUIRIES' | translate }}</h1>
        <p>{{ 'DASHBOARD.PROPERTY_INQUIRIES_SUB' | translate }}</p>
      </div>

      <div class="panel-card">
        <!-- Loading -->
        <div *ngIf="isLoading" class="loading-state">
          <div class="skeleton" *ngFor="let i of [1,2,3]"></div>
        </div>

        <!-- Error -->
        <div *ngIf="errorMsg && !isLoading" class="empty-state">
          <span class="error-icon">&#9888;&#65039;</span>
          <p>{{ errorMsg }}</p>
          <button class="action-btn primary" (click)="load()">{{ 'DASHBOARD.RETRY' | translate }}</button>
        </div>

        <!-- Empty -->
        <div *ngIf="!isLoading && !errorMsg && inquiries.length === 0" class="empty-state">
          <div class="empty-icon">&#128172;</div>
          <h3>{{ 'DASHBOARD.NO_INQUIRIES' | translate }}</h3>
          <p>{{ 'DASHBOARD.NO_INQUIRIES_SUB' | translate }}</p>
        </div>

        <!-- List -->
        <div *ngIf="!isLoading && !errorMsg && inquiries.length > 0" class="inquiries-list">
          <div class="inquiry-card" *ngFor="let inq of inquiries; trackBy: trackById">
            
            <!-- Linked Property reference header -->
            <div class="inquiry-card-header">
              <div class="prop-thumb" *ngIf="inq.property?.images?.length">
                <img [src]="inq.property.images[0]" [alt]="inq.property.title" />
              </div>
              <div class="prop-thumb placeholder" *ngIf="!inq.property?.images?.length">&#127968;</div>
              <div class="prop-info">
                <h3 class="prop-title">{{ (inq.property?.title || ('DASHBOARD.TABLE.PROPERTY' | translate)) | translateProp }}</h3>
                <p class="prop-location"><i class="fa-solid fa-location-dot text-gold" aria-hidden="true"></i> {{ (inq.property?.location?.city || 'N/A') | translateProp }}</p>
              </div>
              <div class="price-badge">
                {{ inq.property?.price | currency:(inq.property?.currency || 'EGP'):'symbol':'1.0-0' }}
              </div>
            </div>

            <!-- Sender Info details -->
            <div class="sender-info">
              <div class="sender-avatar">
                <img *ngIf="inq.sender?.photo" [src]="inq.sender.photo" [alt]="inq.sender.name" />
                <span *ngIf="!inq.sender?.photo">{{ inq.sender?.name?.charAt(0) | uppercase }}</span>
              </div>
              <div class="sender-meta">
                <p class="sender-name">{{ inq.sender?.name || ('DASHBOARD.ROLES.BUYER' | translate) }}</p>
                <div class="sender-contacts">
                  <span class="contact-item"><i class="fa-solid fa-envelope" aria-hidden="true"></i> {{ inq.sender?.email }}</span>
                  <span class="contact-item" *ngIf="inq.sender?.phone"><i class="fa-solid fa-phone" aria-hidden="true"></i> {{ inq.sender?.phone }}</span>
                </div>
              </div>
            </div>

            <!-- Message content -->
            <div class="inquiry-message">
              <span class="msg-label">{{ 'DASHBOARD.BUYER_NOTE' | translate }}</span>
              <p>"{{ inq.content || inq.message }}"</p>
            </div>

            <!-- Nested replies history -->
            <div class="replies-section" *ngIf="inq.replies?.length">
              <div class="reply-bubble" *ngFor="let rep of inq.replies">
                <div class="reply-header">
                  <span class="reply-author">{{ rep.from === inq.sender?._id ? inq.sender?.name : ('REAL_ESTATE.OWNER' | translate) }}</span>
                  <span class="reply-time">{{ rep.createdAt | date:'short' }}</span>
                </div>
                <p class="reply-content">{{ rep.message }}</p>
              </div>
            </div>

            <!-- Quick Inline Reply form action -->
            <div class="reply-action-box">
              <div class="action-buttons-group" *ngIf="activeReplyId !== inq._id">
                <button class="btn-toggle-reply" (click)="toggleReply(inq._id)">
                  <i class="fa-solid fa-comment-dots" aria-hidden="true"></i> {{ 'DASHBOARD.INQUIRY_REPLY' | translate }}
                </button>
                <button class="btn-go-to-chat gold-theme" (click)="goToChat(inq)">
                  <i class="fa-solid fa-comments" aria-hidden="true"></i> {{ 'DASHBOARD.GO_TO_CHAT' | translate }}
                </button>
              </div>

              <div class="reply-form" *ngIf="activeReplyId === inq._id">
                <textarea 
                  [placeholder]="'DASHBOARD.INQUIRY_REPLY_PLACEHOLDER' | translate"
                  [(ngModel)]="replyMessage"
                  rows="3">
                </textarea>
                <div class="form-actions">
                  <button class="btn-cancel" (click)="toggleReply(null)">{{ 'DASHBOARD.FORM.CANCEL' | translate }}</button>
                  <button class="btn-submit" [disabled]="submittingReply || !replyMessage.trim()" (click)="submitReply(inq._id)">
                    <span *ngIf="submittingReply" class="spinner-xs"></span>
                    {{ 'DASHBOARD.INQUIRY_REPLY' | translate }}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .inquiries-wrapper { max-width: 960px; }
    .page-header { margin-bottom: 2rem; }
    .section-eyebrow { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--brand-gold); margin-bottom: 0.5rem; }
    .page-header h1 { font-size: 1.75rem; font-weight: 700; color: var(--text-main); margin: 0 0 0.5rem; letter-spacing: -0.02em; }
    .page-header p { color: var(--text-muted); font-size: 0.95rem; margin: 0; }
    
    .panel-card { background: var(--bg-elevated); border: 1px solid var(--border-color); border-radius: 20px; padding: 2rem; box-shadow: var(--shadow-soft); }
    
    /* skeleton loading */
    .loading-state { display: flex; flex-direction: column; gap: 1rem; }
    .skeleton { height: 160px; border-radius: 16px; background: linear-gradient(90deg, color-mix(in srgb, var(--text-main) 4%, transparent) 25%, color-mix(in srgb, var(--text-main) 8%, transparent) 50%, color-mix(in srgb, var(--text-main) 4%, transparent) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    .empty-state { text-align: center; padding: 4rem 2rem; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; display: block; }
    .empty-state h3 { color: var(--text-main); margin: 0 0 0.5rem; font-size: 1.1rem; }
    .empty-state p { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
    .error-icon { font-size: 2rem; display: block; margin-bottom: 0.5rem; color: #ef4444; }

    .action-btn { padding: 0.6rem 1.5rem; border-radius: 999px; font-weight: 600; font-size: 0.875rem; border: none; cursor: pointer; transition: all 0.2s; }
    .action-btn.primary { background: var(--brand-gold); color: #fff; }
    .action-btn.primary:hover { background: var(--brand-gold-dark); }

    .inquiries-list { display: flex; flex-direction: column; gap: 1.5rem; }
    .inquiry-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem; box-shadow: var(--shadow-soft); transition: border-color 0.2s, box-shadow 0.2s; }
    .inquiry-card:hover { border-color: var(--brand-gold-soft); box-shadow: var(--shadow-pop); }

    .inquiry-card-header { display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); }
    .prop-thumb { width: 60px; height: 60px; border-radius: 10px; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--text-main) 5%, transparent); font-size: 1.5rem; border: 1px solid var(--border-color); }
    .prop-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .prop-info { flex: 1; min-width: 0; }
    .prop-title { font-weight: 600; color: var(--text-main); font-size: 1rem; margin: 0 0 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.01em; }
    .prop-location { color: var(--text-muted); font-size: 0.85rem; margin: 0; }
    .price-badge { flex-shrink: 0; font-size: 1rem; font-weight: 700; color: var(--brand-gold-dark); background: color-mix(in srgb, var(--brand-gold) 10%, transparent); padding: 0.35rem 0.8rem; border-radius: 8px; border: 1px solid var(--brand-gold-soft); }

    /* sender */
    .sender-info { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1rem; }
    .sender-avatar { width: 42px; height: 42px; border-radius: 50%; background: var(--bg-deep); display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--text-main); font-size: 0.95rem; overflow: hidden; flex-shrink: 0; border: 1px solid var(--border-color); }
    .sender-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .sender-name { font-weight: 600; color: var(--text-main); font-size: 0.95rem; margin: 0 0 0.25rem; }
    .sender-contacts { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.82rem; color: var(--text-muted); }
    .contact-item { display: inline-flex; align-items: center; gap: 4px; }
    .contact-item i { color: var(--brand-gold-dark); }

    /* message */
    .inquiry-message { background: var(--bg-deep); border-left: 3px solid var(--brand-gold); padding: 0.75rem 1rem; border-radius: 0 8px 8px 0; margin-bottom: 1.25rem; font-size: 0.875rem; border: 1px solid var(--border-color); border-left: none; }
    .msg-label { font-weight: 600; color: var(--brand-gold-dark); display: block; margin-bottom: 0.25rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .inquiry-message p { color: var(--text-muted); margin: 0; font-style: italic; }

    /* replies */
    .replies-section { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.25rem; padding-left: 1.5rem; border-left: 2px dashed var(--border-color); }
    .reply-bubble { background: var(--bg-deep); border: 1px solid var(--border-color); border-radius: 12px; padding: 0.75rem 1rem; }
    .reply-header { display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.35rem; }
    .reply-author { font-weight: 700; color: var(--brand-gold-dark); }
    .reply-time { color: var(--text-muted); }
    .reply-content { margin: 0; font-size: 0.875rem; color: var(--text-main); }

    /* reply actions */
    .reply-action-box { display: flex; flex-direction: column; align-items: flex-start; }
    .action-buttons-group { display: flex; gap: 0.75rem; }
    .btn-toggle-reply { display: inline-flex; align-items: center; gap: 6px; padding: 0.5rem 1.25rem; border-radius: 999px; border: 1px solid var(--brand-gold-soft); background: transparent; color: var(--brand-gold-dark); font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
    .btn-toggle-reply:hover { background: color-mix(in srgb, var(--brand-gold) 8%, transparent); border-color: var(--brand-gold); }
    .btn-go-to-chat { display: inline-flex; align-items: center; gap: 6px; padding: 0.5rem 1.25rem; border-radius: 999px; border: 1px solid var(--brand-gold); background: var(--brand-gold); color: #fff; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
    .btn-go-to-chat:hover { background: var(--brand-gold-dark); border-color: var(--brand-gold-dark); box-shadow: var(--shadow-soft); }

    .reply-form { width: 100%; display: flex; flex-direction: column; gap: 0.75rem; }
    .reply-form textarea { width: 100%; padding: 0.75rem; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-deep); color: var(--text-main); font-family: inherit; font-size: 0.875rem; resize: none; box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s; }
    .reply-form textarea:focus { outline: none; border-color: var(--brand-gold); box-shadow: 0 0 0 3px var(--brand-gold-soft); }
    .form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
    
    .btn-cancel { padding: 0.5rem 1.25rem; border-radius: 999px; border: 1px solid var(--border-color); background: transparent; color: var(--text-muted); font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
    .btn-cancel:hover { background: color-mix(in srgb, var(--text-main) 5%, transparent); color: var(--text-main); }
    
    .btn-submit { padding: 0.5rem 1.5rem; border-radius: 999px; border: none; background: var(--brand-gold); color: #fff; font-weight: 600; font-size: 0.85rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: background 0.2s; }
    .btn-submit:hover { background: var(--brand-gold-dark); }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    .spinner-xs { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3); border-top-color: currentColor; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class UserInquiriesComponent implements OnInit, OnDestroy {
  inquiries: any[] = [];
  isLoading = true;
  errorMsg = '';
  activeReplyId: string | null = null;
  replyMessage = '';
  submittingReply = false;
  private destroy$ = new Subject<void>();

  constructor(
    private svc: UserDashboardService,
    private notif: NotificationService,
    private translate: TranslateService,
    private router: Router
  ) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.isLoading = true;
    this.errorMsg = '';
    this.svc.getOwnerInquiries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.inquiries = data; this.isLoading = false; },
        error: (err) => {
          this.errorMsg = err?.error?.message || this.translate.instant('DASHBOARD.ERR_LOAD_INQUIRIES');
          this.isLoading = false;
        }
      });
  }

  toggleReply(id: string | null): void {
    this.activeReplyId = id;
    this.replyMessage = '';
  }

  submitReply(id: string): void {
    if (!this.replyMessage.trim() || this.submittingReply) return;
    this.submittingReply = true;
    this.svc.replyToInquiry(id, this.replyMessage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedInq) => {
          this.notif.show(this.translate.instant('DASHBOARD.INQUIRY_REPLY_SUCCESS'), 'success');
          this.inquiries = this.inquiries.map(inq => 
            inq._id === id ? { ...inq, replies: updatedInq.inquiry?.replies || updatedInq.replies || inq.replies } : inq
          );
          this.toggleReply(null);
          this.submittingReply = false;
        },
        error: (err) => {
          this.notif.show(err?.error?.message || this.translate.instant('DASHBOARD.INQUIRY_REPLY_FAILED'), 'error');
          this.submittingReply = false;
        }
      });
  }

  goToChat(inq: any): void {
    const participantId = inq.sender?._id || inq.sender;
    if (!participantId) return;

    this.svc.initiateChat(participantId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chat) => {
          if (chat && chat._id) {
            this.router.navigate(['/dashboard/chat', chat._id]);
          }
        },
        error: (err) => {
          this.notif.show(err?.error?.message || this.translate.instant('CHAT.ERR_INITIATE_CHAT'), 'error');
        }
      });
  }

  trackById(_i: number, item: any): string { return item._id; }
}
