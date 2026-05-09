import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, shareReplay, finalize, tap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { Property, PropertyFilters, PropertyType, ListingStatus } from '../models/property.model';
import { NotificationService } from '../../../shared/services/notification.service';

// ── API response shapes ───────────────────────────────────────────────────────
interface ApiResponse<T> {
  status:   string;
  data:     T;
  message?: string;
}

interface PaginatedPropertiesResponse {
  properties: any[];
}

export interface PaginationMeta {
  total:   number;
  page:    number;
  pages:   number;
  results: number;
  nextCursor?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class PropertiesService {
  private http                = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private readonly base       = environment.apiUrl;

  // ── Reactive State ────────────────────────────────────────────────────────
  private _filters$    = new BehaviorSubject<PropertyFilters>({});
  readonly filters$    = this._filters$.asObservable();

  private _loading$    = new BehaviorSubject<boolean>(false);
  readonly loading$    = this._loading$.asObservable();

  private _error$      = new BehaviorSubject<string | null>(null);
  readonly error$      = this._error$.asObservable();

  private _pagination$ = new BehaviorSubject<PaginationMeta | null>(null);
  readonly pagination$ = this._pagination$.asObservable();

  // Maintain backward compatibility
  readonly activeFilter$ = new BehaviorSubject<string>('all');

  readonly properties$: Observable<Property[]> = this._filters$.pipe(
    switchMap((filters) => {
      // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
      setTimeout(() => {
        this._loading$.next(true);
        this._error$.next(null);
      });
      return this.getProperties(filters).pipe(
        finalize(() => setTimeout(() => this._loading$.next(false)))
      );
    }),
    shareReplay(1)
  );

  readonly filteredProperties$ = this.properties$;

  // ── Filter control ────────────────────────────────────────────────────────
  setFilters(filters: PropertyFilters): void {
    this._filters$.next(filters);
  }

  getCurrentFilters(): PropertyFilters {
    return this._filters$.value;
  }

  setFilter(filter: string): void {
    this.activeFilter$.next(filter);

    if (filter === 'all') {
      this.setFilters({});
      return;
    }

    const statusMap: Record<string, ListingStatus> = {
      'for-sale': 'for-sale',
      'for-rent': 'for-rent',
    };

    const typeMap: Record<string, PropertyType> = {
      apartment:  'apartment',
      villa:      'villa',
      house:      'house',
      studio:     'studio',
      office:     'office',
      shop:       'shop',
      land:       'land',
      commercial: 'commercial',
    };

    if (statusMap[filter]) {
      this.setFilters({ status: statusMap[filter] });
    } else if (typeMap[filter]) {
      this.setFilters({ type: typeMap[filter] });
    }
  }

  // ── API calls ─────────────────────────────────────────────────────────────

  getProperties(filters?: PropertyFilters): Observable<Property[]> {
    let params = new HttpParams();

    // Map frontend status (for-sale/for-rent) → backend listingType (sale/rent)
    if (filters?.status) {
      params = params.set('listingType', filters.status === 'for-rent' ? 'rent' : 'sale');
    }

    if (filters?.search) {
      params = params.set('search', filters.search);
      // Strictly prevent conflict: do not send city if we are doing a full-text search
      params = params.delete('city');
    } else if (filters?.city) {
      params = params.set('city', filters.city);
    }

    if (filters?.type)     params = params.set('type',     filters.type);
    if (filters?.maxPrice) params = params.set('maxPrice', String(filters.maxPrice));
    if (filters?.minPrice) params = params.set('minPrice', String(filters.minPrice));
    if (filters?.bedrooms) params = params.set('bedrooms', String(filters.bedrooms));
    if (filters?.page)     params = params.set('page',     String(filters.page));
    if (filters?.limit)    params = params.set('limit',    String(filters.limit));
    if (filters?.cursor)   params = params.set('cursor',   filters.cursor);

    return this.http
      .get<any>(`${this.base}/properties`, { params })
      .pipe(
        tap((res) => {
          // Update pagination metadata
          if (res.total !== undefined) {
            this._pagination$.next({
              total:   res.total   ?? 0,
              page:    res.page    ?? 1,
              pages:   res.pages   ?? 1,
              results: res.results ?? 0,
              nextCursor: res.nextCursor,
            });
          }
        }),
        map((res) => {
          const properties: any[] = res.data?.properties ?? [];
          return properties.map((p) => this.mapProperty(p));
        }),
        catchError((err: any) => {
          const message = err.error?.message ?? 'Failed to load properties. Please try again.';
          this._error$.next(message);
          this.notificationService.show(message, 'error');
          return of([] as Property[]); // Graceful degradation — return empty array, don't crash
        })
      );
  }

  getPropertyById(id: string): Observable<Property> {
    return this.http
      .get<ApiResponse<{ property: any; isFavorited?: boolean }>>(`${this.base}/properties/${id}`)
      .pipe(
        map((res) => {
          const p = res.data?.property;
          if (!p) throw new Error('Property not found in response');
          return this.mapProperty(p);
        }),
        catchError((err) => throwError(() => err))
      );
  }

  getMyProperties(): Observable<Property[]> {
    return this.http
      .get<ApiResponse<{ properties: any[] }>>(`${this.base}/properties/my`)
      .pipe(
        map((res) => {
          const properties: any[] = res.data?.properties ?? [];
          return properties.map((p) => this.mapProperty(p));
        }),
        catchError((err) => throwError(() => err))
      );
  }

  // ── Private: normalize every raw API property object ─────────────────────
  private mapProperty(p: any): Property {
    const listingType: 'sale' | 'rent' = p.listingType ?? 'sale';
    return {
      ...p,
      listingType,
      // Derive UI status from listingType
      status:             listingType === 'rent' ? 'for-rent' as const : 'for-sale' as const,
      // Flatten nested location object → display string
      location:           p.location?.city
                            ? `${p.location.city}${p.location.district ? ', ' + p.location.district : ''}`
                            : (typeof p.location === 'string' ? p.location : 'Unknown'),
      city:               p.location?.city ?? p.city ?? 'Unknown',
      // Preserve backend availability status separately
      availabilityStatus: p.status,  // 'available' | 'reserved' | 'sold'
      // Derive badge (backend also sends this as a virtual)
      badge:              p.badge ?? (listingType === 'rent' ? 'For Rent' : 'For Sale'),
      // Optional fields — keep whatever backend returns
      currency:           p.currency,
      features:           p.features   ?? [],
      featured:           p.featured   ?? false,
      avgRating:          p.avgRating,
      reviewCount:        p.reviewCount,
      owner:              p.owner,
    };
  }

  // ── Price formatting ──────────────────────────────────────────────────────
  formatPrice(price: number, currency: string, status: 'for-sale' | 'for-rent'): string {
    const symbols: Record<string, string> = {
      USD: '$', GBP: '£', EUR: '€', AED: 'AED ', SAR: 'SAR ', EGP: 'EGP ',
    };
    const symbol = symbols[currency] ?? '$';

    const formatted =
      price >= 1_000_000
        ? `${symbol}${(price / 1_000_000).toFixed(1)}M`
        : price >= 1_000
        ? `${symbol}${(price / 1_000).toFixed(0)}K`
        : `${symbol}${price.toLocaleString()}`;

    return status === 'for-rent' ? `${formatted} / mo` : formatted;
  }
}
