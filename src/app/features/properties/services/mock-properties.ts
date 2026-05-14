// ─────────────────────────────────────────────────────────────────────────────
// LUXE ESTATES — Mock Properties Data
// ─────────────────────────────────────────────────────────────────────────────
// Types aligned with backend enum:
//   apartment | villa | house | studio | office | shop | land | commercial
// ─────────────────────────────────────────────────────────────────────────────

import { Property } from '../models/property.model';

export const MOCK_PROPERTIES: Property[] = [
  {
    _id: 'p1',
    title: 'Sky Penthouse Dubai Marina',
    location: 'Dubai Marina, UAE',
    city: 'Dubai',
    price: 8_500_000,
    currency: 'USD',
    type: 'apartment',
    status: 'for-sale',
    listingType: 'sale',
    availabilityStatus: 'available',
    bedrooms: 5,
    bathrooms: 6,
    area: 450,
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80',
    ],
    description:
      "Breathtaking penthouse with panoramic views of Dubai Marina and the Arabian Gulf. Featuring a private rooftop pool, chef's kitchen, and bespoke Italian finishes throughout.",
    features: ['Pool', 'Gym', 'Concierge', 'Smart Home', 'Parking'],
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
    title: 'Mayfair Garden Apartment',
    location: 'Mayfair, London',
    city: 'London',
    price: 3_200_000,
    currency: 'GBP',
    type: 'apartment',
    status: 'for-sale',
    listingType: 'sale',
    availabilityStatus: 'available',
    bedrooms: 3,
    bathrooms: 2,
    area: 180,
    images: [
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80',
    ],
    description:
      "A stunning lateral apartment in the heart of Mayfair, one of London's most prestigious neighbourhoods. Original period features with contemporary interiors.",
    features: ['24/7 Porter', 'Gym', 'Garden', 'Wine Cellar'],
    featured: false,
    badge: 'For Sale',
    isApproved: true,
    promotionScore: 0,
    promotion: {
      isFeatured: false,
      isBoosted: false,
      hasPremiumBadge: false
    }
  },
  {
    _id: 'p3',
    title: 'Manhattan Skyline Loft',
    location: 'Tribeca, New York',
    city: 'New York',
    price: 18_000,
    currency: 'USD',
    type: 'apartment',
    status: 'for-rent',
    listingType: 'rent',
    availabilityStatus: 'available',
    bedrooms: 2,
    bathrooms: 2,
    area: 220,
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80',
      'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&q=80',
    ],
    description:
      'Industrial chic loft in Tribeca with floor-to-ceiling windows showcasing iconic Manhattan views. Doorman building with private rooftop access.',
    features: ['Doorman', 'Gym', 'Rooftop', 'Storage'],
    featured: false,
    badge: 'For Rent',
    isApproved: true,
    promotionScore: 50,
    promotion: {
      isFeatured: false,
      isBoosted: true,
      hasPremiumBadge: false
    }
  },
  {
    _id: 'p4',
    title: "Côte d'Azur Beachfront Villa",
    location: 'Nice, French Riviera',
    city: 'Nice',
    price: 12_800_000,
    currency: 'EUR',
    type: 'villa',
    status: 'for-sale',
    listingType: 'sale',
    availabilityStatus: 'available',
    bedrooms: 7,
    bathrooms: 8,
    area: 800,
    images: [
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80',
    ],
    description:
      'Exceptional beachfront villa on the French Riviera with private beach access, infinity pool overlooking the Mediterranean, and a private wine cave.',
    features: ['Private Beach', 'Pool', 'Tennis Court', 'Wine Cave', 'Staff Quarters'],
    featured: true,
    badge: 'For Sale',
    isApproved: true,
    promotionScore: 100,
    promotion: {
      isFeatured: true,
      isBoosted: false,
      hasPremiumBadge: false
    }
  },
  {
    _id: 'p5',
    title: 'Singapore Marina Bay Residence',
    location: 'Marina Bay, Singapore',
    city: 'Singapore',
    price: 22_000,
    currency: 'USD',
    type: 'apartment',
    status: 'for-rent',
    listingType: 'rent',
    availabilityStatus: 'available',
    bedrooms: 3,
    bathrooms: 3,
    area: 260,
    images: [
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80',
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80',
    ],
    description:
      'Premier waterfront residence with stunning views of Marina Bay Sands and the city skyline. Infinity pool, sky garden, and white-glove concierge service.',
    features: ['Infinity Pool', 'Sky Garden', 'Concierge', 'Gym'],
    featured: false,
    badge: 'For Rent',
    isApproved: true,
    promotionScore: 20,
    promotion: {
      isFeatured: false,
      isBoosted: false,
      hasPremiumBadge: true
    }
  },
  {
    _id: 'p6',
    title: 'Paris 8ème Haussmann Apartment',
    location: '8th Arrondissement, Paris',
    city: 'Paris',
    price: 4_600_000,
    currency: 'EUR',
    type: 'apartment',
    status: 'for-sale',
    listingType: 'sale',
    availabilityStatus: 'available',
    bedrooms: 4,
    bathrooms: 3,
    area: 240,
    images: [
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80',
    ],
    description:
      'Magnificent Haussmann-era apartment with original parquet floors, ornate fireplaces, and sweeping Eiffel Tower views from the wraparound balcony.',
    features: ['Balcony', 'Cave', 'Concierge', 'Parking'],
    featured: false,
    badge: 'For Sale',
    isApproved: true,
    promotionScore: 0,
    promotion: {
      isFeatured: false,
      isBoosted: false,
      hasPremiumBadge: false
    }
  },
];
