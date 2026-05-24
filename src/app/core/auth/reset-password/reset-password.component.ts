import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../auth.service';
import { strongPasswordValidator, passwordsMatchValidator } from '../auth-modal/auth-modal.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private translateService = inject(TranslateService);

  resetForm!: FormGroup;
  token: string | null = null;
  isLoading = false;
  errorMsg = '';
  successMsg = '';
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token');
    if (!this.token) {
      this.errorMsg = this.translateService.instant('AUTH.RESET_PAGE.INVALID_LINK');
    }

    this.resetForm = this.fb.group({
      password: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordsMatchValidator() });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.resetForm.get(field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  onSubmit(): void {
    if (this.resetForm.invalid || !this.token) { 
      this.resetForm.markAllAsTouched(); 
      return; 
    }
    
    this.isLoading = true;
    this.errorMsg = '';
    
    const password = this.resetForm.value.password;
    
    this.auth.resetPassword(this.token, password).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMsg = this.translateService.instant('AUTH.RESET_PAGE.SUCCESS');
        setTimeout(() => {
          this.router.navigate(['/']);
          this.auth.openModal('login');
        }, 2000);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err.error?.message || this.translateService.instant('AUTH.RESET_PAGE.FAILED');
      }
    });
  }
}
