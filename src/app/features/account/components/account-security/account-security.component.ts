import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AccountService } from '../../services/account.service';
import { NotificationService } from '../../../../shared/services/notification.service';

@Component({
  selector: 'app-account-security',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './account-security.component.html',
  styleUrls: ['./account-security.component.scss']
})
export class AccountSecurityComponent {
  private accountService = inject(AccountService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);
  private translateService = inject(TranslateService);

  passwordForm: FormGroup;
  isUpdating = false;

  constructor() {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(8)]],
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: [this.passwordMatchValidator, this.newPasswordNotSameValidator] });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  newPasswordNotSameValidator(g: FormGroup) {
    return g.get('currentPassword')?.value && g.get('currentPassword')?.value === g.get('newPassword')?.value
      ? { samePassword: true } : null;
  }

  submit(): void {
    if (this.passwordForm.invalid) return;

    this.isUpdating = true;
    const { currentPassword, newPassword } = this.passwordForm.value;

    this.accountService.changePassword({ currentPassword, newPassword }).pipe(
      finalize(() => this.isUpdating = false)
    ).subscribe({
      next: () => {
        this.notificationService.show(this.translateService.instant('ACCOUNT.SECURITY.NOTIF_SUCCESS'), 'success');
        this.passwordForm.reset();
      },
      error: (err) => {
        this.notificationService.show(err.error?.message || this.translateService.instant('ACCOUNT.SECURITY.NOTIF_FAILED'), 'error');
      }
    });
  }
}
