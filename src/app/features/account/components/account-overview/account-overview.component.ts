import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { AccountService, UserProfile } from '../../services/account.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { KycStatusBannerComponent } from '../kyc-status-banner/kyc-status-banner.component';

@Component({
  selector: 'app-account-overview',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, KycStatusBannerComponent, TranslateModule, RouterModule],
  templateUrl: './account-overview.component.html',
  styleUrls: ['./account-overview.component.scss']
})
export class AccountOverviewComponent implements OnInit {
  private accountService = inject(AccountService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);
  private translateService = inject(TranslateService);

  user$ = this.accountService.user$;
  profileForm: FormGroup;
  
  isUpdating = false;
  isUploadingPhoto = false;

  constructor() {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      phone: ['', [Validators.pattern(/^\+?[0-9\s-]{10,15}$/)]],
      bio: ['', [Validators.maxLength(500)]]
    });
  }

  ngOnInit(): void {
    this.user$.subscribe(user => {
      if (user) {
        this.profileForm.patchValue({
          name: user.name,
          phone: user.phone || '',
          bio: user.bio || ''
        });
      }
    });
  }

  submit(): void {
    if (this.profileForm.invalid) {
      this.notificationService.show(this.translateService.instant('ACCOUNT.NOTIF_FIX_ERRORS'), 'error');
      return;
    }

    const previousUser = this.accountService.getCurrentUser();
    const updatedData = this.profileForm.value;

    // Optimistic UI Update
    if (previousUser) {
      this.accountService.setUserData({ ...previousUser, ...updatedData });
    }

    this.isUpdating = true;
    this.accountService.updateProfile(updatedData).pipe(
      finalize(() => this.isUpdating = false)
    ).subscribe({
      next: () => this.notificationService.show(this.translateService.instant('ACCOUNT.NOTIF_SYNC_SUCCESS'), 'success'),
      error: (err) => {
        // Rollback on failure
        this.accountService.setUserData(previousUser);
        this.notificationService.show(err.error?.message || this.translateService.instant('ACCOUNT.NOTIF_SYNC_FAILED'), 'error');
      }
    });
  }

  handleFileSelect(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // Client-side validation
    if (!file.type.startsWith('image/')) {
      this.notificationService.show(this.translateService.instant('ACCOUNT.NOTIF_VALID_IMAGE'), 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.notificationService.show(this.translateService.instant('ACCOUNT.NOTIF_IMAGE_SIZE'), 'error');
      return;
    }

    this.isUploadingPhoto = true;
    const formData = new FormData();
    formData.append('photo', file); // Field name must match backend 'photo'

    this.accountService.updateProfile(formData).pipe(
      finalize(() => this.isUploadingPhoto = false)
    ).subscribe({
      next: (res) => {
        // Backend returns updated user with Cloudinary URL
        this.accountService.setUserData(res.data.user);
        this.notificationService.show(this.translateService.instant('ACCOUNT.NOTIF_AVATAR_SAVED'), 'success');
      },
      error: (err) => {
        this.notificationService.show(err.error?.message || this.translateService.instant('ACCOUNT.NOTIF_PHOTO_UPLOAD_FAILED'), 'error');
      }
    });
  }

  removePhoto(): void {
    if (!confirm(this.translateService.instant('ACCOUNT.CONFIRM_REMOVE_PHOTO'))) return;
    
    this.isUploadingPhoto = true;
    this.accountService.updateProfile({ photo: '' }).pipe(
      finalize(() => this.isUploadingPhoto = false)
    ).subscribe({
      next: (res) => {
        this.accountService.setUserData(res.data.user);
        this.notificationService.show(this.translateService.instant('ACCOUNT.NOTIF_AVATAR_REMOVED'), 'success');
      },
      error: (err) => {
        this.notificationService.show(err.error?.message || this.translateService.instant('ACCOUNT.NOTIF_AVATAR_REMOVE_FAILED'), 'error');
      }
    });
  }

  navigateToKyc(): void {
    window.location.href = '/kyc';
  }

  getRoleBadgeClass(role: string): string {
    const classes: Record<string, string> = {
      buyer: 'badge-buyer',
      owner: 'badge-owner',
      agent: 'badge-agent',
      admin: 'badge-admin'
    };
    return classes[role] || 'badge-default';
  }
}
