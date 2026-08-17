import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  AfterViewInit,
  NgZone,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { PropertiesService } from '../../properties/services/properties.service';
import { Property } from '../../properties/models/property.model';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../shared/services/notification.service';

interface FeaturedProperty extends Property {
  formattedPrice: string;
  primaryImage: string;
}

import { QuickPropertyService } from '../../../core/services/quick-property.service';

@Component({
  selector: 'app-home-sections',
  templateUrl: './home-sections.component.html',
  styleUrls: ['./home-sections.component.scss'],
})
export class HomeSectionsComponent implements OnInit, OnDestroy, AfterViewInit {
  private router = inject(Router);
  private propertiesService = inject(PropertiesService);
  private http = inject(HttpClient);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private translateService = inject(TranslateService);
  private fb = inject(FormBuilder);
  private notif = inject(NotificationService);
  private quickPropService = inject(QuickPropertyService);

  // ── Lifecycle management ────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  // ── State ──────────────────────────────────────────────────────────────────
  featuredProperties: FeaturedProperty[] = [];
  isLoading = true;
  hasError = false;
  openAccordion: number | null = 0;

  activeCardIndex = 0;
  canScrollLeft = false;
  canScrollRight = true;

  isDragging = false;
  startX = 0;
  scrollLeftStart = 0;
  hasDraggedFar = false;

  showAddPropertyModal = false;
  isSubmittingAddProp = false;

  addPropertyForm: FormGroup = this.fb.group({
    propertyType: ['شقة', Validators.required],
    listingType: ['بيع', Validators.required],
    city: ['', Validators.required],
    name: ['', Validators.required],
    phone: ['', [Validators.required, Validators.maxLength(14), Validators.pattern(/^[0-9+\s-]{8,14}$/)]],
    notes: [''],
  });

  // ── Static data ────────────────────────────────────────────────────────────
  valueFeatures = [
    {
      icon: '◈',
      titleKey: 'HOME.VALUES.INTEREST_RATES.TITLE',
      descKey: 'HOME.VALUES.INTEREST_RATES.DESC',
    },
    {
      icon: '◆',
      titleKey: 'HOME.VALUES.UNSTABLE_PRICES.TITLE',
      descKey: 'HOME.VALUES.UNSTABLE_PRICES.DESC',
    },
    {
      icon: '◇',
      titleKey: 'HOME.VALUES.BEST_PRICE.TITLE',
      descKey: 'HOME.VALUES.BEST_PRICE.DESC',
    },
  ];

  phoneNumber = '01028103634';
  emailAddress = 'eslam9076460@gmail.com';
  copiedType: 'phone' | 'email' | null = null;

  openWhatsApp(): void {
    window.open('https://wa.me/201028103634', '_blank');
  }

  openMailto(): void {
    window.location.href = 'mailto:eslam9076460@gmail.com';
  }

  copyPhone(event: MouseEvent): void {
    event.stopPropagation();
    navigator.clipboard.writeText(this.phoneNumber).then(() => {
      this.copiedType = 'phone';
      const msg = this.translateService.instant('HOME.CONTACT.PHONE_COPIED');
      this.notif.show(msg, 'success');
      setTimeout(() => {
        if (this.copiedType === 'phone') this.copiedType = null;
        this.cdr.detectChanges();
      }, 2500);
      this.cdr.detectChanges();
    });
  }

  copyEmail(event: MouseEvent): void {
    event.stopPropagation();
    navigator.clipboard.writeText(this.emailAddress).then(() => {
      this.copiedType = 'email';
      const msg = this.translateService.instant('HOME.CONTACT.EMAIL_COPIED');
      this.notif.show(msg, 'success');
      setTimeout(() => {
        if (this.copiedType === 'email') this.copiedType = null;
        this.cdr.detectChanges();
      }, 2500);
      this.cdr.detectChanges();
    });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadFeaturedProperties();

    this.quickPropService.modalOpen$
      .pipe(takeUntil(this.destroy$))
      .subscribe((open) => {
        this.showAddPropertyModal = open;
        this.cdr.detectChanges();
      });

    // Listen for language changes reactively to translate featured properties in place
    this.translateService.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        this.featuredProperties = this.featuredProperties.map((p) => {
          const translated = this.propertiesService.translateProperty(p, event.lang);
          return this.enrichProperty(translated);
        });
        this.cdr.detectChanges();
      });
  }

  ngAfterViewInit(): void {
    this.initScrollReveal();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data fetching: isolated call — DOES NOT touch shared properties$ state ──
  private loadFeaturedProperties(): void {
    this.isLoading = true;
    this.hasError = false;

    // Fetch featured properties list (limit: 10) for horizontal property slider
    this.propertiesService
      .getProperties({ limit: 10, page: 1 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (props: Property[]) => {
          this.featuredProperties = props.map(p => this.enrichProperty(p));
          this.isLoading = false;
          this.cdr.detectChanges();
          // Re-observe new DOM elements after data arrives
          setTimeout(() => {
            this.initScrollReveal();
            this.updateScrollState();
          }, 100);
        },
        error: () => {
          this.isLoading = false;
          this.hasError = true;
          this.cdr.detectChanges();
        },
      });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateScrollState();
  }

  onPropsScroll(): void {
    this.updateScrollState();
  }

  onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    const grid = event.currentTarget as HTMLElement;
    if (!grid) return;

    this.isDragging = true;
    this.hasDraggedFar = false;
    this.startX = event.pageX - grid.offsetLeft;
    this.scrollLeftStart = grid.scrollLeft;
    grid.classList.add('is-dragging');
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    const grid = event.currentTarget as HTMLElement;
    if (!grid) return;

    const x = event.pageX - grid.offsetLeft;
    const walk = (x - this.startX) * 1.5;

    if (Math.abs(walk) > 5) {
      this.hasDraggedFar = true;
      event.preventDefault();
    }

    const isRtl = document.documentElement.dir === 'rtl' || document.body.dir === 'rtl' || document.dir === 'rtl';
    if (isRtl) {
      grid.scrollLeft = this.scrollLeftStart + walk;
    } else {
      grid.scrollLeft = this.scrollLeftStart - walk;
    }

    this.updateScrollState();
  }

  onMouseUp(event: MouseEvent): void {
    if (!this.isDragging) return;
    this.stopDragging(event.currentTarget as HTMLElement);
  }

  onMouseLeave(event: MouseEvent): void {
    if (!this.isDragging) return;
    this.stopDragging(event.currentTarget as HTMLElement);
  }

  private stopDragging(grid: HTMLElement): void {
    if (!grid) return;
    this.isDragging = false;
    grid.classList.remove('is-dragging');
    this.updateScrollState();
    setTimeout(() => {
      this.hasDraggedFar = false;
    }, 50);
  }

  scrollToCard(index: number): void {
    const grid = document.querySelector('.featured-section .props-grid') as HTMLElement;
    if (!grid) return;

    const cards = grid.querySelectorAll('app-property-card, .prop-skeleton');
    if (!cards[index]) return;

    const targetCard = cards[index] as HTMLElement;
    const cardLeft = targetCard.offsetLeft;
    grid.scrollTo({ left: cardLeft, behavior: 'smooth' });
    this.activeCardIndex = index;
    setTimeout(() => this.updateScrollState(), 350);
  }

  updateScrollState(): void {
    const grid = document.querySelector('.featured-section .props-grid') as HTMLElement;
    if (!grid) return;

    const scrollLeft = grid.scrollLeft;
    const maxScroll = grid.scrollWidth - grid.clientWidth;

    if (maxScroll <= 5) {
      this.canScrollLeft = false;
      this.canScrollRight = false;
      this.activeCardIndex = 0;
      this.cdr.detectChanges();
      return;
    }

    const isRtl = document.documentElement.dir === 'rtl' || document.body.dir === 'rtl' || document.dir === 'rtl';
    const absScroll = Math.abs(scrollLeft);

    if (isRtl) {
      this.canScrollRight = absScroll > 10;
      this.canScrollLeft = absScroll < maxScroll - 10;
    } else {
      this.canScrollLeft = absScroll > 10;
      this.canScrollRight = absScroll < maxScroll - 10;
    }

    const firstCard = grid.querySelector('app-property-card, .prop-skeleton') as HTMLElement;
    if (firstCard && firstCard.offsetWidth > 0) {
      const cardWidth = firstCard.offsetWidth;
      let index = Math.round(absScroll / cardWidth);
      if (index < 0) index = 0;
      if (index >= this.featuredProperties.length) index = this.featuredProperties.length - 1;
      this.activeCardIndex = index;
    }

    this.cdr.detectChanges();
  }

  // ── Enrich property with formatted price and resolved image URL ─────────────
  private enrichProperty(p: Property): FeaturedProperty {
    return {
      ...p,
      formattedPrice: this.propertiesService.formatPrice(
        p.price,
        'EGP',
        p.status
      ),
      primaryImage: this.resolveImageUrl(p.images),
    };
  }

  /**
   * Resolves the best available image URL from a property.
   * Handles: absolute URLs, relative /uploads/ paths, and empty arrays.
   */
  private resolveImageUrl(images: string[]): string {
    if (!images || images.length === 0) return '';
    const img = images[0];
    if (!img) return '';
    // Already a full URL (Cloudinary, Unsplash, etc.)
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    // Relative path — prefix with backend base URL
    const apiBase = environment.apiUrl.replace('/api/v1', '');
    return `${apiBase}/${img.replace(/^\//, '')}`;
  }

  // ── User actions ────────────────────────────────────────────────────────────
  toggleAccordion(index: number): void {
    this.openAccordion = this.openAccordion === index ? null : index;
  }

  scrollProps(direction: 'left' | 'right'): void {
    const grid = document.querySelector('.featured-section .props-grid') as HTMLElement;
    if (!grid) return;

    const firstCard = grid.querySelector('app-property-card, .prop-skeleton') as HTMLElement;
    const cardWidth = firstCard ? firstCard.offsetWidth + 24 : 360;

    const isRtl = document.documentElement.dir === 'rtl' || document.body.dir === 'rtl' || document.dir === 'rtl';

    let scrollAmount = direction === 'right' ? cardWidth : -cardWidth;
    if (isRtl) {
      scrollAmount = direction === 'right' ? -cardWidth : cardWidth;
    }

    grid.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    setTimeout(() => this.updateScrollState(), 350);
  }

  navigateToProperties(): void {
    this.router.navigate(['/properties']);
  }

  navigateToProperty(id: string): void {
    this.router.navigate(['/properties', id]);
  }

  retry(): void {
    this.loadFeaturedProperties();
  }

  // ── Add Property Modal Handlers ───────────────────────────────────────────
  openAddPropertyModal(): void {
    this.quickPropService.openModal();
  }

  closeAddPropertyModal(): void {
    this.quickPropService.closeModal();
  }

  onModalOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('add-prop-overlay')) {
      this.closeAddPropertyModal();
    }
  }

  isAddPropFieldInvalid(field: string): boolean {
    const ctrl = this.addPropertyForm.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  onAddPropertySubmit(): void {
    if (this.addPropertyForm.invalid) {
      this.addPropertyForm.markAllAsTouched();
      return;
    }

    this.isSubmittingAddProp = true;
    const val = this.addPropertyForm.value;

    const payload = {
      title: `طلب إضافة عقار (${val.propertyType} - ${val.listingType}) في ${val.city}`,
      propertyType: val.propertyType,
      listingType: val.listingType,
      city: val.city,
      contactName: val.name,
      contactPhone: val.phone,
      notes: val.notes || '',
      submittedAt: new Date(),
    };

    this.http.post(`${environment.apiUrl}/inquiries`, payload).pipe(
      catchError(() => of(null)),
      finalize(() => {
        this.isSubmittingAddProp = false;
        this.showAddPropertyModal = false;
        this.addPropertyForm.reset({
          propertyType: 'شقة',
          listingType: 'بيع',
        });
        this.cdr.detectChanges();
      })
    ).subscribe(() => {
      const msg = this.translateService.instant('ADD_PROPERTY.SUCCESS_MSG');
      this.notif.show(msg, 'success');
    });
  }

  // ── Scroll reveal (IntersectionObserver) ───────────────────────────────────
  private initScrollReveal(): void {
    this.ngZone.runOutsideAngular(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('revealed');
              observer.unobserve(e.target);
            }
          });
        },
        { threshold: 0.1 }
      );
      document
        .querySelectorAll('.home-reveal')
        .forEach((el) => observer.observe(el));
    });
  }
}
