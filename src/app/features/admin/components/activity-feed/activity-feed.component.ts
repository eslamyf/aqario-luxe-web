import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [CommonModule, DatePipe, TranslateModule],
  template: `
    <div class="activity-panel">
      <div class="panel-header">
        <h3>{{ 'ADMIN.DASHBOARD.ACTIVITY.TITLE' | translate }}</h3>
      </div>
      <div class="feed-list">
        <div class="feed-item" *ngFor="let activity of activities">
          <div class="dot" [ngClass]="'dot-' + activity.colorCode"></div>
          <div class="content">
            <h4 class="type">{{ 'AUDIT.ACTIONS.' + activity.type | translate }}</h4>
            <p class="message">{{ activity.message }}</p>
            <span class="time">{{ activity.createdAt | date:'short' }}</span>
          </div>
        </div>
        <div *ngIf="!activities?.length" class="empty-state">{{ 'ADMIN.DASHBOARD.ACTIVITY.EMPTY' | translate }}</div>
      </div>
      <button class="btn-outline">{{ 'ADMIN.DASHBOARD.ACTIVITY.OPEN_LOG' | translate }}</button>
    </div>
  `,
  styles: [`
    .activity-panel {
      background: var(--obsidian-3);
      border-radius: 12px;
      padding: 2rem;
      border: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .panel-header h3 {
      font-family: var(--font-display);
      font-size: 1.5rem;
      margin: 0 0 2rem;
      color: var(--white);
    }
    .feed-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      flex-grow: 1;
    }
    .feed-item {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 2px;
      margin-top: 6px;
      flex-shrink: 0;
    }
    .dot-blue { background: #3b82f6; }
    .dot-purple { background: #8b5cf6; }
    .dot-gold { background: var(--gold); }
    .content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .type {
      margin: 0;
      color: var(--white);
      font-family: var(--font-body);
      font-size: 14px;
      font-weight: 500;
    }
    .message {
      margin: 0;
      color: rgba(250, 250, 248, 0.7);
      font-size: 13px;
      line-height: 1.4;
    }
    .time {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--gold);
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .btn-outline {
      margin-top: 2rem;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(250, 250, 248, 0.7);
      padding: 1rem;
      width: 100%;
      border-radius: 8px;
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 2px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .btn-outline:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--white);
    }
    .empty-state {
      color: rgba(250, 250, 248, 0.4);
      font-size: 14px;
    }
  `]
})
export class ActivityFeedComponent {
  @Input() activities: any[] = [];

  formatType(type: string): string {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
}
