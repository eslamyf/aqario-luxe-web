// ─────────────────────────────────────────────────────────────────────────────
// LUXE ESTATES — Property Model
// Aligned with: Real-Estate-Backend-/src/models/property.model.js
// ─────────────────────────────────────────────────────────────────────────────

/** Property types — must match backend enum exactly */
export type PropertyType =
  | 'apartment'
  | 'villa'
  | 'house'
  | 'studio'
  | 'office'
  | 'shop'
  | 'land'
  | 'commercial';

/** listingType — native backend field (sale | rent) */
export type ListingType = 'sale' | 'rent';

/**
 * status in the UI sense (for-sale / for-rent) — derived from listingType.
 * @deprecated Use listingType for all API calls; this is a UI display helper only.
 */
export type ListingStatus = 'for-sale' | 'for-rent';

/** Availability status — the backend `status` field (available / reserved / sold) */
export type AvailabilityStatus = 'available' | 'reserved' | 'sold';

export interface Property {
  _id: string;
  title: string;
  /** Flat display string (e.g. "Dubai Marina, UAE") — derived from location.city in the service */
  location: string;
  /** Filter key — same as location.city from backend */
  city: string;
  price: number;
  /** e.g. 'USD' | 'GBP' | 'EUR' | 'AED' — may be undefined for legacy records */
  currency?: string;
  type: PropertyType;
  /** UI-only derived field: 'for-sale' | 'for-rent' — mapped from listingType in service */
  status: ListingStatus;
  /** Native backend field */
  listingType: ListingType;
  /** Availability: 'available' | 'reserved' | 'sold' */
  availabilityStatus?: AvailabilityStatus;
  bedrooms: number;
  bathrooms: number;
  /** m² */
  area: number;
  images: string[];
  description: string;
  /** e.g. ['Pool', 'Gym', 'Concierge'] — may be undefined for legacy records */
  features?: string[];
  featured?: boolean;
  /** e.g. 'For Sale', 'For Rent', 'New', 'Featured' — derived in service */
  badge?: string;
  avgRating?: number;
  reviewCount?: number;
  owner?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    photo?: string;
    bio?: string;
  };
  isApproved: boolean;
  promotionScore: number;
  promotion: {
    isFeatured: boolean;
    isBoosted: boolean;
    hasPremiumBadge: boolean;
    expiresAt?: string;
  };
  _original?: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter shape — maps to backend query params
// ─────────────────────────────────────────────────────────────────────────────
export interface PropertyFilters {
  /** Map to full text search */
  search?: string;
  /** Maps to backend ?listingType=sale|rent */
  status?: ListingStatus;
  type?: PropertyType;
  city?: string;
  maxPrice?: number;
  minPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  page?: number;
  limit?: number;
  /** Map to cursor pagination */
  cursor?: string;
}

