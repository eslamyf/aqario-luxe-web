import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
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
  isSubmitting = false;
  currentView: 'table' | 'form' | 'success' = 'table';
  lastCreatedProperty: any = null;

  // ── Multi-Image Upload State ──
  selectedFiles: File[] = [];
  imagePreviews: string[] = [];
  isDragging = false;

  form!: FormGroup;

  private destroy$ = new Subject<void>();
  private router = inject(Router);

  constructor(
    private userService: UserDashboardService,
    private fb: FormBuilder,
    private notif: NotificationService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.load();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }



  buildForm(): void {
    this.form = this.fb.group({
      title: this.fb.group({
        en: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(100)]],
        ar: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(100)]]
      }),
      description: this.fb.group({
        en: ['', [Validators.required, Validators.minLength(20)]],
        ar: ['', [Validators.required, Validators.minLength(20)]]
      }),
      price:       [null, [Validators.required, Validators.min(1)]],
      area:        [null],
      rooms:       [null],
      bedrooms:    [null],
      bathrooms:   [null],
      city: this.fb.group({
        en: ['', Validators.required],
        ar: ['', Validators.required]
      }),
      district: this.fb.group({
        en: ['', Validators.required],
        ar: ['', Validators.required]
      }),
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



  // ── Multi-image selection ──
  onFilesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.handleFiles(Array.from(input.files));
    input.value = ''; // Reset
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    if (!event.dataTransfer || event.dataTransfer.files.length === 0) return;
    this.handleFiles(Array.from(event.dataTransfer.files));
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  private handleFiles(files: File[]): void {
    const totalAfter = this.selectedFiles.length + files.length;

    if (totalAfter > 10) {
      this.notif.show(this.translate.instant('DASHBOARD.FORM.NOTIF.MAX_IMAGES_ERROR'), 'error');
      return;
    }

    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        this.notif.show(this.translate.instant('DASHBOARD.FORM.NOTIF.INVALID_IMAGE_ERROR', { fileName: file.name }), 'error');
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
  }

  removeImage(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.imagePreviews.splice(index, 1);
  }

  resetForm(): void {
    this.form.reset({ type: 'apartment', listingType: 'sale', currency: 'USD' });
    this.selectedFiles = [];
    this.imagePreviews = [];
    this.currentView = 'table';
  }

  onPromote(type: string, paymentMethod: string): void {
    if (!this.lastCreatedProperty) return;
    
    this.userService.initiatePromotion(this.lastCreatedProperty._id, type, paymentMethod)
      .subscribe({
        next: (res: any) => {
          if (res.data?.paymentUrl) {
            window.location.href = res.data.paymentUrl;
          }
        },
        error: (err: any) => this.notif.show(this.translate.instant('DASHBOARD.FORM.NOTIF.PROMOTION_FAILED'), 'error')
      });
  }

  submitProperty(): void {
    if (this.isSubmitting) return; // Guard: prevent programmatic double-submit bypassing button disabled state
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notif.show(this.translate.instant('DASHBOARD.FORM.NOTIF.REQUIRED_FIELDS_ERROR'), 'error');
      return;
    }

    this.isSubmitting = true;
    const fd = new FormData();
    const v = this.form.value;

    // ── Required fields ──
    fd.append('title[en]', v.title.en);
    fd.append('title[ar]', v.title.ar);
    fd.append('description[en]', v.description.en);
    fd.append('description[ar]', v.description.ar);
    fd.append('price', String(v.price));
    fd.append('type', v.type);
    fd.append('listingType', v.listingType);
    fd.append('currency', v.currency || 'USD');

    // ── Location (nested object → bracket notation) ──
    fd.append('location[city][en]', v.city.en);
    fd.append('location[city][ar]', v.city.ar);
    fd.append('location[district][en]', v.district.en);
    fd.append('location[district][ar]', v.district.ar);
    if (v.address) fd.append('location[street]', v.address);

    // ── Optional numeric fields ──
    if (v.area != null && v.area !== '')     fd.append('area', String(v.area));
    if (v.rooms != null && v.rooms !== '')   fd.append('rooms', String(v.rooms));
    if (v.bedrooms != null && v.bedrooms !== '') fd.append('bedrooms', String(v.bedrooms));
    if (v.bathrooms != null && v.bathrooms !== '') fd.append('bathrooms', String(v.bathrooms));

    // ── Images (multiple) ──
    this.selectedFiles.forEach(file => fd.append('images', file));

    this.userService.createProperty(fd)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.notif.show(this.translate.instant('DASHBOARD.FORM.NOTIF.SUBMIT_SUCCESS'), 'success');
          this.lastCreatedProperty = res.data;
          this.isSubmitting = false;
          this.currentView = 'success';
          this.load();
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
