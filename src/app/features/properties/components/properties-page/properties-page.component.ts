import { Component, OnInit, inject, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormBuilder } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import { PropertiesService } from '../../services/properties.service';
import { FavoritesService } from '../../services/favorites.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { Property, PropertyFilters, PropertyType } from '../../models/property.model';
import { SeoService } from '../../../../core/services/seo.service';

export interface CitySeoMeta {
  nameAr: string;
  nameEn: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
}

@Component({
  selector: 'app-properties-page',
  templateUrl: './properties-page.component.html',
  styleUrls: ['./properties-page.component.scss'],
})
export class PropertiesPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(PropertiesService);
  private favoritesService = inject(FavoritesService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private translateService = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private seo = inject(SeoService);

  // ── Reactive State ────────────────────────────────────────────────────────
  properties$: Observable<Property[]> = this.svc.properties$;
  isLoading$: Observable<boolean> = this.svc.loading$;
  activeFilter$: Observable<string> = this.svc.activeFilter$;
  error$: Observable<string | null> = this.svc.error$;

  // Pagination state
  currentPage = 1;
  totalPages = 1;
  totalResults = 0;

  // UI state
  isFilterExpanded = false;
  currentTab = 'all';
  selectedCity = '';

  // ── Quick City Filters for Local SEO (Upper Egypt Governorates & Centers) ───
  cityFilters = [
    { id: '', labelAr: 'كل مناطق الصعيد', labelEn: 'All Upper Egypt' },
    { id: 'Qena', labelAr: 'قنا (الموقّع الرئيسي)', labelEn: 'Qena (Primary Market)' },
    { id: 'New Qena', labelAr: 'قنا الجديدة', labelEn: 'New Qena' },
    { id: 'Nag Hammadi', labelAr: 'نجع حمادي', labelEn: 'Nag Hammadi' },
    { id: 'Luxor', labelAr: 'الأقصر', labelEn: 'Luxor' },
    { id: 'Sohag', labelAr: 'سوهاج', labelEn: 'Sohag' },
    { id: 'Asyut', labelAr: 'أسيوط', labelEn: 'Asyut' },
    { id: 'Hurghada', labelAr: 'الغردقة', labelEn: 'Hurghada' },
  ];

  readonly cityMetaMap: Record<string, CitySeoMeta> = {
    Qena: {
      nameAr: 'مدينة قنا',
      nameEn: 'Qena City',
      titleAr: 'AQARIO — عقارات قنا | شقق وأراضي ومحلات للبيع والإيجار بقنا',
      titleEn: 'AQARIO — Real Estate in Qena | Apartments, Lands & Properties for Sale and Rent',
      descAr: 'سوق العقارات الأحدث في مدينة قنا. تصفح شقق سكنية للبيع وللإيجار بالقرب من جامعة جنوب الوادي، شارع الجميل، والنيل، وتواصل مباشر مع مكاتب العقارات والمسوقين بقنا.',
      descEn: 'The primary real estate market in Qena City. Browse apartments for sale and rent near South Valley University, Nile Street, and top locations in Qena.',
    },
    'New Qena': {
      nameAr: 'قنا الجديدة',
      nameEn: 'New Qena',
      titleAr: 'AQARIO — عقارات قنا الجديدة | شقق وفلل وأراضي للبيع بقنا الجديدة',
      titleEn: 'AQARIO — New Qena Real Estate | Apartments, Villas & Lands for Sale',
      descAr: 'اكتشف الفرص العقارية والاستثمارية المتميزة في مدينة قنا الجديدة. قطع أراضي، فلل حديثة، وشقق سكنية بأسعار شفافة وتواصل مباشر مع أصحاب العقارات والمكاتب.',
      descEn: 'Explore premier real estate opportunities in New Qena. Plots of land, modern villas, and residential apartments with transparent pricing.',
    },
    'Nag Hammadi': {
      nameAr: 'نجع حمادي',
      nameEn: 'Nag Hammadi',
      titleAr: 'AQARIO — عقارات نجع حمادي | شقق ومحلات تجارية للبيع والإيجار',
      titleEn: 'AQARIO — Nag Hammadi Real Estate | Properties for Sale & Rent',
      descAr: 'تصفح أحدث الفرص العقارية في نجع حمادي بمحافظة قنا. شقق سكنية، أراضي، ومحلات تجارية بأسعار شفافة بالجنيه المصري.',
      descEn: 'Browse the latest real estate opportunities in Nag Hammadi, Qena Governorate. Apartments, land, and shops in EGP.',
    },
    Luxor: {
      nameAr: 'مدينة الأقصر',
      nameEn: 'Luxor',
      titleAr: 'AQARIO — عقارات الأقصر | شقق وعقارات للبيع والإيجار بالأقصر',
      titleEn: 'AQARIO — Luxor Real Estate | Apartments & Properties for Sale and Rent',
      descAr: 'تصفح أحدث العقارات المتاحة في مدينة الأقصر، من الشقق والمنازل العائلية إلى الأراضي والمحلات التجاريّة المتميزة.',
      descEn: 'Browse properties in Luxor city, from apartments and family homes to lands and prime commercial shops.',
    },
    Sohag: {
      nameAr: 'محافظة سوهاج',
      nameEn: 'Sohag Governorate',
      titleAr: 'AQARIO — عقارات سوهاج | شقق وأراضي للبيع والإيجار بسوهاج',
      titleEn: 'AQARIO — Sohag Real Estate | Properties for Sale & Rent in Sohag',
      descAr: 'اكتشف العقارات المتاحة في سوهاج وأخميم وجرجا على منصة AQARIO. تواصل مباشر مع أصحاب العقارات والمكاتب المعتمدة.',
      descEn: 'Discover real estate properties in Sohag, Akhmim, and Girga on AQARIO with transparent EGP pricing.',
    },
    Asyut: {
      nameAr: 'محافظة أسيوط',
      nameEn: 'Asyut Governorate',
      titleAr: 'AQARIO — عقارات أسيوط | شقق وفلل وأراضي للبيع بأسيوط',
      titleEn: 'AQARIO — Asyut Real Estate | Apartments & Lands in Asyut',
      descAr: 'تصفح العقارات المتاحة في أسيوط وديروط ومنفلوط والقوصية مع AQARIO. اختيارك العقاري الأسهل في صعيد مصر.',
      descEn: 'Browse real estate listings in Asyut, Dayrout, and Manfalut with AQARIO. Your trusted platform in Upper Egypt.',
    },
    Hurghada: {
      nameAr: 'مدينة الغردقة',
      nameEn: 'Hurghada',
      titleAr: 'AQARIO — عقارات الغردقة | شقق واستثمارات بالبحر الأحمر',
      titleEn: 'AQARIO — Hurghada Real Estate | Apartments & Properties in Hurghada',
      descAr: 'اكتشف الشقق والاستثمارات العقارية في الغردقة مع AQARIO. فرصة للتواصل مع مكاتب عقارية موثوقة في البحر الأحمر.',
      descEn: 'Discover apartments and property investments in Hurghada with AQARIO. Connect directly with verified Red Sea real estate offices.',
    },
  };

  // ── Filter Form ───────────────────────────────────────────────────────────
  private fb = inject(FormBuilder);
  filterForm = this.fb.group({
    search: [''],
    city: [''],
    minPrice: [''],
    maxPrice: [''],
    bedrooms: [''],
    bathrooms: ['']
  });

  // ── Filter tabs — aligned with backend enum exactly ───────────────────────
  filterTabs = [
    { labelKey: 'PROPERTIES.TABS.ALL', id: 'all' },
    { labelKey: 'REAL_ESTATE.FOR_SALE', id: 'for-sale' },
    { labelKey: 'REAL_ESTATE.FOR_RENT', id: 'for-rent' },
    { labelKey: 'REAL_ESTATE.APARTMENTS_CHIP', id: 'apartment' },
    { labelKey: 'REAL_ESTATE.VILLAS_CHIP', id: 'villa' },
    { labelKey: 'PROPERTIES.TABS.HOUSES', id: 'house' },
    { labelKey: 'PROPERTIES.TABS.STUDIOS', id: 'studio' },
    { labelKey: 'REAL_ESTATE.COMMERCIAL', id: 'commercial' },
  ];

  ngOnInit(): void {
    // Sync filters from URL query parameters
    this.route.queryParams
      .pipe(
        debounceTime(200),
        map((params) => this.mapToFilters(params)),
        distinctUntilChanged((a, b) => this.isEqual(a, b)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((filters) => {
        this.currentPage = filters.page ?? 1;
        this.currentTab = filters.status || filters.type || 'all';
        this.selectedCity = filters.city || '';

        // Update Dynamic SEO per City Context
        this.updatePageSeo(this.selectedCity);

        // Patch form without triggering infinite loop
        this.filterForm.patchValue({
          search: filters.search || '',
          city: filters.city || '',
          minPrice: filters.minPrice ? filters.minPrice.toString() : '',
          maxPrice: filters.maxPrice ? filters.maxPrice.toString() : '',
          bedrooms: filters.bedrooms ? filters.bedrooms.toString() : '',
          bathrooms: filters.bathrooms ? filters.bathrooms.toString() : '',
        }, { emitEvent: false });

        this.svc.setFilters(filters);
        this.cdr.markForCheck();
      });

    // Subscribe to language changes reactively to refresh listing translations instantly
    this.translateService.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updatePageSeo(this.selectedCity);
        this.svc.setFilters(this.svc.getCurrentFilters());
        this.cdr.markForCheck();
      });

    // Subscribe to pagination metadata
    this.svc.pagination$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(meta => {
        if (meta) {
          setTimeout(() => {
            this.totalPages = meta.pages;
            this.totalResults = meta.total;
            this.currentPage = meta.page;
          });
        }
      });
  }

  selectCityFilter(cityId: string): void {
    const queryParams: any = { ...this.route.snapshot.queryParams, page: 1 };
    if (cityId) {
      queryParams.city = cityId;
    } else {
      delete queryParams.city;
    }
    this.router.navigate([], { queryParams });
  }

  private updatePageSeo(city: string): void {
    const isAr = (this.translateService.currentLang || 'ar') === 'ar';
    const cityMeta = this.cityMetaMap[city];

    if (cityMeta) {
      this.seo.updateSeo({
        title: isAr ? cityMeta.titleAr : cityMeta.titleEn,
        description: isAr ? cityMeta.descAr : cityMeta.descEn,
        canonicalUrl: `https://aqario.app/properties?city=${encodeURIComponent(city)}`
      });
      this.seo.setBreadcrumbSchema([
        { name: isAr ? 'الرئيسية' : 'Home', url: 'https://aqario.app/' },
        { name: isAr ? 'عقارات صعيد مصر' : 'Upper Egypt Properties', url: 'https://aqario.app/properties' },
        { name: isAr ? cityMeta.nameAr : cityMeta.nameEn, url: `https://aqario.app/properties?city=${encodeURIComponent(city)}` }
      ]);
    } else {
      this.seo.updateSeo({
        title: isAr ? 'AQARIO — سوق العقارات في صعيد مصر' : 'AQARIO — Upper Egypt Real Estate Market',
        description: isAr
          ? 'تصفح أحدث الشقق، الفلل، الأراضي، والمحلات التجارية المتاحة للبيع وللإيجار في قنا وقنا الجديدة ونجع حمادي والأقصر وسوهاج وأسيوط والغردقة مع AQARIO.'
          : 'Browse apartments, lands, villas, and commercial shops for sale and rent in Upper Egypt governorates with AQARIO.',
        canonicalUrl: 'https://aqario.app/properties'
      });
      this.seo.setBreadcrumbSchema([
        { name: isAr ? 'الرئيسية' : 'Home', url: 'https://aqario.app/' },
        { name: isAr ? 'عقارات صعيد مصر' : 'Upper Egypt Properties', url: 'https://aqario.app/properties' }
      ]);
    }
  }

  private mapToFilters(params: Params): PropertyFilters {
    // Always request up to 1000 properties to display them all on one page
    const baseFilters: PropertyFilters = { limit: 1000 };

    if (Object.keys(params).length === 0) return baseFilters;

    return {
      ...baseFilters,
      search: params['search'] || undefined,
      city: params['location'] || params['city'] || undefined,
      type: params['type'] as PropertyType | undefined,
      status: params['listingType'] === 'rent' ? 'for-rent' :
        params['listingType'] === 'sale' ? 'for-sale' : undefined,
      minPrice: params['minPrice'] ? Number(params['minPrice']) : undefined,
      maxPrice: params['maxPrice'] ? Number(params['maxPrice']) : undefined,
      bedrooms: params['bedrooms'] ? Number(params['bedrooms']) : undefined,
      bathrooms: params['bathrooms'] ? Number(params['bathrooms']) : undefined,
      page: params['page'] ? Number(params['page']) : 1,
      cursor: params['cursor'] || undefined,
    };
  }

  private isEqual(a: PropertyFilters, b: PropertyFilters): boolean {
    const keysA = Object.keys(a).filter(k => (a as any)[k] !== undefined);
    const keysB = Object.keys(b).filter(k => (b as any)[k] !== undefined);
    return (
      keysA.length === keysB.length &&
      keysA.every((key) => (a as any)[key] === (b as any)[key])
    );
  }

  onFilterChange(filter: string): void {
    const queryParams: any = { ...this.route.snapshot.queryParams, page: 1 };

    // Clear type and listingType to reset tab state properly
    delete queryParams.type;
    delete queryParams.listingType;

    const statusMap: Record<string, string> = { 'for-sale': 'sale', 'for-rent': 'rent' };
    const typeMap: Record<string, string> = {
      apartment: 'apartment', villa: 'villa', house: 'house',
      studio: 'studio', office: 'office', shop: 'shop',
      land: 'land', commercial: 'commercial',
    };

    if (statusMap[filter]) queryParams.listingType = statusMap[filter];
    else if (typeMap[filter]) queryParams.type = typeMap[filter];

    this.router.navigate([], { queryParams });
  }

  applyFilters(): void {
    const val = this.filterForm.value;
    const queryParams: any = { ...this.route.snapshot.queryParams, page: 1 };

    if (val.search) queryParams.search = val.search; else delete queryParams.search;
    if (val.city) queryParams.city = val.city; else delete queryParams.city;
    if (val.minPrice) queryParams.minPrice = val.minPrice; else delete queryParams.minPrice;
    if (val.maxPrice) queryParams.maxPrice = val.maxPrice; else delete queryParams.maxPrice;
    if (val.bedrooms) queryParams.bedrooms = val.bedrooms; else delete queryParams.bedrooms;
    if (val.bathrooms) queryParams.bathrooms = val.bathrooms; else delete queryParams.bathrooms;

    this.router.navigate([], { queryParams });
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.router.navigate([]);
  }

  toggleFilterPanel(): void {
    this.isFilterExpanded = !this.isFilterExpanded;
  }

  onFavoriteToggled(propertyId: string): void {
    // PropertyCardComponent handles favorite toggling, auth checks, and notifications internally.
  }

  onViewAll(): void {
    this.clearFilters();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.router.navigate([], { queryParams: { page }, queryParamsHandling: 'merge' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  retryLoad(): void {
    this.svc.setFilters(this.svc.getCurrentFilters());
  }

  trackById(_index: number, item: Property): string {
    return item._id;
  }
}
