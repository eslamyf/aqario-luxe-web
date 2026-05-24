import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { UserDashboardService, UserProfile } from './user-dashboard.service';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit, OnDestroy {
  user: UserProfile | null = null;
  isLoading = true;

  profileForm!: FormGroup;
  isSavingProfile = false;

  passwordForm!: FormGroup;
  isSavingPassword = false;
  showCurrentPw = false;
  showNewPw = false;

  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserDashboardService,
    private fb: FormBuilder,
    private notif: NotificationService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      name:  ['', [Validators.required, Validators.minLength(3)]],
      phone: [''],
      bio:   [''],
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword:     ['', [Validators.required, Validators.minLength(8)]],
    });

    this.userService.getMe()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ user }) => {
          this.user = user;
          this.profileForm.patchValue({
            name:  user.name,
            phone: user.phone ?? '',
            bio:   user.bio ?? '',
          });
          this.isLoading = false;
        },
        error: () => { this.isLoading = false; },
      });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  get initials(): string {
    if (!this.user?.name) return '?';
    return this.user.name.split(' ').slice(0, 2).map((n) => n[0].toUpperCase()).join('');
  }

  saveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    this.isSavingProfile = true;
    this.userService.updateMe(this.profileForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.user = user;
          this.notif.show(this.translate.instant('DASHBOARD.PROFILE.NOTIF.UPDATE_SUCCESS'), 'success');
          this.isSavingProfile = false;
        },
        error: () => { this.isSavingProfile = false; },
      });
  }

  onPhotoChange(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('photo', file);

    this.isSavingProfile = true;
    this.userService.updateMe(fd)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.user = user;
          this.notif.show(this.translate.instant('DASHBOARD.PROFILE.NOTIF.PHOTO_SUCCESS'), 'success');
          this.isSavingProfile = false;
        },
        error: () => { this.isSavingProfile = false; }
      });
  }

  savePassword(): void {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    this.isSavingPassword = true;
    const { currentPassword, newPassword } = this.passwordForm.value;
    this.userService.changePassword(currentPassword, newPassword)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notif.show(this.translate.instant('DASHBOARD.PROFILE.NOTIF.PASSWORD_SUCCESS'), 'success');
          this.isSavingPassword = false;
          this.passwordForm.reset();
          // Backend logs user out by revoking refresh tokens
          setTimeout(() => this.userService.logout().subscribe(), 1500);
        },
        error: () => { this.isSavingPassword = false; },
      });
  }
}
