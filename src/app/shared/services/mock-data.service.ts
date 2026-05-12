import { Injectable } from '@angular/core';

export interface Agent {
    id?: string;
    name: string;
    initial?: string;
    specialty?: string;
    countries?: string[];
    sales?: string;
    value?: string;
    rating?: number;
}

export interface Auction {
    _id: string;
    title: string;
    currentBid: number;
    bidders?: number;
    endsAt: Date;
    location?: string;
    image?: string;
    status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  getAgents(): Agent[] {
    return [
      {
        id: '1',
        name: 'Victoria Hartwell',
        initial: 'V',
        specialty: 'Luxury Residential',
        countries: ['UAE', 'UK', 'Monaco'],
        sales: '48',
        value: '$340M',
        rating: 4.9
      },
      {
        id: '2',
        name: 'Khalid Al-Mansouri',
        initial: 'K',
        specialty: 'Commercial & Investment',
        countries: ['UAE', 'Saudi Arabia', 'Qatar'],
        sales: '62',
        value: '$580M',
        rating: 5.0
      },
      {
        id: '3',
        name: 'Sophia Chen',
        initial: 'S',
        specialty: 'Asia-Pacific Residency',
        countries: ['Singapore', 'HK', 'Tokyo'],
        sales: '35',
        value: '$210M',
        rating: 4.8
      },
      {
        id: '4',
        name: 'Marcus Delacroix',
        initial: 'M',
        specialty: 'European Heritage Properties',
        countries: ['France', 'Italy', 'Spain'],
        sales: '29',
        value: '$180M',
        rating: 4.9
      }
    ];
  }

  getAuctions(): Auction[] {
    return [
      {
        _id: 'a1',
        title: 'Burj Khalifa View Penthouse',
        location: 'DUBAI, UAE',
        currentBid: 17500000,
        bidders: 23,
        endsAt: new Date(Date.now() + 86400000 * 2.15), // ~2 days 3 hours
        image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80'
      },
      {
        _id: 'a2',
        title: 'Chelsea Riverside Mansion',
        location: 'LONDON, UK',
        currentBid: 9200000,
        bidders: 14,
        endsAt: new Date(Date.now() + 86400000 * 0.1), // ending soon
        image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80'
      },
      {
        _id: 'a3',
        title: 'Monaco Grand Prix Villa',
        location: 'MONACO, FR',
        currentBid: 24500000,
        bidders: 32,
        endsAt: new Date(Date.now() + 86400000 * 12.5), 
        image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80'
      },
      {
        _id: 'a4',
        title: 'Central Park Peak Eyrie',
        location: 'NEW YORK, USA',
        currentBid: 32000000,
        bidders: 41,
        endsAt: new Date(Date.now() + 86400000 * 4.8), 
        image: 'https://images.unsplash.com/photo-1613490908129-f1970b1cb3f9?auto=format&fit=crop&w=1600&q=80'
      }
    ];
  }
}
