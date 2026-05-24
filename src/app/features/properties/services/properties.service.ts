import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError, combineLatest } from 'rxjs';
import { catchError, map, switchMap, shareReplay, finalize, tap, startWith } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

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
  private translateService    = inject(TranslateService);
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

  readonly properties$: Observable<Property[]> = combineLatest([
    this._filters$.pipe(
      switchMap((filters) => {
        // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          this._loading$.next(true);
          this._error$.next(null);
        });
        return this.getProperties(filters).pipe(
          finalize(() => setTimeout(() => this._loading$.next(false)))
        );
      })
    ),
    this.translateService.onLangChange.pipe(
      startWith({ lang: this.translateService.currentLang || this.translateService.defaultLang || 'en' })
    )
  ]).pipe(
    map(([properties, langChange]) => {
      return properties.map((p) => this.translateProperty(p, langChange.lang));
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
    const mapped = {
      ...p,
      listingType,
      status:             listingType === 'rent' ? 'for-rent' as const : 'for-sale' as const,
      availabilityStatus: p.status,
      currency:           p.currency,
      featured:           p.featured   ?? false,
      avgRating:          p.avgRating,
      reviewCount:        p.reviewCount,
      owner:              p.owner,
      _original: {
        title:       p.title,
        description: p.description,
        location:    p.location,
        city:        p.location?.city ?? p.city,
        district:    p.location?.district ?? p.district,
        badge:       p.badge ?? (listingType === 'rent' ? 'For Rent' : 'For Sale'),
        features:    [...(p.features || [])],
      }
    };
    return this.translateProperty(mapped);
  }

  translateProperty(p: Property, lang?: string): Property {
    const activeLang = lang || this.translateService.currentLang || this.translateService.defaultLang || 'en';
    const isAr = activeLang === 'ar';

    const original = (p as any)._original || {
      title:       p.title,
      description: p.description,
      location:    p.location,
      city:        p.city,
      district:    (p as any).district,
      badge:       p.badge,
      features:    [...(p.features || [])],
    };

    const t = (str: string | undefined): string => {
      if (!str) return '';
      const clean = str.replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
      for (const key of Object.keys(AR_TRANSLATIONS)) {
        const cleanKey = key.replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
        if (clean === cleanKey) {
          return AR_TRANSLATIONS[key];
        }
      }
      return AR_TRANSLATIONS[str] || AR_TRANSLATIONS[str.trim()] || str;
    };

    let resolvedTitle = '';
    if (original.title && typeof original.title === 'object') {
      resolvedTitle = original.title[activeLang] || original.title['en'] || '';
    } else {
      resolvedTitle = isAr ? t(original.title) : original.title;
    }

    let resolvedDesc = '';
    if (original.description && typeof original.description === 'object') {
      resolvedDesc = original.description[activeLang] || original.description['en'] || '';
    } else {
      resolvedDesc = isAr ? t(original.description) : original.description;
    }

    let resolvedCity = '';
    if (original.city && typeof original.city === 'object') {
      resolvedCity = original.city[activeLang] || original.city['en'] || '';
    } else {
      resolvedCity = isAr ? t(original.city) : original.city;
    }

    let resolvedDistrict = '';
    if (original.district && typeof original.district === 'object') {
      resolvedDistrict = original.district[activeLang] || original.district['en'] || '';
    } else {
      resolvedDistrict = isAr ? t(original.district) : original.district;
    }

    let resolvedLocation = '';
    if (original.location && typeof original.location === 'object') {
      const cityStr = original.location.city ? (original.location.city[activeLang] || original.location.city['en'] || '') : '';
      const distStr = original.location.district ? (original.location.district[activeLang] || original.location.district['en'] || '') : '';
      resolvedLocation = cityStr ? `${cityStr}${distStr ? ', ' + distStr : ''}` : '';
    } else {
      resolvedLocation = isAr ? t(original.location) : original.location;
    }

    const resolvedBadge = isAr
      ? (original.badge === 'For Rent' ? 'للإيجار' : original.badge === 'For Sale' ? 'للبيع' : t(original.badge))
      : original.badge;

    const resolvedFeatures = original.features?.map((f: string) => {
      return isAr ? t(f) : f;
    }) ?? [];

    return {
      ...p,
      title:       resolvedTitle,
      description: resolvedDesc,
      city:        resolvedCity,
      location:    resolvedLocation,
      badge:       resolvedBadge,
      features:    resolvedFeatures,
      _original:   original,
    } as any;
  }

  // ── Price formatting ──────────────────────────────────────────────────────
  formatPrice(price: number, currency: string, status: 'for-sale' | 'for-rent'): string {
    const isAr = (this.translateService.currentLang || this.translateService.defaultLang) === 'ar';

    const symbols: Record<string, string> = {
      USD: isAr ? 'دولار' : '$',
      GBP: isAr ? 'جنيه إسترليني' : '£',
      EUR: isAr ? 'يورو' : '€',
      AED: isAr ? 'درهم إماراتي' : 'AED ',
      SAR: isAr ? 'ريال سعودي' : 'SAR ',
      EGP: isAr ? 'جنيه مصري' : 'EGP ',
    };
    const symbol = symbols[currency] ?? (isAr ? currency : '$');

    let formatted = '';
    if (isAr) {
      formatted =
        price >= 1_000_000
          ? `${(price / 1_000_000).toFixed(1)} مليون ${symbol}`
          : price >= 1_000
          ? `${(price / 1_000).toFixed(0)} ألف ${symbol}`
          : `${price.toLocaleString('en-US')} ${symbol}`;
    } else {
      formatted =
        price >= 1_000_000
          ? `${symbol}${(price / 1_000_000).toFixed(1)}M`
          : price >= 1_000
          ? `${symbol}${(price / 1_000).toFixed(0)}K`
          : `${symbol}${price.toLocaleString()}`;
    }

    if (status === 'for-rent') {
      const suffix = isAr ? ' / شهرياً' : ' / mo';
      return `${formatted}${suffix}`;
    }
    return formatted;
  }
}

export const AR_TRANSLATIONS: Record<string, string> = {
  // Titles
  'Luxury Penthouse in Dubai Marina with Sea View': 'بنتهاوس فاخر في مرسى دبي مع إطلالة بحرية',
  'Sky Penthouse — Dubai Marina': 'بنتهاوس السماء — مرسى دبي',
  'Mayfair Garden Apartment': 'شقة مايفير مع حديقة',
  'Manhattan Skyline Loft': 'لوفت مانهاتن المطل على الأفق',
  "Côte d'Azur Beachfront Villa": 'فيلا كوت دازور المواجهة للشاطئ',
  'Zamalek Historic Mansion': 'قصر الزمالك التاريخي',
  'Riyadh Modern Palace': 'قصر الرياض الحديث',
  'Tokyo Minimalist Studio': 'استوديو طوكيو البسيط',
  'Rome Pantheon Apartment': 'شقة روما البانثيون',
  'Beverly Hills Estate': 'عقار بيفرلي هيلز الفاخر',
  'Al-Rehab Family Villa': 'فيلا عائلية في الرحاب',
  'Dubai Hills Mansion': 'قصر دبي هيلز',
  'Giza Pyramid View Condo': 'شقة مطلة على أهرامات الجيزة',
  'Marina Gate 2 - High Floor': 'مارينا جيت 2 - طابق مرتفع',
  'Palm Jumeirah Signature Villa': 'فيلا بالم جميرا المميزة',
  'Sheikh Zayed - Compound Villa': 'فيلا كمبوند بالشيخ زايد',
  'Luxury Nile Villa Qena': 'فيلا النيل الفاخرة بقنا',
  'Modern Student Apartment': 'شقة طلابية حديثة',

  // Descriptions
  'A premium villa with a private pool and direct Nile view for high-end residency.': 'فيلا راقية بمسبح خاص وإطلالة مباشرة على النيل لإقامة فاخرة.',
  'Perfectly located apartment near South Valley University with all facilities.': 'شقة بموقع مثالي بالقرب من جامعة جنوب الوادي مع كافة المرافق والخدمات.',
  'Experience luxury living in this sprawling penthouse with panoramic sea views and private rooftop access.': 'اختبر العيش الفاخر في هذا البنتهاوس الفسيح مع إطلالات بانورامية على البحر ومدخل خاص للسطح.',
  'A classic London residence in Mayfair, featuring high ceilings and a private walled garden.': 'مسكن لندن الكلاسيكي في مايفير، يتميز بأسقف عالية وحديقة خاصة مسورة.',
  'Authentic industrial loft in Tribeca with oversized windows and views of the One World Trade Center.': 'لوفت صناعي أصيل في تريبيكا بنوافذ ضخمة وإطلالات على مركز التجارة العالمي واحد.',
  'Stunning modern villa on the French Riviera with direct beach access and a heated infinity pool.': 'فيلا حديثة مذهلة على الريفييرا الفرنسية مع إمكانية الوصول المباشر للشاطئ ومسبح إنفينيتي مدفأ.',
  'A rare jewel in Zamalek, this historic mansion offers unparalleled views of the Nile and a lush private garden.': 'جوهرة نادرة في الزمالك، يقدم هذا القصر التاريخي إطلالات لا مثيل لها على النيل وحديقة خاصة مورقة.',
  'Ultra-modern palace in Riyadh featuring grand majlis areas and state-of-the-art home automation.': 'قصر فائق الحداثة في الرياض يتميز بمساحات مجلس واسعة وأنظمة أتمتة منزلية متطورة.',
  'Compact and efficient living in the heart of Shibuya, designed by a leading Japanese architect.': 'سكن مدمج وفعال في قلب شيبويا، صممه مهندس معماري ياباني رائد.',
  'Elegant apartment steps from the Pantheon, featuring original frescoes and Roman architecture.': 'شقة أنيقة على بعد خطوات من البانثيون، وتتميز بلوحات جدارية أصلية وعمارة رومانية.',
  'World-class estate in Beverly Hills with a private cinema and sprawling grounds.': 'عقار بمستوى عالمي في بيفرلي هيلز مع سينما خاصة وأراضي شاسعة.',
  'Spacious family home in New Cairo with a private garden and proximity to top schools.': 'بيت عائلي واسع في القاهرة الجديدة مع حديقة خاصة وبالقرب من أفضل المدارس.',
  'Contemporary mansion overlooking the golf course in the prestigious Dubai Hills Estate.': 'قصر معاصر يطل على ملعب الجولف في حي دبي هيلز الراقي.',
  'Wake up to the Giza Pyramids every day in this modern, high-floor luxury apartment.': 'استيقظ على منظر أهرامات الجيزة كل يوم في هذه الشقة الفاخرة والحديثة في طابق مرتفع.',
  'Luxurious apartment in Marina Gate with full marina views and designer furniture.': 'شقة فاخرة في مارينا جيت مع إطلالات كاملة على المرسى وأثاث راقٍ.',
  'Private beachfront living on the Palm Jumeirah with a custom-designed luxury villa.': 'عيش شاطئي خاص في نخلة جميرا مع فيلا فاخرة مصممة خصيصاً.',
  'Modern villa in a quiet Sheikh Zayed compound, featuring a private pool and smart home features.': 'فيلا حديثة في كمبوند هادئ بالشيخ زايد، تتميز بمسبح خاص وخصائص المنزل الذكي.',
  'Luxury fully furnished penthouse located in the heart of Dubai Marina with panoramic sea view, modern design, high-end finishes, smart home system, and access to premium amenities including pool, gym, and 24/7 security. Perfect for investment or residential living.': 'بنتهاوس فاخر مفروش بالكامل يقع في قلب مرسى دبي مع إطلالة بانورامية على البحر، وتصميم عصري، وتشطيبات راقية، ونظام منزل ذكي، وإمكانية الوصول إلى المرافق الفاخرة بما في ذلك المسبح، وصالة الألعاب الرياضية، والأمن على مدار الساعة. مثالي للاستثمار أو السكن.',

  // Locations / Cities / Districts
  'Dubai': 'دبي',
  'Marina': 'مرسى دبي',
  'JBR Walk': 'ممشى جي بي آر',
  'London': 'لندن',
  'Mayfair': 'مايفير',
  'Park Lane': 'بارك لين',
  'New York': 'نيويورك',
  'Tribeca': 'تريبيكا',
  'Hudson St': 'شارع هودسون',
  'Nice': 'نيس',
  'Promenade': 'البروميناد',
  'Bord de Mer': 'بورد دي مير',
  'Cairo': 'القاهرة',
  'Zamalek': 'الزمالك',
  'Mohamed Mazhar': 'محمد مظهر',
  'Riyadh': 'الرياض',
  'Al-Hada': 'الهدا',
  'King Fahd Rd': 'طريق الملك فهد',
  'Tokyo': 'طوكيو',
  'Shibuya': 'شيبويا',
  'Omotesando': 'أوموتيساندو',
  'Rome': 'روما',
  'Centro Storico': 'المركز التاريخي',
  'Via del Corso': 'فيا ديل كورسو',
  'Los Angeles': 'لوس أنجلوس',
  'Beverly Hills': 'بيفرلي هيلز',
  'Sunset Blvd': 'شارع Sunset',
  'New Cairo': 'القاهرة الجديدة',
  'Group 120': 'المجموعة 120',
  'Dubai Hills': 'دبي هيلز',
  'Parkway Vistas': 'باركواي فيستاز',
  'Giza': 'الجيزة',
  'Pyramids': 'الأهرامات',
  'Haram St': 'شارع الهرم',
  'Marina Gate': 'بوابة المرسى',
  'Palm Jumeirah': 'نخلة جميرا',
  'Frond M': 'السعفة M',
  'Sheikh Zayed': 'الشيخ زايد',
  'Beverly Hills Compound': 'كمبوند بيفرلي هيلز',
  'Qena': 'قنا',
  'Corniche': 'الكورنيش',
  'Nile St.': 'شارع النيل',
  'University St.': 'شارع الجامعة',
  'Main Road': 'الطريق الرئيسي',
  'Unknown': 'غير معروف',

  // Combined Locations
  'Dubai, Marina': 'دبي، مرسى دبي',
  'London, Mayfair': 'لندن، مايفير',
  'New York, Tribeca': 'نيويورك، تريبيكا',
  'Nice, Promenade': 'نيس، البروميناد',
  'Cairo, Zamalek': 'القاهرة، الزمالك',
  'Riyadh, Al-Hada': 'الرياض، الهدا',
  'Tokyo, Shibuya': 'طوكيو، شيبويا',
  'Rome, Centro Storico': 'روما، المركز التاريخي',
  'Los Angeles, Beverly Hills': 'لوس أنجلوس، بيفرلي هيلز',
  'Cairo, New Cairo': 'القاهرة، القاهرة الجديدة',
  'Dubai, Dubai Hills': 'دبي، دبي هيلز',
  'Giza, Pyramids': 'الجيزة، الأهرامات',
  'Dubai, Palm Jumeirah': 'دبي، نخلة جميرا',
  'Cairo, Sheikh Zayed': 'القاهرة، الشيخ زايد',
  'Qena, Corniche': 'قنا، الكورنيش',
  'Qena, University St.': 'قنا، شارع الجامعة',
  'Dubai, Downtown Dubai': 'دبي، وسط مدينة دبي',
  'Downtown Dubai': 'وسط مدينة دبي',

  // Features
  'Pool': 'مسبح',
  'Gym': 'صالة ألعاب رياضية',
  'Sea View': 'إحاطة بالبحر',
  'Porter': 'حارس مبنى',
  'Garden': 'حديقة',
  'Doorman': 'بواب',
  'Rooftop': 'سطح',
  'City View': 'إإطلالة على المدينة',
  'Private Beach': 'شاطئ خاص',
  'Infinity Pool': 'مسبح إنفينيتي',
  'Nile View': 'إإطلالة على النيل',
  'Classic Interior': 'تصميم داخلي كلاسيكي',
  'Majlis': 'مجلس',
  'Indoor Pool': 'مسبح داخلي',
  'Elevator': 'مصعد',
  'Smart Home': 'منزل ذكي',
  'Subway Access': 'قريب من المترو',
  'Historical Building': 'مبنى تاريخي',
  'High Ceilings': 'أسقف مرتفعة',
  'Cinema': 'سينما',
  'Wine Cellar': 'قبو',
  'Basketball Court': 'ملعب كرة سلة',
  'Security': 'حراسة وأمن',
  'Club Access': 'دخول النادي',
  'Golf Course View': 'إطلالة على ملعب الجولف',
  'Pyramid View': 'إطلالة على الأهرامات',
  'Balcony': 'شرفة',
  'Marina View': 'إطلالة على المرسى',
  'Full Furniture': 'مفروش بالكامل',
  'Bespoke Design': 'تصميم مخصص',
  'Swimming Pool': 'حمام سباحة',
};
