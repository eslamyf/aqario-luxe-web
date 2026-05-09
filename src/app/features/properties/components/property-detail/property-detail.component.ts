import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, Observable, of } from 'rxjs';
import { takeUntil, switchMap, map, catchError, tap } from 'rxjs/operators';

import { PropertiesService } from '../../services/properties.service';
import { FavoritesService } from '../../services/favorites.service';
import { ReviewsService } from '../../services/reviews.service';
import { PropertyActionsService, ViewingRequestPayload } from '../../services/property-actions.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { Property } from '../../models/property.model';
import { BookingsService } from '../../../../features/bookings/bookings.service';
import { KycService, KYCStatusResponse } from '../../../../core/services/kyc.service';
import { LoadingService } from '../../../../core/services/loading.service';

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
  private favoritesService = inject(FavoritesService);
  private reviewsService = inject(ReviewsService);
  private propertyActionsService = inject(PropertyActionsService);
  
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private bookingsService = inject(BookingsService);
  private kycService = inject(KycService);
  private loadingService = inject(LoadingService);

  property: Property | null = null;
  reviews$: Observable<any[]> = of([]);
  isFavorited$: Observable<boolean> = of(false);
  kycStatus$: Observable<KYCStatusResponse | null> = of(null);
  
  isLoading = true;
  error: string | null = null;
  
  activeImageIndex = 0;
  
  viewingForm!: FormGroup;
  inquiryForm!: FormGroup;
  bookingForm!: FormGroup;
  isSubmittingViewing = false;
  isSubmittingInquiry = false;
  isSubmittingBooking = false;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.buildForms();

    if (this.authService.isAuthenticated()) {
      this.kycStatus$ = this.kycService.getKYCStatus().pipe(
        catchError(() => of(null))
      );
    }

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
            this.error = 'Failed to load property details. Please try again later.';
            this.isLoading = false;
            return of(null);
          })
        );
      })
    ).subscribe(property => {
      this.property = property;
      this.isLoading = false;
      if (property) {
        this.loadAdditionalData(property._id);
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
      end_date: ['', Validators.required]
    });
  }

  private loadAdditionalData(id: string): void {
    this.reviews$ = this.reviewsService.getReviewsByPropertyId(id).pipe(
      catchError(() => of([]))
    );
    this.isFavorited$ = this.favoritesService.isFavorited$(id);
  }

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
    const end = this.bookingForm.get('end_date')?.value;
    if (!start || !end) return 0;
    
    const d1 = new Date(start);
    const d2 = new Date(end);
    const timeDiff = d2.getTime() - d1.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return days > 0 ? days : 0;
  }

  getBookingTotal(pricePerNight: number): number {
    return this.nights * pricePerNight;
  }

  setActiveImage(index: number): void {
    this.activeImageIndex = index;
  }

  onToggleFavorite(propertyId: string): void {
    if (!this.authService.isAuthenticated()) {
      this.authService.openModal('login');
      this.notificationService.show('Sign in to save favorites', 'info');
      return;
    }

    this.favoritesService.toggleFavorite(propertyId).subscribe({
      next: (isFav) => {
        this.notificationService.show(
          isFav ? 'Added to favorites' : 'Removed from favorites',
          isFav ? 'success' : 'info'
        );
      },
      error: () => {
        this.notificationService.show('Failed to update favorite', 'error');
      }
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
      propertyId:    propertyId,
      preferredDate: this.viewingForm.get('preferredDate')?.value,
      preferredTime: this.viewingForm.get('preferredTime')?.value,
    };

    this.propertyActionsService.scheduleViewing(payload).subscribe({
      next: (success) => {
        this.isSubmittingViewing = false;
        if (success) {
          this.notificationService.show('Viewing scheduled successfully!', 'success');
          this.viewingForm.reset();
        } else {
          this.notificationService.show('Failed to schedule viewing', 'error');
        }
      },
      error: (err) => {
        this.isSubmittingViewing = false;
        this.notificationService.show(err.error?.message || 'An error occurred. Please try again.', 'error');
      }
    });
  }

  onSendInquiry(propertyId: string): void {
    if (!this.authService.isAuthenticated()) {
      this.authService.openModal('login');
      this.notificationService.show('Sign in to send an inquiry', 'info');
      return;
    }

    if (this.inquiryForm.invalid || this.isSubmittingInquiry) return;

    this.isSubmittingInquiry = true;
    const message = this.inquiryForm.get('message')?.value;

    this.propertyActionsService.makeInquiry(propertyId, message).subscribe({
      next: (success) => {
        this.isSubmittingInquiry = false;
        if (success) {
          this.notificationService.show('Inquiry sent successfully!', 'success');
          this.inquiryForm.reset();
        } else {
          this.notificationService.show('Failed to send inquiry', 'error');
        }
      },
      error: (err) => {
        this.isSubmittingInquiry = false;
        this.notificationService.show(err.error?.message || 'An error occurred. Please try again.', 'error');
      }
    });
  }

  onBookProperty(property: Property, kycStatus: KYCStatusResponse | null): void {
    if (!this.authService.isAuthenticated()) {
      this.authService.openModal('login');
      this.notificationService.show('Sign in to book this property', 'info');
      return;
    }

    if (this.authService.currentUser?.role !== 'buyer') {
      this.notificationService.show('Only buyers can book properties.', 'error');
      return;
    }

    if (kycStatus?.status !== 'approved') {
      this.router.navigate(['/kyc']);
      this.notificationService.show('Please verify your identity to book properties', 'error');
      return;
    }

    if (this.bookingForm.invalid || this.isSubmittingBooking) return;

    const start = new Date(this.bookingForm.get('start_date')?.value);
    const end = new Date(this.bookingForm.get('end_date')?.value);
    
    if (start >= end) {
      this.notificationService.show('Check-out date must be after check-in date.', 'error');
      return;
    }

    this.isSubmittingBooking = true;
    this.loadingService.show();
    
    const req = {
      propertyId: property._id,
      start_date: this.bookingForm.get('start_date')?.value,
      end_date: this.bookingForm.get('end_date')?.value,
      amount: this.getBookingTotal(property.price)
    };

    this.bookingsService.createBooking(req).subscribe({
      next: () => {
        this.isSubmittingBooking = false;
        this.loadingService.hide();
        this.notificationService.show('Booking request sent! Awaiting owner approval.', 'success');
        this.bookingForm.reset();
      },
      error: (err) => {
        this.isSubmittingBooking = false;
        this.loadingService.hide();
        this.notificationService.show(err.error?.message || 'Failed to submit booking', 'error');
      }
    });
  }

  formatPrice(price: number, currency: string, status: 'for-sale' | 'for-rent'): string {
    return this.propertiesService.formatPrice(price, currency, status);
  }
}