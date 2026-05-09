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

  // ── Lifecycle management ────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  // ── State ──────────────────────────────────────────────────────────────────
  featuredProperties: FeaturedProperty[] = [];
  isLoading = true;
  hasError  = false;
  openAccordion: number | null = 0;

  // ── Static data ────────────────────────────────────────────────────────────
  partners = [
    { name: 'PROLOGIS',        abbr: 'PLD'  },
    { name: 'AMERICAN TOWER',  abbr: 'AMT'  },
    { name: 'EQUINIX',         abbr: 'EQIX' },
    { name: 'DIGITAL REALTY',  abbr: 'DLR'  },
    { name: 'SIMON PROPERTY',  abbr: 'SPG'  },
    { name: 'WELLTOWER',       abbr: 'WELL' },
  ];

  valueFeatures = [
    {
      icon: '◈',
      title: 'Best Interest Rates on the Market',
      desc: 'We work with top financial institutions to secure the most competitive mortgage rates available globally, saving you thousands over the life of your investment.',
    },
    {
      icon: '◆',
      title: 'Prevent Unstable Prices',
      desc: 'Our AI-driven market analytics lock in fair valuations, shielding your investment from volatile fluctuations and ensuring long-term capital preservation.',
    },
    {
      icon: '◇',
      title: 'Best Price on the Market',
      desc: 'Access exclusive off-market listings and early access deals before they go public, negotiated directly by our expert team on your behalf.',
    },
  ];

  contactOptions = [
    { id: 'call',    title: 'Call',       detail: '+20 1122 345 14' },
    { id: 'chat',    title: 'Chat',       detail: '120 120 44 14'   },
    { id: 'video',   title: 'Video Call', detail: '+20 122 345 11'  },
    { id: 'message', title: 'Message',    detail: '+20 133 145 14'  },
  ];

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadFeaturedProperties();
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

    // Direct isolated call with limit=4, no side-effects on the shared service state
    this.propertiesService
      .getProperties({ limit: 4, page: 1 })
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
