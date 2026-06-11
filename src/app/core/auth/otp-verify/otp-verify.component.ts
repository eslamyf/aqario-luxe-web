import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, timer, takeUntil } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../auth.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-otp-verify',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './otp-verify.component.html',
  styleUrls: ['./otp-verify.component.scss']
})
export class OtpVerifyComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private http = inject(HttpClient);
  private translateService = inject(TranslateService);

  email: string = '';
  otpForm!: FormGroup;
  isLoading = false;
  isResending = false;

  resendCooldown = 0;
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
      if (!this.email) {
        this.notificationService.show(this.translateService.instant('AUTH.OTP_PAGE.INVALID_ACCESS'), 'error');
        this.router.navigate(['/']);
      }
    });

    this.buildForm();
    this.startCooldown(60);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildForm(): void {
    this.otpForm = this.fb.group({
      otp1: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
      otp2: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
      otp3: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
      otp4: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
      otp5: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
      otp6: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
    });
  }

  onInput(event: any, nextInput?: HTMLInputElement): void {
    const value = event.target.value;
    if (value && nextInput) {
      nextInput.focus();
    }
  }

  onKeyDown(event: KeyboardEvent, prevInput?: HTMLInputElement): void {
    if (event.key === 'Backspace' && !(event.target as HTMLInputElement).value && prevInput) {
      prevInput.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text/plain') || '';
    const digits = pastedData.replace(/\D/g, '').split('').slice(0, 6);

    if (digits.length > 0) {
      const patchObj: any = {};
      digits.forEach((digit, i) => {
        patchObj[`otp${i + 1}`] = digit;
      });
      this.otpForm.patchValue(patchObj);

      // Focus the next empty input or the last one
      const nextIndex = Math.min(digits.length + 1, 6);
      const nextInput = document.querySelector(`input[formControlName="otp${nextIndex}"]`) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
  }

  onSubmit(): void {
    if (this.otpForm.invalid) return;

    this.isLoading = true;
    const otp = Object.values(this.otpForm.value).join('');

    this.authService.verifyAccount(this.email, otp).subscribe({
      next: () => {
        this.isLoading = false;
        this.notificationService.show(this.translateService.instant('AUTH.OTP_PAGE.VERIFIED_SUCCESS'), 'success');
        this.router.navigate(['/']).then(() => {
          this.authService.openModal('login');
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.notificationService.show(err.error?.message || this.translateService.instant('AUTH.NOTIF.INVALID_OTP'), 'error');
      }
    });
  }

  resendOtp(): void {
    if (this.resendCooldown > 0 || this.isResending) return;

    this.isResending = true;
    this.http.post(`${environment.apiUrl}/auth/resend-otp`, { email: this.email }).subscribe({
      next: () => {
        this.isResending = false;
        this.notificationService.show(this.translateService.instant('AUTH.OTP_PAGE.NEW_OTP_SENT'), 'success');
        this.startCooldown(60);
      },
      error: (err) => {
        this.isResending = false;
        this.notificationService.show(err.error?.message || this.translateService.instant('AUTH.OTP_PAGE.RESEND_FAILED'), 'error');
      }
    });
  }

  private startCooldown(seconds: number): void {
    this.resendCooldown = seconds;
    timer(0, 1000).pipe(
      takeUntil(this.destroy$),
      takeUntil(timer((seconds + 1) * 1000))
    ).subscribe(() => {
      if (this.resendCooldown > 0) this.resendCooldown--;
    });
  }
}
