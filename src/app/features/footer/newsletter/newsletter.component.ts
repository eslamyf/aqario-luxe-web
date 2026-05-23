// ============================================================
// LUXE ESTATES — Newsletter Component
// Reference: Template/index.html .newsletter-section (lines 1743–1757)
// Coding rules: §3.5 Style A inputs, §5.5 NotificationService,
//               §3.1 eyebrow, §4 scroll reveal, §5.1 SCSS import
// ============================================================

import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-newsletter',
  templateUrl: './newsletter.component.html',
  styleUrls: ['./newsletter.component.scss'],
})
export class NewsletterComponent implements OnDestroy {

  // ── Reactive form (task spec) ─────────────────────────────
  newsletterForm: FormGroup;

  // ── Double-submit guard ───────────────────────────────────
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private notificationService: NotificationService, // §5.5 — never alert()
    private translateService: TranslateService,
  ) {
    this.newsletterForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  // ── Convenience getter for the email control ──────────────
  get emailControl() {
    return this.newsletterForm.get('email')!;
  }

  // ── Show error only when touched AND invalid ──────────────
  get showError(): boolean {
    return this.emailControl.invalid && this.emailControl.touched;
  }

  // ── Submit handler ────────────────────────────────────────
  onSubmit(): void {
    // Mark all as touched to trigger validation messages
    this.newsletterForm.markAllAsTouched();

    if (this.newsletterForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;

    // §5.5 — use NotificationService, NEVER alert()
    this.notificationService.show(
      this.translateService.instant('HOME.NEWSLETTER.SUCCESS_MSG'),
      'success'
    );

    this.newsletterForm.reset();
    this.isSubmitting = false;
  }

  ngOnDestroy(): void {
    // No subscriptions to clean up — FormGroup manages itself
  }
}
