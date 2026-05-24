import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-kyc-status-banner',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="kyc-action-banner" *ngIf="status !== 'approved'" [ngClass]="status">
      <div class="banner-inner">
        <div class="content-side">
          <div class="icon-circle">
            <i class="fa-solid" [ngClass]="statusIcon"></i>
          </div>
          <div class="text-block">
            <h4>{{ statusTitle }}</h4>
            <p>{{ statusDescription }}</p>
          </div>
        </div>
        
        <div class="action-side">
          <button class="banner-btn" *ngIf="status !== 'pending'" (click)="onAction.emit()">
            <span>{{ (status === 'rejected' ? 'ACCOUNT.KYC_BANNER.RE_SUBMIT' : 'ACCOUNT.KYC_BANNER.START') | translate }}</span>
            <i class="fa-solid fa-arrow-right"></i>
          </button>
          
          <div class="status-badge pending" *ngIf="status === 'pending'">
            <div class="pulse-dot"></div>
            <span>{{ 'ACCOUNT.KYC_BANNER.PENDING_REVIEW' | translate }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kyc-action-banner {
      background: rgba(17, 17, 17, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 24px;
      margin-bottom: 3.5rem;
      overflow: hidden;
      position: relative;
      
      &::before {
        content: '';
        position: absolute;
        left: 0; top: 0; bottom: 0; width: 6px;
        background: #C9A96E;
      }

      &.rejected { 
        border-color: rgba(255, 77, 77, 0.2); 
        &::before { background: #ff4d4d; }
      }
      
      &.pending { 
        border-color: rgba(255, 170, 0, 0.2); 
        &::before { background: #ffaa00; }
      }
    }

    .banner-inner {
      padding: 2rem 2.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 2rem;
    }

    .content-side {
      display: flex;
      align-items: center;
      gap: 1.8rem;
      
      .icon-circle {
        width: 60px;
        height: 60px;
        background: rgba(201, 169, 110, 0.1);
        border-radius: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        i { font-size: 1.6rem; color: #C9A96E; }
      }

      .text-block {
        h4 { font-size: 1.2rem; color: #fff; margin: 0 0 0.4rem 0; font-weight: 800; letter-spacing: -0.5px; }
        p { font-size: 0.95rem; color: rgba(255, 255, 255, 0.4); margin: 0; font-weight: 500; }
      }
    }

    .banner-btn {
      background: #fff;
      color: #000;
      border: none;
      padding: 1rem 2rem;
      border-radius: 12px;
      font-weight: 900;
      font-size: 0.8rem;
      letter-spacing: 1px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: all 0.3s;
      
      i { font-size: 0.9rem; transition: transform 0.3s; }
      
      &:hover {
        background: #C9A96E;
        transform: translateX(5px);
        i { transform: translateX(3px); }
      }
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.8rem 1.5rem;
      background: rgba(255, 170, 0, 0.05);
      border: 1px solid rgba(255, 170, 0, 0.1);
      border-radius: 12px;
      color: #ffaa00;
      font-weight: 800;
      font-size: 0.75rem;
      letter-spacing: 1.5px;

      .pulse-dot {
        width: 8px;
        height: 8px;
        background: #ffaa00;
        border-radius: 50%;
        box-shadow: 0 0 0 rgba(255, 170, 0, 0.4);
        animation: pulse-orange 2s infinite;
      }
    }

    @keyframes pulse-orange {
      0% { box-shadow: 0 0 0 0 rgba(255, 170, 0, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(255, 170, 0, 0); }
      100% { box-shadow: 0 0 0 0 rgba(255, 170, 0, 0); }
    }

    @media (max-width: 768px) {
      .banner-inner { flex-direction: column; align-items: flex-start; }
      .action-side { width: 100%; .banner-btn { width: 100%; justify-content: center; } }
    }
  `]
})
export class KycStatusBannerComponent {
  @Input() status: string = 'not_submitted';
  @Output() onAction = new EventEmitter<void>();

  private translateService = inject(TranslateService);

  get statusIcon(): string {
    switch (this.status) {
      case 'pending': return 'fa-hourglass-half';
      case 'rejected': return 'fa-triangle-exclamation';
      default: return 'fa-shield-halved';
    }
  }

  get statusTitle(): string {
    switch (this.status) {
      case 'pending': return this.translateService.instant('ACCOUNT.KYC_BANNER.VERIFICATION_PENDING');
      case 'rejected': return this.translateService.instant('ACCOUNT.KYC_BANNER.IDENTITY_REJECTED');
      default: return this.translateService.instant('ACCOUNT.KYC_BANNER.IDENTITY_VERIFICATION');
    }
  }

  get statusDescription(): string {
    switch (this.status) {
      case 'pending': return this.translateService.instant('ACCOUNT.KYC_BANNER.DESC_PENDING');
      case 'rejected': return this.translateService.instant('ACCOUNT.KYC_BANNER.DESC_REJECTED');
      default: return this.translateService.instant('ACCOUNT.KYC_BANNER.DESC_DEFAULT');
    }
  }
}
