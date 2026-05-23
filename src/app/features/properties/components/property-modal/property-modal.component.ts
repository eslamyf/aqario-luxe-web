// ─────────────────────────────────────────────────────────────────────────────
// LUXE ESTATES — Property Modal Component
// Visual reference: Template/index.html — .prop-modal-overlay (lines 1104–1150)
// Task 06: Schedule Viewing + Make Inquiry with auth guard + reactive forms
// ─────────────────────────────────────────────────────────────────────────────

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  HostListener,
  inject,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Property } from '../../models/property.model';
import { PropertiesService } from '../../services/properties.service';
import { PropertyActionsService, ViewingRequestPayload } from '../../services/property-actions.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { TranslateService } from '@ngx-translate/core';

// ── Which inline form is currently visible ────────────────────────────────────
type ActiveForm = 'none' | 'viewing' | 'inquiry';

@Component({
  selector: 'app-property-modal',
  templateUrl: './property-modal.component.html',
  styleUrls: ['./property-modal.component.scss'],
})
export class PropertyModalComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private propertiesService = inject(PropertiesService);
  private propertyActionsService = inject(PropertyActionsService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private translateService = inject(TranslateService);

  // ── Inputs / Outputs ──────────────────────────────────────────────────────
  @Input() property!: Property;
  @Output() closed = new EventEmitter<void>();

  // ── Animation state ───────────────────────────────────────────────────────
  isActive   = false;

  // ── Form state ────────────────────────────────────────────────────────────
  activeForm: ActiveForm = 'none';
  isSubmitting           = false;

  viewingForm!: FormGroup;
  inquiryForm!: FormGroup;

  private destroy$ = new Subject<void>();

  private rawProperty!: Property;

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Lock body scroll
    document.body.style.overflow = 'hidden';

    // Entry animation — next frame so CSS transition fires correctly
    requestAnimationFrame(() => { this.isActive = true; });

    // Save raw property and translate it
    this.rawProperty = this.property;
    this.property = this.propertiesService.translateProperty(this.rawProperty);

    // Listen for language changes to update translation in place
    this.translateService.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (this.rawProperty) {
          this.property = this.propertiesService.translateProperty(this.rawProperty, event.lang);
        }
      });

    // ── Reactive forms (Style B inputs per coding-rules.md §3.5) ─────────
    this.viewingForm = this.fb.group({
      preferredDate: ['', Validators.required],
      preferredTime: ['', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)]],
    });

    this.inquiryForm = this.fb.group({
      message: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown.escape')
  onEscKey(): void { this.close(); }

  close(): void {
    this.isActive = false;
    setTimeout(() => this.closed.emit(), 400);
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('prop-modal-overlay')) {
      this.close();
    }
  }

  get formattedPrice(): string {
    return this.propertiesService.formatPrice(
      this.property.price,
      this.property.currency ?? 'USD',
      this.property.status
    );
  }

  get mainImage():  string | null { return this.property.images?.[0] ?? null; }
  get sideImage1(): string | null { return this.property.images?.[1] ?? null; }
  get sideImage2(): string | null { return this.property.images?.[2] ?? null; }

  get minDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  onScheduleViewingClick(): void {
    if (!this.authService.isAuthenticated()) {
      this.authService.openModal('login');
      this.notificationService.show(this.translateService.instant('PROPERTIES.DETAIL.NOTIF.SIGN_IN_VIEWING'), 'info');
      return;
    }
    this.activeForm = this.activeForm === 'viewing' ? 'none' : 'viewing';
  }

  submitViewing(): void {
    if (this.viewingForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    const payload: ViewingRequestPayload = {
      propertyId:    this.property._id,
      preferredDate: this.viewingForm.get('preferredDate')!.value as string,
      preferredTime: this.viewingForm.get('preferredTime')!.value as string,
    };

    this.propertyActionsService
      .scheduleViewing(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          this.isSubmitting = false;
          if (success) {
            this.notificationService.show(
              this.translateService.instant('PROPERTIES.DETAIL.NOTIF.VIEWING_SCHEDULED_CONFIRM'),
              'success'
            );
            this.activeForm = 'none';
            this.viewingForm.reset();
          } else {
            this.notificationService.show(this.translateService.instant('PROPERTIES.DETAIL.NOTIF.FAILED_VIEWING_TRY'), 'error');
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          this.notificationService.show(err.error?.message || 'An error occurred. Please try again.', 'error');
        }
      });
  }

  onMakeInquiryClick(): void {
    if (!this.authService.isAuthenticated()) {
      this.authService.openModal('login');
      this.notificationService.show(this.translateService.instant('PROPERTIES.DETAIL.NOTIF.SIGN_IN_INQUIRY'), 'info');
      return;
    }
    this.activeForm = this.activeForm === 'inquiry' ? 'none' : 'inquiry';
  }

  submitInquiry(): void {
    if (this.inquiryForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    const message = (this.inquiryForm.get('message')!.value as string).trim();

    if (!message) {
      this.notificationService.show(this.translateService.instant('PROPERTIES.DETAIL.NOTIF.MESSAGE_EMPTY'), 'error');
      this.isSubmitting = false;
      return;
    }

    this.propertyActionsService
      .makeInquiry(this.property._id, message)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          this.isSubmitting = false;
          if (success) {
            this.notificationService.show(this.translateService.instant('PROPERTIES.DETAIL.NOTIF.INQUIRY_SENT_SHORT'), 'success');
            this.activeForm = 'none';
            this.inquiryForm.reset();
          } else {
            this.notificationService.show(this.translateService.instant('PROPERTIES.DETAIL.NOTIF.FAILED_SEND_TRY'), 'error');
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          this.notificationService.show(err.error?.message || 'An error occurred. Please try again.', 'error');
        }
      });
  }
}
