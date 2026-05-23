import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, Observable, of, BehaviorSubject } from 'rxjs';
import { takeUntil, switchMap, map, catchError, tap } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

import { PropertiesService } from '../../services/properties.service';
import { FavoritesService } from '../../services/favorites.service';
import { ReviewsService } from '../../services/reviews.service';
import { PropertyActionsService, ViewingRequestPayload } from '../../services/property-actions.service';
import { InquiryService } from '../../../../core/services/inquiry.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { Property } from '../../models/property.model';
import { BookingsService } from '../../../../features/bookings/bookings.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { ViewingService, ViewingStatus } from '../../services/viewing.service';

@Component({
  selector: 'app-property-detail',
  templateUrl: './property-detail.component.html',
  styleUrls: ['./property-detail.component.scss']
})
export class PropertyDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  private propertiesService = inject(PropertiesService);
  private favoritesService  = inject(FavoritesService);
  private reviewsService    = inject(ReviewsService);
  private propertyActionsService = inject(PropertyActionsService);
  private inquiryService    = inject(InquiryService);
  private viewingService    = inject(ViewingService);

  public authService          = inject(AuthService);
  private notificationService = inject(NotificationService);
  private bookingsService     = inject(BookingsService);
  private loadingService      = inject(LoadingService);
  private translateService    = inject(TranslateService);

  property: Property | null = null;
  reviews$:    Observable<any[]>              = of([]);
  isFavorited$: Observable<boolean>           = of(false);

  // ── Viewing / Booking State Machine ────────────────────────
  private viewingStatusSubject = new BehaviorSubject<ViewingStatus>({
    eligible: false,
    viewingStatus: null,
    viewingId: null
  });
  viewingStatus$: Observable<ViewingStatus> = this.viewingStatusSubject.asObservable();

  isLoading = true;
  error: string | null = null;

  activeImageIndex = 0;

  viewingForm!: FormGroup;
  inquiryForm!: FormGroup;
  bookingForm!: FormGroup;
  isSubmittingViewing = false;
  isSubmittingInquiry = false;
  isSubmittingBooking = false;

  showCallModal = false;

  private destroy$ = new Subject<void>();

  private rawProperty: Property | null = null;

  ngOnInit(): void {
    this.buildForms();

    // Listen for language changes to update translation in place
    this.translateService.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (this.rawProperty) {
          this.property = this.propertiesService.translateProperty(this.rawProperty, event.lang);
        }
      });

    this.route.paramMap.pipe(
      takeUntil(this.destroy$),
      map(params => params.get('id')),
      tap(() => {
        this.isLoading = true;
        this.error = null;
      }),
      switchMap(id => {
        if (!id) {
          this.isLoading = false;
          return of(null);
        }
        return this.propertiesService.getPropertyById(id).pipe(
          catchError(err => {
            this.error = this.translateService.instant('PROPERTIES.DETAIL.NOTIF.FAILED_LOAD');
            this.isLoading = false;
            return of(null);
          })
        );
      })
    ).subscribe(property => {
      this.rawProperty = property;
      this.property = property ? this.propertiesService.translateProperty(property) : null;
      this.isLoading = false;
      if (property) {
        this.loadAdditionalData(property._id);
        this.refreshViewingStatus(property._id);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildForms(): void {
    this.viewingForm = this.fb.group({
      preferredDate: ['', Validators.required],
      preferredTime: ['', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)]]
    });

    this.inquiryForm = this.fb.group({
      message: ['', [Validators.required, Validators.minLength(10)]]
    });

    this.bookingForm = this.fb.group({
      start_date: ['', Validators.required],
      end_date:   ['', Validators.required]
    });
  }

  private loadAdditionalData(id: string): void {
    this.reviews$ = this.reviewsService.getReviewsByPropertyId(id).pipe(
      catchError(() => of([]))
    );
    this.isFavorited$ = this.favoritesService.isFavorited$(id);
  }

  /** Refresh the viewing eligibility state from the backend */
  refreshViewingStatus(propertyId: string): void {
    if (!this.authService.isAuthenticated()) return;
    this.viewingService.checkViewingStatus(propertyId).subscribe(status => {
      this.viewingStatusSubject.next(status);
    });
  }

  /** Derive the booking button state from viewing status */
  getBookingState(viewingStatus: ViewingStatus): 'locked' | 'pending' | 'eligible' {
    return this.viewingService.getBookingState(viewingStatus);
  }

  // ── Date helpers ───────────────────────────────────────────

  get minDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  get minEndDate(): string {
    const start = this.bookingForm.get('start_date')?.value;
    if (!start) return this.minDate;
    const date = new Date(start);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }

  get nights(): number {
    const start = this.bookingForm.get('start_date')?.value;
    const end   = this.bookingForm.get('end_date')?.value;
    if (!start || !end) return 0;
    const timeDiff = new Date(end).getTime() - new Date(start).getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return days > 0 ? days : 0;
  }

  getBookingTotal(pricePerNight: number): number {
    return this.nights * pricePerNight;
  }

  setActiveImage(index: number): void {
    this.activeImageIndex = index;
  }

  // ── Actions ────────────────────────────────────────────────

  onToggleFavorite(propertyId: string): void {
    if (!this.authService.isAuthenticated()) {
      this.authService.openModal('login');
      this.notificationService.show(this.translateService.instant('PROPERTIES.NOTIF.SIGN_IN_FAVORITES'), 'info');
      return;
    }
    this.favoritesService.toggleFavorite(propertyId).subscribe({
      next: (isFav) => this.notificationService.show(
        this.translateService.instant(isFav ? 'PROPERTIES.NOTIF.ADDED_FAVORITES' : 'PROPERTIES.NOTIF.REMOVED_FAVORITES'),
        isFav ? 'success' : 'info'
      ),
      error: () => this.notificationService.show(this.translateService.instant('PROPERTIES.NOTIF.FAILED_FAVORITES'), 'error')
    });
  }

  onScheduleViewing(propertyId: string): void {
    if (!this.authService.isAuthenticated()) {
      this.authService.openModal('login');
      this.notificationService.show('Sign in to schedule a viewing', 'info');
      return;
    }

    if (this.viewingForm.invalid || this.isSubmittingViewing) return;

    this.isSubmittingViewing = true;

    const payload: ViewingRequestPayload = {
      propertyId,
      preferredDate: this.viewingForm.get('preferredDate')?.value,
      preferredTime: this.viewingForm.get('preferredTime')?.value,
    };

    this.propertyActionsService.scheduleViewing(payload).subscribe({
      next: (success) => {
        this.isSubmittingViewing = false;
        if (success) {
          this.notificationService.show(this.translateService.instant('PROPERTIES.DETAIL.NOTIF.VIEWING_REQUESTED'), 'success');
          this.viewingForm.reset();
          // Refresh state so button transitions to 'pending'
          this.refreshViewingStatus(propertyId);
        } else {
          this.notificationService.show(this.translateService.instant('PROPERTIES.DETAIL.NOTIF.FAILED_VIEWING'), 'error');
        }
      },
      error: (err) => {
        this.isSubmittingViewing = false;
        this.notificationService.show(err.error?.message || this.translateService.instant('PROPERTIES.DETAIL.NOTIF.ERROR_OCCURRED'), 'error');
      }
    });
  }

  onSendInquiry(propertyId: string): void {
    if (!this.authService.isAuthenticated()) {
      this.authService.openModal('login');
      this.notificationService.show(this.translateService.instant('PROPERTIES.DETAIL.NOTIF.SIGN_IN_INQUIRY'), 'info');
      return;
    }

    if (this.inquiryForm.invalid || this.isSubmittingInquiry) return;

    this.isSubmittingInquiry = true;
    const message = this.inquiryForm.get('message')?.value;

    this.inquiryService.makeInquiry(propertyId, message).subscribe({
      next: (success) => {
        this.isSubmittingInquiry = false;
        if (success) {
          this.notificationService.show(this.translateService.instant('PROPERTIES.DETAIL.NOTIF.INQUIRY_SENT'), 'success');
          this.inquiryForm.reset();
        } else {
          this.notificationService.show(this.translateService.instant('PROPERTIES.DETAIL.NOTIF.FAILED_INQUIRY'), 'error');
        }
      },
      error: (err) => {
        this.isSubmittingInquiry = false;
        this.notificationService.show(err.error?.message || this.translateService.instant('PROPERTIES.DETAIL.NOTIF.ERROR_OCCURRED'), 'error');
      }
    });
  }

  onBookProperty(property: Property, viewingStatus: ViewingStatus): void {
    if (!this.authService.isAuthenticated()) {
      this.authService.openModal('login');
      this.notificationService.show(this.translateService.instant('PROPERTIES.DETAIL.NOTIF.SIGN_IN_BOOK'), 'info');
      return;
    }

    if (this.authService.currentUser?.role !== 'buyer') {
      this.notificationService.show(this.translateService.instant('PROPERTIES.DETAIL.NOTIF.BUYER_ONLY'), 'error');
      return;
    }

    // ── Viewing Gate (client-side check) ─────────────────────
    if (!viewingStatus.eligible) {
      if (viewingStatus.viewingStatus === 'pending') {
        this.notificationService.show(this.translateService.instant('PROPERTIES.DETAIL.NOTIF.VIEWING_UNDER_REVIEW_HINT'), 'info');
      } else {
        this.notificationService.show(this.translateService.instant('PROPERTIES.DETAIL.NOTIF.VIEWING_REQUIRED_HINT'), 'info');
      }
      return;
    }

    if (property.status !== 'for-sale' && this.bookingForm.invalid) return;
    if (this.isSubmittingBooking) return;

    let start: Date;
    let end: Date;

    if (property.status === 'for-sale') {
      // Auto-generate dates for purchases to satisfy backend validation
      start = new Date();
      start.setDate(start.getDate() + 1);
      end = new Date();
      end.setDate(end.getDate() + 2);
    } else {
      start = new Date(this.bookingForm.get('start_date')?.value);
      end   = new Date(this.bookingForm.get('end_date')?.value);
      
      if (start >= end) {
        this.notificationService.show(this.translateService.instant('PROPERTIES.DETAIL.NOTIF.CHECKOUT_AFTER_CHECKIN'), 'error');
        return;
      }
    }

    this.isSubmittingBooking = true;
    this.loadingService.show();

    const req = {
      propertyId: property._id,
      start_date: start.toISOString(),
      end_date:   end.toISOString(),
      amount:     property.status === 'for-sale' ? property.price : this.getBookingTotal(property.price)
    };

    this.bookingsService.createBooking(req).subscribe({
      next: (res) => {
        this.isSubmittingBooking = false;
        this.loadingService.hide();
        this.notificationService.show(this.translateService.instant('PROPERTIES.DETAIL.NOTIF.BOOKING_CONFIRMED'), 'success');
        this.bookingForm.reset();
        if (res?.data?.booking?._id) {
          this.router.navigate(['/checkout', res.data.booking._id]);
        }
      },
      error: (err) => {
        this.isSubmittingBooking = false;
        this.loadingService.hide();
        const msg = err.error?.code === 'VIEWING_REQUIRED'
          ? err.error.message
          : (err.error?.message || this.translateService.instant('PROPERTIES.DETAIL.NOTIF.FAILED_BOOKING'));
        this.notificationService.show(msg, 'error');
      }
    });
  }

  formatPrice(price: number, currency: string, status: 'for-sale' | 'for-rent'): string {
    return this.propertiesService.formatPrice(price, currency, status);
  }

  openCallModal(): void {
    if (!this.property?.owner?.phone) {
      this.notificationService.show(this.translateService.instant('PROPERTIES.DETAIL.NOTIF.PHONE_NOT_AVAILABLE'), 'info');
      return;
    }
    this.showCallModal = true;
  }

  closeCallModal(): void {
    this.showCallModal = false;
  }

  openWhatsApp(property: Property): void {
    if (!property?.owner?.phone) {
      this.notificationService.show(this.translateService.instant('PROPERTIES.DETAIL.NOTIF.WHATSAPP_NOT_AVAILABLE'), 'info');
      return;
    }
    let phone = property.owner.phone.replace(/\D/g, '');
    
    // Auto-format Egyptian numbers (01x) to international format (201x)
    // WhatsApp Desktop drops the pre-filled text if the number is not in international format
    if (phone.startsWith('01') && phone.length === 11) {
      phone = '2' + phone;
    }
    
    const refNumber = this.generateReferenceNumber(property);
    const message = this.translateService.instant('PROPERTIES.DETAIL.NOTIF.WHATSAPP_MESSAGE', { refNumber });
    
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  getEmailUrl(property: Property): string {
    if (!property?.owner?.email) {
      return 'javascript:void(0)';
    }
    const refNumber = this.generateReferenceNumber(property);
    const subject = this.translateService.instant('PROPERTIES.DETAIL.NOTIF.EMAIL_SUBJECT', { title: property.title });
    const body = this.translateService.instant('PROPERTIES.DETAIL.NOTIF.EMAIL_BODY', { name: property.owner.name, refNumber });
    // Using Gmail Web Compose URL to bypass issues where the user has no default OS mail client configured
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${property.owner.email}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  generateReferenceNumber(property: Property | null): string {
    if (!property) return '';

    // 1. Owner initials (e.g., "Eslam Yasser" -> "EY")
    let ownerInitials = 'AG';
    if (property.owner?.name) {
      const nameParts = property.owner.name.split(' ').filter(p => p.length > 0);
      if (nameParts.length > 1) {
        ownerInitials = (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
      } else if (nameParts.length === 1) {
        ownerInitials = nameParts[0].substring(0, 2).toUpperCase();
      }
    }

    // 2. Property initials (first 2 words, e.g., "Luxury Penthouse" -> "LP")
    let propInitials = 'PR';
    if (property.title) {
      const titleParts = property.title.split(' ').filter(p => p.length > 0);
      if (titleParts.length > 1) {
        propInitials = (titleParts[0].charAt(0) + titleParts[1].charAt(0)).toUpperCase();
      } else if (titleParts.length === 1) {
        propInitials = titleParts[0].substring(0, 2).toUpperCase();
      }
    }

    // 3. City code (e.g., "Dubai" -> "DUB")
    let cityCode = 'LOC';
    if (property.city) {
      cityCode = property.city.substring(0, 3).toUpperCase();
    } else if (property.location) {
      cityCode = property.location.substring(0, 3).toUpperCase();
    }

    // 4. Unique ID chunk (last 4 chars)
    const uniqueId = property._id ? property._id.substring(property._id.length - 4).toUpperCase() : '0000';

    return `${ownerInitials}-${propInitials}-${cityCode}-${uniqueId}`;
  }
}