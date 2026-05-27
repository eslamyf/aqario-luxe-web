import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export type UserRole = 'buyer' | 'owner' | 'agent' | 'admin';

@Component({
  selector: 'app-role-badge',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <span class="role-badge" [ngClass]="role">
      <i class="fa-solid" [ngClass]="icon"></i>
      {{ 'REAL_ESTATE.' + (role | uppercase) | translate }}
    </span>
  `,
  styles: [`
    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      white-space: nowrap;

      &.buyer  { background: rgba(99,  102, 241, 0.12); color: #818cf8; }
      &.owner  { background: rgba(201, 169, 110, 0.12); color: #c9a96e; }
      &.agent  { background: rgba(34,  211, 238, 0.12); color: #22d3ee; }
      &.admin  { background: rgba(239,  68,  68, 0.12); color: #f87171; }
    }
  `]
})
export class RoleBadgeComponent {
  @Input() role: UserRole = 'buyer';

  get label(): string {
    const labels: Record<UserRole, string> = {
      buyer: 'Buyer',
      owner: 'Owner',
      agent: 'Agent',
      admin: 'Admin',
    };
    return labels[this.role] || this.role;
  }

  get icon(): string {
    const icons: Record<UserRole, string> = {
      buyer: 'fa-user',
      owner: 'fa-building',
      agent: 'fa-handshake',
      admin: 'fa-shield-halved',
    };
    return icons[this.role] || 'fa-user';
  }
}
