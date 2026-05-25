import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  AfterViewInit,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { PropertiesService } from '../../properties/services/properties.service';
import { Property } from '../../properties/models/property.model';
import { environment } from '../../../../environments/environment';

interface FeaturedProperty extends Property {
  formattedPrice: string;
  primaryImage: string;
}

@Component({
  selector: 'app-home-sections',
  templateUrl: './home-sections.component.html',
  styleUrls: ['./home-sections.component.scss'],
})
export class HomeSectionsComponent implements OnInit, OnDestroy, AfterViewInit {
  private router             = inject(Router);
  private propertiesService  = inject(PropertiesService);
  private http               = inject(HttpClient);
  private ngZone             = inject(NgZone);
  private cdr                = inject(ChangeDetectorRef);
  private translateService   = inject(TranslateService);

  // ── Lifecycle management ────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  // ── State ──────────────────────────────────────────────────────────────────
  featuredProperties: FeaturedProperty[] = [];
  isLoading = true;
  hasError  = false;
  openAccordion: number | null = 0;

  // ── Static data ────────────────────────────────────────────────────────────
  partners = [
    { nameKey: 'HOME.PARTNERS.PLD.NAME', abbrKey: 'HOME.PARTNERS.PLD.ABBR' },
    { nameKey: 'HOME.PARTNERS.AMT.NAME', abbrKey: 'HOME.PARTNERS.AMT.ABBR' },
    { nameKey: 'HOME.PARTNERS.EQIX.NAME', abbrKey: 'HOME.PARTNERS.EQIX.ABBR' },
    { nameKey: 'HOME.PARTNERS.DLR.NAME', abbrKey: 'HOME.PARTNERS.DLR.ABBR' },
    { nameKey: 'HOME.PARTNERS.SPG.NAME', abbrKey: 'HOME.PARTNERS.SPG.ABBR' },
    { nameKey: 'HOME.PARTNERS.WELL.NAME', abbrKey: 'HOME.PARTNERS.WELL.ABBR' },
  ];

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

  contactOptions = [
    { id: 'call',    titleKey: 'HOME.CONTACT.CALL',    detail: '+20 1122 345 14' },
    { id: 'chat',    titleKey: 'HOME.CONTACT.CHAT',    detail: '120 120 44 14'   },
    { id: 'video',   titleKey: 'HOME.CONTACT.VIDEO',   detail: '+20 122 345 11'  },
    { id: 'message', titleKey: 'HOME.CONTACT.MESSAGE', detail: '+20 133 145 14'  },
  ];

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadFeaturedProperties();

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
    this.hasError  = false;

    // Direct isolated call with limit=3, no side-effects on the shared service state
    this.propertiesService
      .getProperties({ limit: 3, page: 1 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (props: Property[]) => {
          this.featuredProperties = props.map(p => this.enrichProperty(p));
          this.isLoading = false;
          this.cdr.detectChanges();
          // Re-observe new DOM elements after data arrives
          setTimeout(() => this.initScrollReveal(), 100);
        },
        error: () => {
          this.isLoading = false;
          this.hasError  = true;
          this.cdr.detectChanges();
        },
      });
  }

  // ── Enrich property with formatted price and resolved image URL ─────────────
  private enrichProperty(p: Property): FeaturedProperty {
    return {
      ...p,
      formattedPrice: this.propertiesService.formatPrice(
        p.price,
        p.currency ?? 'USD',
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

  navigateToProperties(): void {
    this.router.navigate(['/properties']);
  }

  navigateToProperty(id: string): void {
    this.router.navigate(['/properties', id]);
  }

  retry(): void {
    this.loadFeaturedProperties();
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
