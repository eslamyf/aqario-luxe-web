import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';
import { UserDashboardService, OwnerAgentDashboard } from './user-dashboard.service';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-user-properties',
  templateUrl: './user-properties.component.html',
  styleUrls: ['./user-properties.component.scss']
})
export class UserPropertiesComponent implements OnInit, OnDestroy {
  properties: any[] = [];
  isLoading = false;
  showAddForm = false;
  isSubmitting = false;

  // ── Multi-Image Upload State ──
  selectedFiles: File[] = [];
  imagePreviews: string[] = [];

  form!: FormGroup;

  // ── Subscription State ──
  plans: any[] = [];
  activeSub: any = null;
  isSubscribed = false;
  isPaymentPending = false;
  isAtLimit = false;

  private destroy$ = new Subject<void>();
  private router = inject(Router);

  constructor(
    private userService: UserDashboardService,
    private fb: FormBuilder,
    private notif: NotificationService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.load();
    this.loadSubscriptionContext();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  loadSubscriptionContext(): void {
    // We fetch fresh data to ensure we see the latest subscription state from DB
    this.userService.getMe()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        const dash = res.dashboard;
        if (dash && 'subscription' in dash) {
          const ownerDash = dash as OwnerAgentDashboard;
          this.activeSub = ownerDash.subscription;
          this.isSubscribed = !!this.activeSub && this.activeSub.status === 'active' && this.activeSub.paymentVerified;
          this.isPaymentPending = !!this.activeSub && !this.activeSub.paymentVerified;
          this.isAtLimit = this.activeSub && 
                          this.activeSub.listingsLimit !== -1 && 
                          this.activeSub.listingsUsed >= this.activeSub.listingsLimit;
          
          console.log('✅ Subscription context loaded:', {
            isSubscribed: this.isSubscribed,
            isPaymentPending: this.isPaymentPending,
            plan: this.activeSub?.plan
          });
        }
      });

    this.userService.getPlans()
      .pipe(takeUntil(this.destroy$))
      .subscribe(plans => this.plans = plans);
  }

  buildForm(): void {
    this.form = this.fb.group({
      title:       ['', [Validators.required, Validators.minLength(10), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      price:       [null, [Validators.required, Validators.min(1)]],
      area:        [null],
      bedrooms:    [null],
      bathrooms:   [null],
      city:        ['', Validators.required],
      district:    ['', Validators.required],
      address:     [''],
      type:        ['apartment', Validators.required],
      listingType: ['sale', Validators.required],
      currency:    ['USD'],
    });
  }

  load(): void {
    this.isLoading = true;
    this.userService.getMyProperties()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.properties = data; this.isLoading = false; },
        error: () => { this.isLoading = false; },
      });
  }

  onSubscribe(planId: string): void {
    this.router.navigate(['/subscribe'], { queryParams: { plan: planId } });
  }

  resumePayment(): void {
    if (this.activeSub?.plan) {
      this.router.navigate(['/subscribe'], { queryParams: { plan: this.activeSub.plan } });
    }
  }

  // ── Multi-image selection ──
  onFilesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const newFiles = Array.from(input.files);
    const totalAfter = this.selectedFiles.length + newFiles.length;

    if (totalAfter > 10) {
      this.notif.show('You can upload a maximum of 10 images.', 'error');
      return;
    }

    newFiles.forEach(file => {
      if (!file.type.startsWith('image/')) {
        this.notif.show(`"${file.name}" is not a valid image file.`, 'error');
        return;
      }
      this.selectedFiles.push(file);

      // Generate preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreviews.push(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    });

    // Reset file input so same files can be re-added after removal
    input.value = '';
  }

  removeImage(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.imagePreviews.splice(index, 1);
  }

  resetForm(): void {
    this.form.reset({ type: 'apartment', listingType: 'sale', currency: 'USD' });
    this.selectedFiles = [];
    this.imagePreviews = [];
    this.showAddForm = false;
  }

  submitProperty(): void {
    if (this.isSubmitting) return; // Guard: prevent programmatic double-submit bypassing button disabled state
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notif.show('Please fill in all required fields.', 'error');
      return;
    }

    this.isSubmitting = true;
    const fd = new FormData();
    const v = this.form.value;

    // ── Required fields ──
    fd.append('title', v.title);
    fd.append('description', v.description);
    fd.append('price', String(v.price));
    fd.append('type', v.type);
    fd.append('listingType', v.listingType);
    fd.append('currency', v.currency || 'USD');

    // ── Location (nested object → bracket notation) ──
    fd.append('location[city]', v.city);
    fd.append('location[district]', v.district);
    if (v.address) fd.append('location[street]', v.address);

    // ── Optional numeric fields ──
    if (v.area != null && v.area !== '')     fd.append('area', String(v.area));
    if (v.bedrooms != null && v.bedrooms !== '') fd.append('bedrooms', String(v.bedrooms));
    if (v.bathrooms != null && v.bathrooms !== '') fd.append('bathrooms', String(v.bathrooms));

    // ── Images (multiple) ──
    this.selectedFiles.forEach(file => fd.append('images', file));

    this.userService.createProperty(fd)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notif.show('Property submitted for review! ✅', 'success');
          this.isSubmitting = false;
          this.resetForm();
          this.load();
          // Refresh dashboard data so usage counter updates immediately
          this.userService.getMe().pipe(takeUntil(this.destroy$)).subscribe();
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('❌ Property Submission Error:', err);
          
          const errArr = err?.error?.errors;
          const msg = (Array.isArray(errArr) && errArr.length > 0 ? errArr[0] : null)
                   || err?.error?.message
                   || err?.message
                   || 'Failed to submit property. Check console for details.';
          
          this.notif.show(msg, 'error');
        },
      });
  }

  getApproval(p: any): string {
    return p.approvalStatus || 'pending';
  }
}
