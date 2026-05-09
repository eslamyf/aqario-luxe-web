import {
  Component, Input, Output, EventEmitter,
  HostListener, ElementRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminUser } from '../../admin.service';

export type UserRole = 'buyer' | 'owner' | 'agent' | 'admin';

interface ConfirmationConfig {
  type: 'ban' | 'role' | 'hard-cancel';
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  newRole?: UserRole;
  reason?: string;
  forceDeactivateListings?: boolean;
}

@Component({
  selector: 'app-user-actions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Trigger button -->
    <div class="actions-wrapper">
      <button class="actions-trigger" (click)="toggleDropdown($event)" [class.open]="isOpen">
        <i class="fa-solid fa-ellipsis-vertical"></i>
      </button>

      <!-- Dropdown Menu -->
      <div class="actions-dropdown" *ngIf="isOpen" [class.open-upwards]="openUpwards" (click)="$event.stopPropagation()">
        <div class="dropdown-header">
          <span class="user-name-preview">{{ user.name }}</span>
        </div>

        <div class="dropdown-section">
          <p class="section-label">Change Role</p>
          <button
            *ngFor="let role of availableRoles"
            class="dropdown-item role-item"
            [class.current]="user.role === role.value"
            [disabled]="user.role === role.value || loading"
            (click)="requestRoleChange(role.value)">
            <i class="fa-solid" [ngClass]="role.icon"></i>
            {{ role.label }}
            <i class="fa-solid fa-check current-check" *ngIf="user.role === role.value"></i>
          </button>
        </div>

        <div class="dropdown-divider"></div>

        <div class="dropdown-section">
          <button
            class="dropdown-item"
            [class.ban-action]="!user.isBanned"
            [class.unban-action]="user.isBanned"
            [disabled]="loading"
            (click)="requestBanToggle()">
            <i class="fa-solid" [ngClass]="user.isBanned ? 'fa-user-check' : 'fa-user-slash'"></i>
            {{ user.isBanned ? 'Unban User' : 'Ban User' }}
          </button>
        </div>

        <div class="dropdown-divider" *ngIf="user.subscriptionStatus === 'active'"></div>

        <div class="dropdown-section" *ngIf="user.subscriptionStatus === 'active'">
          <p class="section-label">Subscription</p>
          <button
            class="dropdown-item hard-cancel-action"
            [disabled]="loading"
            (click)="requestHardCancel()">
            <i class="fa-solid fa-radiation"></i>
            Hard Cancel Sub
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal (Teleported) -->
    <div class="modal-overlay" *ngIf="confirmation" (click)="cancelConfirmation()">
      <div class="confirm-modal" (click)="$event.stopPropagation()">
        <div class="modal-icon" [class.danger]="confirmation.danger">
          <i class="fa-solid" [ngClass]="confirmation.type === 'ban' ? 'fa-user-slash' : 'fa-shield-halved'"></i>
        </div>
        <h3 class="modal-title">{{ confirmation.title }}</h3>
        <p class="modal-message">{{ confirmation.message }}</p>

        <!-- Hard Cancel Specific Fields -->
        <div class="modal-fields" *ngIf="confirmation.type === 'hard-cancel'">
          <textarea
            class="reason-input"
            placeholder="Reason for revocation..."
            [(ngModel)]="confirmation.reason"
            rows="3">
          </textarea>
          
          <label class="checkbox-field">
            <input type="checkbox" [(ngModel)]="confirmation.forceDeactivateListings">
            <span>Also archive all active listings</span>
          </label>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" (click)="cancelConfirmation()" [disabled]="loading">
            Cancel
          </button>
          <button
            class="btn-confirm"
            [class.danger]="confirmation.danger"
            (click)="executeAction()"
            [disabled]="loading">
            <i class="fa-solid fa-spinner fa-spin" *ngIf="loading"></i>
            {{ loading ? 'Processing...' : confirmation.confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .actions-wrapper { position: relative; display: inline-block; }

    .actions-trigger {
      width: 32px; height: 32px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03);
      color: rgba(255,255,255,0.5);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s ease;
      font-size: 14px;

      &:hover, &.open {
        background: rgba(201,169,110,0.1);
        border-color: rgba(201,169,110,0.3);
        color: #c9a96e;
      }
    }

    .actions-dropdown {
      position: absolute;
      right: 0; 
      top: calc(100% + 8px);
      width: 220px;
      background: #1a1a1a;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6);
      z-index: 1000;
      overflow: hidden;
      animation: dropIn 0.15s ease;

      &.open-upwards {
        top: auto;
        bottom: calc(100% + 8px);
        transform-origin: bottom right;
        animation: dropUp 0.15s ease;
      }
    }

    @keyframes dropIn {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes dropUp {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .dropdown-header {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .user-name-preview {
      font-size: 12px;
      font-weight: 600;
      color: rgba(255,255,255,0.5);
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      display: block;
    }

    .dropdown-section { padding: 6px 0; }
    .section-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 1px;
      color: rgba(255,255,255,0.25);
      text-transform: uppercase;
      padding: 4px 16px 2px;
      margin: 0;
    }

    .dropdown-item {
      width: 100%;
      display: flex; align-items: center; gap: 10px;
      padding: 9px 16px;
      background: none; border: none;
      color: rgba(255,255,255,0.65);
      font-size: 13px; cursor: pointer;
      transition: all 0.15s ease;
      text-align: left;

      i { width: 16px; text-align: center; font-size: 12px; }

      .current-check { margin-left: auto; color: #4ade80; }

      &:hover:not(:disabled):not(.current) {
        background: rgba(255,255,255,0.04);
        color: #fff;
      }

      &.current {
        color: #c9a96e;
        background: rgba(201,169,110,0.06);
      }

      &.ban-action:hover:not(:disabled) {
        background: rgba(248,113,113,0.08);
        color: #f87171;
      }

      &.unban-action:hover:not(:disabled) {
        background: rgba(74,222,128,0.08);
        color: #4ade80;
      }

      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }

    .dropdown-divider {
      height: 1px;
      background: rgba(255,255,255,0.05);
      margin: 0;
    }

    // ── Confirmation Modal ──────────────────────────────
    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .confirm-modal {
      background: #1a1a1a;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 32px;
      width: 360px;
      text-align: center;
      animation: scaleIn 0.2s ease;
      box-shadow: 0 40px 100px rgba(0,0,0,0.8);
    }

    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.9); }
      to   { opacity: 1; transform: scale(1); }
    }

    .modal-icon {
      width: 56px; height: 56px;
      border-radius: 50%;
      background: rgba(201,169,110,0.1);
      border: 1px solid rgba(201,169,110,0.2);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px;
      font-size: 22px; color: #c9a96e;

      &.danger {
        background: rgba(248,113,113,0.1);
        border-color: rgba(248,113,113,0.2);
        color: #f87171;
      }
    }

    .modal-title {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 10px;
    }

    .modal-message {
      font-size: 13px;
      color: rgba(255,255,255,0.5);
      line-height: 1.6;
      margin: 0 0 28px;
    }

    .modal-actions {
      display: flex; gap: 12px;
    }

    .btn-cancel, .btn-confirm {
      flex: 1;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
      display: flex; align-items: center; justify-content: center; gap: 8px;

      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .btn-cancel {
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.7);
      border: 1px solid rgba(255,255,255,0.1);
      &:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: #fff; }
    }

    .btn-confirm {
      background: rgba(201,169,110,0.15);
      color: #c9a96e;
      border: 1px solid rgba(201,169,110,0.3);
      &:hover:not(:disabled) { background: rgba(201,169,110,0.25); }

      &.danger {
        background: rgba(248,113,113,0.15);
        color: #f87171;
        border-color: rgba(248,113,113,0.3);
        &:hover:not(:disabled) { background: rgba(248,113,113,0.25); }
      }
    }

    .modal-fields {
      text-align: left;
      margin-bottom: 24px;
    }

    .reason-input {
      width: 100%;
      background: rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: #fff;
      padding: 12px;
      font-size: 13px;
      margin-bottom: 12px;
      resize: none;
      &:focus { border-color: #f87171; outline: none; }
    }

    .checkbox-field {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-size: 13px;
      color: rgba(255,255,255,0.6);
      &:hover { color: #fff; }
    }

    .hard-cancel-action:hover:not(:disabled) {
      background: rgba(248,113,113,0.1) !important;
      color: #f87171 !important;
    }
  `]
})
export class UserActionsComponent {
  @Input() user!: AdminUser;
  @Input() loading = false;

  @Output() roleChanged = new EventEmitter<UserRole>();
  @Output() banToggled  = new EventEmitter<void>();
  @Output() hardCancel  = new EventEmitter<{ reason: string; archiveListings: boolean }>();

  private el = inject(ElementRef);

  isOpen = false;
  openUpwards = false;
  confirmation: ConfirmationConfig | null = null;

  readonly availableRoles = [
    { value: 'buyer' as UserRole, label: 'Buyer', icon: 'fa-user'      },
    { value: 'owner' as UserRole, label: 'Owner', icon: 'fa-building'  },
    { value: 'agent' as UserRole, label: 'Agent', icon: 'fa-handshake' },
  ];

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    
    if (!this.isOpen) {
      const rect = this.el.nativeElement.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 250px below, open upwards
      this.openUpwards = spaceBelow < 250;
    }
    
    this.isOpen = !this.isOpen;
  }

  requestRoleChange(role: UserRole) {
    this.isOpen = false;
    this.confirmation = {
      type:         'role',
      title:        'Change User Role',
      message:      `Are you sure you want to change "${this.user.name}" role to ${role.toUpperCase()}?`,
      confirmLabel: `Set as ${role}`,
      danger:       role === 'admin',
      newRole:      role,
    };
  }

  requestBanToggle() {
    this.isOpen = false;
    const isBanning = !this.user.isBanned;
    this.confirmation = {
      type:         'ban',
      title:        isBanning ? 'Ban User' : 'Unban User',
      message:      isBanning
        ? `This will prevent "${this.user.name}" from accessing the platform.`
        : `This will restore "${this.user.name}" access to the platform.`,
      confirmLabel: isBanning ? 'Ban User' : 'Unban User',
      danger:       isBanning,
    };
  }

  requestHardCancel() {
    this.isOpen = false;
    this.confirmation = {
      type:         'hard-cancel',
      title:        'Revoke Subscription',
      message:      `This will immediately terminate ${this.user.name}'s subscription. They will lose access to pro features instantly.`,
      confirmLabel: 'Confirm Revocation',
      danger:       true,
      reason:       '',
      forceDeactivateListings: false,
    };
  }

  cancelConfirmation() {
    if (!this.loading) {
      this.confirmation = null;
    }
  }

  executeAction() {
    if (!this.confirmation) return;

    if (this.confirmation.type === 'role' && this.confirmation.newRole) {
      this.roleChanged.emit(this.confirmation.newRole);
    } else if (this.confirmation.type === 'ban') {
      this.banToggled.emit();
    } else if (this.confirmation.type === 'hard-cancel') {
      this.hardCancel.emit({
        reason: this.confirmation.reason || 'Admin Revocation',
        archiveListings: !!this.confirmation.forceDeactivateListings
      });
    }

    this.confirmation = null;
  }
}
