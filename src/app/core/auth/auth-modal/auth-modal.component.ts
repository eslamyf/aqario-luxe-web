import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { ModalEscapeService } from '../../services/modal-escape.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { environment } from '../../../../environments/environment';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

// ─── Custom Validators ───────────────────────────────────

// 1. Password strength validation (8 characters, uppercase, lowercase, number, and symbol)
export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;

    const isStrong = value.length >= 8 &&
      /[A-Z]/.test(value) && /[a-z]/.test(value) &&
      /[0-9]/.test(value) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);

    // If password is weak, return 'strongPassword' error; otherwise return null (valid)
    return !isStrong ? { strongPassword: true } : null;
  };
}

// 2. Validate that passwords match in registration screen
export function passwordsMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    // If they don't match, set error on confirmPassword field to show the error message below it
    if (password && confirmPassword && password !== confirmPassword) {
      control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  };
}

// ─── Component Setup ──────────────────────────────────────────────────

// Define available tabs in the modal to prevent typos in the code
type AuthTab = 'login' | 'register' | 'forgot' | 'verify-otp';

@Component({
  selector: 'app-auth-modal',
  standalone: true, // Use Standalone Component for lightweight and fast performance
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.scss'],
})
export class AuthModalComponent implements OnInit, OnDestroy {

  // Dependency Injection using modern Angular way
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private modalEscape = inject(ModalEscapeService); // ESC global bus
  private notificationSvc = inject(NotificationService); // §5.5
  private translateService = inject(TranslateService);

  // ─── State Variables ───
  isOpen = false;           // Controls modal visibility
  activeTab: AuthTab = 'login'; // Currently active tab (default: login)
  isLoading = false;           // Triggers loading animation inside buttons
  isGoogleLoading = false;
  isFormSubmitted = false; // Flag to silence errors until first click
  errorMsg = '';              // To display general error messages (e.g., Email already registered)

  // Guard: true only when a real (non-placeholder) Google Client ID is set
  readonly isGoogleConfigured = environment.googleClientId !== 'your_google_client_id_here'
    && environment.googleClientId.trim().length > 0;

  // ─── Forms ───
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  forgotForm!: FormGroup;
  verifyOtpForm!: FormGroup;

  // ─── Verification State ───
  registeredEmail: string = ''; // Registered email for OTP verification
  otpInputs = [0, 1, 2, 3, 4, 5];

  // ─── Password UI State ───
  showLoginPassword = false;
  showRegisterPassword = false;
  showConfirmPassword = false;
  passwordStrength = 0;
  isRequirementsExpanded = false;

  // Subject to end subscriptions when component is destroyed to prevent memory leaks
  private destroy$ = new Subject<void>();
  private googleAccountsInitialized = false;
  private googleButtonRendered = false;
  showGoogleNativeButton = false;
  private readonly googleIdentityScript = 'https://accounts.google.com/gsi/client';
  private readonly fallbackGoogleClientId = '668341342866-ufmo1js3tbrv5nkeakgtn81kjsp9r3if.apps.googleusercontent.com';

  private get googleClientId(): string {
    return environment.googleClientId?.trim() || this.fallbackGoogleClientId;
  }

  private get effectiveGoogleClientId(): string {
    return this.googleClientId === '' ? this.fallbackGoogleClientId : this.googleClientId;
  }

  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[src="' + this.googleIdentityScript + '"]') as HTMLScriptElement | null;
      if (existingScript) {
        if ((window as any).google?.accounts?.id) {
          resolve();
          return;
        }

        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services script.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = this.googleIdentityScript;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services script.'));
      document.head.appendChild(script);
    });
  }

  private initGoogleAccounts(): Promise<void> {
    return new Promise((resolve, reject) => {
      const google = (window as any).google;
      if (!google?.accounts?.id) {
        reject(new Error('google.accounts.id is not available. The Google Identity script may not be loaded.'));
        return;
      }

      if (this.googleAccountsInitialized) {
        resolve();
        return;
      }

      google.accounts.id.initialize({
        client_id: this.effectiveGoogleClientId,
        callback: (response: any) => this.handleGoogleCredentialResponse(response),
        ux_mode: 'popup',
        itp_support: true,
        use_fedcm_for_prompt: false
    });

      this.googleAccountsInitialized = true;
      resolve();
    });
  }

  private renderGoogleButton(): void {
    const google = (window as any).google;
    const container = document.getElementById('google-signin-button-container');
    if (!google?.accounts?.id || !container || this.googleButtonRendered) {
      return;
    }

    google.accounts.id.renderButton(container, {
      theme: 'outline',
      size: 'large',
      width: 280,
      text: 'signin_with',
      shape: 'rectangular',
    });

    this.googleButtonRendered = true;
  }

  private handleGoogleCredentialResponse(response: any): void {
    if (this.isGoogleLoading) return; // Prevent multiple calls
    if (!response?.credential) {
      this.isGoogleLoading = false;
      this.notificationSvc.show(this.translateService.instant('AUTH.NOTIF.GOOGLE_INVALID_CRED'), 'error');
      return;
    }

    this.isGoogleLoading = true;

    this.auth.loginWithGoogle(response.credential)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.isGoogleLoading = false;
          const userName = res?.data?.user?.name || 'there';
          this.notificationSvc.show(this.translateService.instant('AUTH.NOTIF.GOOGLE_WELCOME', { name: userName }), 'success');
          this.close();

          // Smart login redirection
          const userObj = res?.data?.user || res?.user;
          const role = userObj?.role?.toLowerCase() || 'buyer';
          if (role === 'admin') {
            this.router.navigate(['/admin/overview']);
          } else if (role === 'owner') {
            this.router.navigate(['/dashboard/overview']);
          } else {
            this.router.navigate(['/']);
          }
        },
        error: (err: any) => {
          this.isGoogleLoading = false;
          console.error('[Frontend-Google-Error]:', err);
          console.error('[Frontend-Google-Error-Body]:', err.error);
          const msg = err.error?.message || this.translateService.instant('AUTH.NOTIF.GOOGLE_FAILED');
          this.notificationSvc.show(msg, 'error');
          this.errorMsg = msg;
        }
      });
  }

  ngOnInit(): void {
    this.buildForms(); // Build forms when modal opens

    // Monitor Auth service to know when to show or hide the modal
    this.auth.isModalOpen$.pipe(takeUntil(this.destroy$)).subscribe(open => {
      this.isOpen = open;
      if (open) {
        // Reset state when opening
        this.isFormSubmitted = false;
        this.errorMsg = '';
      }
    });

    this.auth.currentModalTab$.pipe(takeUntil(this.destroy$)).subscribe(tab => {
      this.switchTab(tab);
    });

    // Subscribe to global ESC bus — only closes when this modal is actually open.
    // close() → AuthService.closeModal() → isModalOpen$ emits false → isOpen = false.
    // body.style.overflow is reset inside AuthService.closeModal() indirectly via
    // AuthModalComponent reacting to isOpen = false (overlay *ngIf removal).
    this.modalEscape.escape$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isOpen) this.close();
      });
  }

  ngOnDestroy(): void {
    // Cleanup memory when component is destroyed
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Function to build forms and bind them to Validators
  private buildForms(): void {
    // Strong Regex to ensure email format is correct (e.g., name@domain.com)
    const emailRegex = '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$';

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(emailRegex)]],
      password: ['', Validators.required],
    });

    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.pattern(emailRegex)]],
      password: ['', [Validators.required, strongPasswordValidator()]], // Use custom validator
      confirmPassword: ['', Validators.required],
      // Note: Role field removed to simplify registration for users
    }, { validators: passwordsMatchValidator() }); // Ensure passwords match

    // Subscribe to password changes to calculate strength
    this.registerForm.get('password')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
      this.passwordStrength = this.calculateStrength(value);
    });

    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(emailRegex)]]
    });

    this.verifyOtpForm = this.fb.group({
      otp0: ['', [Validators.required, Validators.maxLength(1)]],
      otp1: ['', [Validators.required, Validators.maxLength(1)]],
      otp2: ['', [Validators.required, Validators.maxLength(1)]],
      otp3: ['', [Validators.required, Validators.maxLength(1)]],
      otp4: ['', [Validators.required, Validators.maxLength(1)]],
      otp5: ['', [Validators.required, Validators.maxLength(1)]]
    });
  }

  // ─── Password Helpers ──────────────────────────────────────────────
  togglePasswordVisibility(field: 'login' | 'register' | 'confirm'): void {
    if (field === 'login') this.showLoginPassword = !this.showLoginPassword;
    else if (field === 'register') this.showRegisterPassword = !this.showRegisterPassword;
    else if (field === 'confirm') this.showConfirmPassword = !this.showConfirmPassword;
  }

  toggleRequirements(): void {
    this.isRequirementsExpanded = !this.isRequirementsExpanded;
  }

  private calculateStrength(value: string): number {
    if (!value) return 0;
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) score++;
    return score;
  }

  get passwordHasLength(): boolean {
    return (this.registerForm?.get('password')?.value || '').length >= 8;
  }
  get passwordHasCase(): boolean {
    const val = this.registerForm?.get('password')?.value || '';
    return /[A-Z]/.test(val) && /[a-z]/.test(val);
  }
  get passwordHasNumber(): boolean {
    const val = this.registerForm?.get('password')?.value || '';
    return /[0-9]/.test(val);
  }
  get passwordHasSpecial(): boolean {
    const val = this.registerForm?.get('password')?.value || '';
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val);
  }

  getStrengthLabel(): string {
    if (!this.registerForm?.get('password')?.value) return '';
    switch (this.passwordStrength) {
      case 1: return this.translateService.instant('AUTH.STRENGTH.WEAK');
      case 2: return this.translateService.instant('AUTH.STRENGTH.FAIR');
      case 3: return this.translateService.instant('AUTH.STRENGTH.GOOD');
      case 4: return this.translateService.instant('AUTH.STRENGTH.STRONG');
      default: return '';
    }
  }

  getStrengthColorClass(): string {
    switch (this.passwordStrength) {
      case 1: return 'text-red';
      case 2: return 'text-orange';
      case 3: return 'text-yellow';
      case 4: return 'text-green';
      default: return '';
    }
  }

  // Switch between tabs (Login, Register, Forgot...)
  switchTab(tab: 'login' | 'register' | 'forgot' | 'verify-otp'): void {
    this.activeTab = tab;
    this.errorMsg = '';
    this.isFormSubmitted = false; // Reset errors when switching
    this.isLoading = false;

    // Reset forms when switching to ensure a clean UI (Task 1)
    if (tab === 'login') {
      this.registerForm.reset();
      this.registerForm.markAsPristine();
      this.registerForm.markAsUntouched();
    } else if (tab === 'register') {
      this.loginForm.reset();
      this.loginForm.markAsPristine();
      this.loginForm.markAsUntouched();
    }
  }

  // ─── Forgot Password Flow ──────────────────────────────────────────

  // 1. Navigate to forgot password screen
  goForgot(): void {
    this.switchTab('forgot');
  }

  // 2. Send email to request reset link
  onForgotSubmit(): void {
    if (this.forgotForm.invalid) { this.forgotForm.markAllAsTouched(); return; }
    this.isLoading = true;
    this.errorMsg = '';

    const email = this.forgotForm.value.email;

    this.auth.forgotPassword(email).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isLoading = false;
        this.notificationSvc.show(this.translateService.instant('AUTH.NOTIF.RESET_SENT', { email }), 'info');
        this.switchTab('login');
      },
      error: () => {
        this.isLoading = false;
        // For security reasons, show the same message even if email doesn't exist
        this.notificationSvc.show(this.translateService.instant('AUTH.NOTIF.RESET_SENT', { email }), 'info');
        this.switchTab('login');
      }
    });
  }

  // ─── Auth Logic (Login & Register) ─────────────────────

  onLogin(): void {
    this.isFormSubmitted = true;
    if (this.loginForm.invalid) return;
    this.isLoading = true;
    this.errorMsg = '';
    const { email, password } = this.loginForm.value;

    this.auth.login(email, password).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        // Fix: Properly extract the user's name from the normalized backend response (Task 4)
        const userObj = res?.data?.user || res?.user;
        const userName = userObj?.name || 'there';
        this.notificationSvc.show(this.translateService.instant('AUTH.NOTIF.WELCOME_BACK', { name: userName }), 'success');
        this.close(); // If success, close the modal

        // Smart login redirection
        const role = userObj?.role?.toLowerCase() || 'buyer';
        if (role === 'admin') {
          this.router.navigate(['/admin/overview']);
        } else if (role === 'owner') {
          this.router.navigate(['/dashboard/overview']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMsg = err.error?.message || this.translateService.instant('AUTH.NOTIF.INVALID_CREDENTIALS');
      }
    });
  }

  onRegister(): void {
    this.isFormSubmitted = true;
    if (this.registerForm.invalid) return;
    this.isLoading = true;
    this.errorMsg = '';

    const { name, email, password } = this.registerForm.value;

    // 🔒 SECURITY FIX: The 'role' is strictly managed by the backend to prevent privilege escalation.
    // The frontend only sends user credentials; the backend securely assigns the default 'buyer' role.
    this.auth.register(name, email, password).pipe(takeUntil(this.destroy$)).subscribe({
      next: (user: any) => {
        this.isLoading = false;
        this.notificationSvc.show(this.translateService.instant('AUTH.NOTIF.REGISTRATION_INFO'), 'info');
        this.registeredEmail = email; // Save email for verification
        this.registerForm.reset();

        // Navigate to OTP verification page
        this.close();
        this.router.navigate(['/verify-otp'], { queryParams: { email } });
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMsg = err.error?.message || this.translateService.instant('AUTH.NOTIF.REGISTRATION_FAILED');
      }
    });
  }

  // Verify email using OTP code
  onVerifyOtpSubmit(): void {
    if (this.verifyOtpForm.invalid) { this.verifyOtpForm.markAllAsTouched(); return; }
    this.isLoading = true;
    this.errorMsg = '';

    const val = this.verifyOtpForm.value;
    const otp = `${val.otp0}${val.otp1}${val.otp2}${val.otp3}${val.otp4}${val.otp5}`;

    if (otp.length !== 6) {
      this.errorMsg = this.translateService.instant('AUTH.NOTIF.OTP_ALL_DIGITS');
      this.isLoading = false;
      return;
    }

    this.auth.verifyAccount(this.registeredEmail, otp).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isLoading = false;
        this.notificationSvc.show(this.translateService.instant('AUTH.NOTIF.EMAIL_VERIFIED'), 'success');
        const emailToPrepopulate = this.registeredEmail;
        this.registeredEmail = '';
        this.verifyOtpForm.reset();

        // Reset and switch to login (Task 1)
        this.switchTab('login');
        this.loginForm.patchValue({ email: emailToPrepopulate }); // Pre-populate email for convenience
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMsg = err.error?.message || this.translateService.instant('AUTH.NOTIF.INVALID_OTP');
      }
    });
  }

  // ─── UI Helpers ─────────────────────

  close(): void { this.auth.closeModal(); }

  // Close modal if user clicks on the overlay (outside area)
  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('auth-overlay')) this.close();
  }

  // Check if field is invalid (show only after form submission)
  isFieldInvalid(form: FormGroup, field: string): boolean {
    const ctrl = form.get(field);
    return !!(ctrl && ctrl.invalid && this.isFormSubmitted);
  }

  // ─── OTP Helpers ──────────────────────────────────────────────────
  onOtpInput(event: any, index: number): void {
    const value = event.target.value;
    if (value.length >= 1 && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
  }

  onOtpKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && index > 0) {
      const input = event.target as HTMLInputElement;
      if (input.value === '') {
        const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement;
        if (prevInput) prevInput.focus();
      }
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text/plain') || '';
    const numbersOnly = pastedData.replace(/\D/g, '').slice(0, 6);

    if (numbersOnly.length > 0) {
      const chars = numbersOnly.split('');
      const patchObj: any = {};
      chars.forEach((char, i) => {
        patchObj[`otp${i}`] = char;
      });
      this.verifyOtpForm.patchValue(patchObj);

      const focusIndex = Math.min(chars.length, 5);
      const nextInput = document.getElementById(`otp-${focusIndex}`) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
  }

  // ─── Google Sign-In Handler (Task 1.4) ────────────────────────────────────
  onGoogleSignIn(): void {
    if (!this.isGoogleConfigured) {
      this.notificationSvc.show(
        this.translateService.instant('AUTH.NOTIF.GOOGLE_NOT_CONFIGURED'),
        'error'
      );
      return;
    }

    if (this.isGoogleLoading) return;
    this.isGoogleLoading = true;
    this.errorMsg = '';

    this.loadGoogleScript()
      .then(() => this.initGoogleAccounts())
      .then(() => {
        const google = (window as any).google;
        if (!google?.accounts?.id) {
          throw new Error('Google Identity Services have not been initialized.');
        }

        this.showGoogleNativeButton = true;
        this.renderGoogleButton();
        this.isGoogleLoading = false;
      })
      .catch((err: any) => {
        this.isGoogleLoading = false;

        if (!environment.production) {
          console.error('[GoogleAuth] initialization failed:', err);
        }

        this.notificationSvc.show(
          this.translateService.instant('AUTH.NOTIF.GOOGLE_INIT_FAILED'),
          'error'
        );
      });
  }

}