import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormBuilder } from '@angular/forms';

import { PropertiesService } from '../../services/properties.service';
import { FavoritesService } from '../../services/favorites.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { Property, PropertyFilters, PropertyType } from '../../models/property.model';

@Component({
  selector: 'app-properties-page',
  templateUrl: './properties-page.component.html',
  styleUrls: ['./properties-page.component.scss'],
})
export class PropertiesPageComponent implements OnInit {
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private svc     = inject(PropertiesService);
  private favoritesService    = inject(FavoritesService);
  private authService         = inject(AuthService);
  private notificationService = inject(NotificationService);
  private destroyRef          = inject(DestroyRef);

  // ── Reactive State ────────────────────────────────────────────────────────
  properties$:   Observable<Property[]> = this.svc.properties$;
  isLoading$:    Observable<boolean>    = this.svc.loading$;
  activeFilter$: Observable<string>     = this.svc.activeFilter$;
  error$:        Observable<string | null> = this.svc.error$;

  // Pagination state
  currentPage  = 1;
  totalPages   = 1;
  totalResults = 0;

  // UI state
  selectedProperty: Property | null = null;
  isFilterExpanded = false;

  // ── Filter Form ───────────────────────────────────────────────────────────
  private fb = inject(FormBuilder);
  filterForm = this.fb.group({
    search:   [''],
    city:     [''],
    minPrice: [''],
    maxPrice: [''],
    bedrooms: ['']
  });

  // ── Filter tabs — aligned with backend enum exactly ───────────────────────
  filterTabs = [
    { label: 'All',         key: 'all' },
    { label: 'For Sale',    key: 'for-sale' },
    { label: 'For Rent',    key: 'for-rent' },
    { label: 'Apartments',  key: 'apartment' },
    { label: 'Villas',      key: 'villa' },
    { label: 'Houses',      key: 'house' },
    { label: 'Studios',     key: 'studio' },
    { label: 'Commercial',  key: 'commercial' },
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
        // Patch form without triggering infinite loop
        this.filterForm.patchValue({
          search:   filters.search || '',
          city:     filters.city || '',
          minPrice: filters.minPrice ? filters.minPrice.toString() : '',
          maxPrice: filters.maxPrice ? filters.maxPrice.toString() : '',
          bedrooms: filters.bedrooms ? filters.bedrooms.toString() : '',
        }, { emitEvent: false });
        
        this.svc.setFilters(filters);
      });

    // Subscribe to pagination metadata
    this.svc.pagination$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(meta => {
        if (meta) {
          setTimeout(() => {
            this.totalPages   = meta.pages;
            this.totalResults = meta.total;
            this.currentPage  = meta.page;
          });
        }
      });
  }

  private mapToFilters(params: Params): PropertyFilters {
    // Always request up to 1000 properties to display them all on one page
    const baseFilters: PropertyFilters = { limit: 1000 };
    
    if (Object.keys(params).length === 0) return baseFilters;

    return {
      ...baseFilters,
      search:   params['search']   || undefined,
      city:     params['location'] || params['city'] || undefined,
      type:     params['type']     as PropertyType | undefined,
      status:   params['listingType'] === 'rent' ? 'for-rent' :
                params['listingType'] === 'sale' ? 'for-sale' : undefined,
      minPrice: params['minPrice'] ? Number(params['minPrice']) : undefined,
      maxPrice: params['maxPrice'] ? Number(params['maxPrice']) : undefined,
      bedrooms: params['bedrooms'] ? Number(params['bedrooms']) : undefined,
      page:     params['page']     ? Number(params['page'])     : 1,
      cursor:   params['cursor']   || undefined,
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

    if (val.search)   queryParams.search = val.search;     else delete queryParams.search;
    if (val.city)     queryParams.city = val.city;         else delete queryParams.city;
    if (val.minPrice) queryParams.minPrice = val.minPrice; else delete queryParams.minPrice;
    if (val.maxPrice) queryParams.maxPrice = val.maxPrice; else delete queryParams.maxPrice;
    if (val.bedrooms) queryParams.bedrooms = val.bedrooms; else delete queryParams.bedrooms;

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

  onViewDetails(property: Property): void {
    this.selectedProperty = property;
  }

  onViewAll(): void {
    this.clearFilters();
  }

  onModalClosed(): void {
    this.selectedProperty = null;
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
