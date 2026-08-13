// ─────────────────────────────────────────────────────────────────────────────
// AQARIO — Mock Properties Data (Qena & Upper Egypt Market)
// ─────────────────────────────────────────────────────────────────────────────
// Types aligned with backend enum:
//   apartment | villa | house | studio | office | shop | land | commercial
// ─────────────────────────────────────────────────────────────────────────────

import { Property } from '../models/property.model';

export const MOCK_PROPERTIES: Property[] = [
  {
    _id: 'p1',
    title: 'Luxury Nile Villa Qena',
    location: 'Qena, Corniche',
    city: 'Qena',
    price: 4_500_000,
    currency: 'EGP',
    type: 'villa',
    status: 'for-sale',
    listingType: 'sale',
    availabilityStatus: 'available',
    bedrooms: 5,
    bathrooms: 4,
    area: 450,
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80',
    ],
    description:
      'A premium villa with a private pool and direct Nile view for high-end residency in Qena.',
    features: ['Nile View', 'Super Lux Finishing', 'Private Garden', 'Garages'],
    featured: true,
    badge: 'For Sale',
    isApproved: true,
    promotionScore: 100,
    promotion: {
      isFeatured: true,
      isBoosted: false,
      hasPremiumBadge: true
    }
  },
  {
    _id: 'p2',
    title: 'Modern Student Apartment Near SVU',
    location: 'Qena, University St.',
    city: 'Qena',
    price: 3_500,
    currency: 'EGP',
    type: 'apartment',
    status: 'for-rent',
    listingType: 'rent',
    availabilityStatus: 'available',
    bedrooms: 3,
    bathrooms: 2,
    area: 130,
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80',
    ],
    description:
      'Perfectly located apartment near South Valley University with all facilities and services in Qena.',
    features: ['Near SVU University', 'Elevator', 'Balcony', 'Water & Electricity Meter'],
    featured: true,
    badge: 'For Rent',
    isApproved: true,
    promotionScore: 90,
    promotion: {
      isFeatured: true,
      isBoosted: true,
      hasPremiumBadge: false
    }
  },
  {
    _id: 'p3',
    title: 'Commercial Shop in Qena City Center',
    location: 'Qena, El-Gameel St.',
    city: 'Qena',
    price: 1_800_000,
    currency: 'EGP',
    type: 'shop',
    status: 'for-sale',
    listingType: 'sale',
    availabilityStatus: 'available',
    bedrooms: 0,
    bathrooms: 1,
    area: 65,
    images: [
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80',
      'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&q=80',
    ],
    description:
      'Prime retail shop ready for investment in the heart of Qena commercial market.',
    features: ['Commercial Permit', 'Security', 'Water & Electricity Meter'],
    featured: true,
    badge: 'For Sale',
    isApproved: true,
    promotionScore: 85,
    promotion: {
      isFeatured: true,
      isBoosted: false,
      hasPremiumBadge: true
    }
  },
  {
    _id: 'p4',
    title: 'Residential Apartment in New Qena',
    location: 'New Qena, First District',
    city: 'New Qena',
    price: 1_450_000,
    currency: 'EGP',
    type: 'apartment',
    status: 'for-sale',
    listingType: 'sale',
    availabilityStatus: 'available',
    bedrooms: 3,
    bathrooms: 2,
    area: 160,
    images: [
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80',
    ],
    description:
      'Modern 3-bedroom apartment with deluxe finishes in New Qena residential district.',
    features: ['Super Lux Finishing', 'Garages', 'Elevator', 'Balcony'],
    featured: true,
    badge: 'For Sale',
    isApproved: true,
    promotionScore: 80,
    promotion: {
      isFeatured: true,
      isBoosted: false,
      hasPremiumBadge: false
    }
  },
  {
    _id: 'p5',
    title: 'Building Plot in New Qena',
    location: 'New Qena, Second District',
    city: 'New Qena',
    price: 2_200_000,
    currency: 'EGP',
    type: 'land',
    status: 'for-sale',
    listingType: 'sale',
    availabilityStatus: 'available',
    bedrooms: 0,
    bathrooms: 0,
    area: 350,
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
    ],
    description:
      'Prime residential land plot in New Qena approved for immediate building.',
    features: ['Commercial Permit'],
    featured: false,
    badge: 'For Sale',
    isApproved: true,
    promotionScore: 40,
    promotion: {
      isFeatured: false,
      isBoosted: false,
      hasPremiumBadge: true
    }
  },
  {
    _id: 'p6',
    title: 'Nile View Apartment in Luxor',
    location: 'Luxor, East Bank',
    city: 'Luxor',
    price: 2_100_000,
    currency: 'EGP',
    type: 'apartment',
    status: 'for-sale',
    listingType: 'sale',
    availabilityStatus: 'available',
    bedrooms: 3,
    bathrooms: 2,
    area: 175,
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
    ],
    description:
      'Stunning Nile view apartment in Luxor Corniche, fully finished and move-in ready.',
    features: ['Nile View', 'Balcony', 'Elevator', 'Security'],
    featured: true,
    badge: 'For Sale',
    isApproved: true,
    promotionScore: 70,
    promotion: {
      isFeatured: true,
      isBoosted: false,
      hasPremiumBadge: false
    }
  },
];
