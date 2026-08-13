import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';

export interface SearchPayload {
  search?: string;
  city?: string;
  type?: string;
  listingType?: string;
  minPrice?: number;
  maxPrice?: number;
}

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss'],
})
export class SearchBarComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);

  activeChip: string | null = null;

  chips = [
    { value: 'Villas', labelKey: 'REAL_ESTATE.VILLAS_CHIP' },
    { value: 'Apartments', labelKey: 'REAL_ESTATE.APARTMENTS_CHIP' },
    { value: 'Penthouses', labelKey: 'REAL_ESTATE.PENTHOUSES_CHIP' },
    { value: 'Estates', labelKey: 'REAL_ESTATE.ESTATES_CHIP' }
  ];

  searchForm: FormGroup;

  propertyTypes = [
    { value: 'All Types', labelKey: 'SEARCH.ALL_TYPES' },
    { value: 'Villa', labelKey: 'REAL_ESTATE.VILLA' },
    { value: 'Apartment', labelKey: 'REAL_ESTATE.APARTMENT' },
    { value: 'Penthouse', labelKey: 'REAL_ESTATE.PENTHOUSE' },
    { value: 'Estate', labelKey: 'REAL_ESTATE.ESTATE' }
  ];

  locations = [
    { value: '', labelKey: 'SEARCH.ALL_LOCATIONS' },
    { value: 'Qena', labelKey: 'SEARCH.LOCATION_QENA' },
    { value: 'New Qena', labelKey: 'SEARCH.LOCATION_NEW_QENA' },
    { value: 'Luxor', labelKey: 'SEARCH.LOCATION_LUXOR' },
    { value: 'Hurghada', labelKey: 'SEARCH.LOCATION_HURGHADA' },
    { value: 'Other Upper Egypt', labelKey: 'SEARCH.LOCATION_OTHER_UPPER_EGYPT' }
  ];

  listingTypes = [
    { value: 'For Sale', labelKey: 'REAL_ESTATE.FOR_SALE' },
    { value: 'For Rent', labelKey: 'REAL_ESTATE.FOR_RENT' }
  ];

  budgets = [
    { value: 'Any Budget', labelKey: 'SEARCH.ANY_BUDGET' },
    { value: 'Up to 500K EGP', labelKey: 'SEARCH.BUDGET_500K' },
    { value: '500K – 1.5M EGP', labelKey: 'SEARCH.BUDGET_500K_1_5M' },
    { value: '1.5M – 3M EGP', labelKey: 'SEARCH.BUDGET_1_5M_3M' },
    { value: '3M – 5M EGP', labelKey: 'SEARCH.BUDGET_3M_5M' },
    { value: '5M+ EGP', labelKey: 'SEARCH.BUDGET_5M_PLUS' }
  ];

  constructor() {
    this.searchForm = this.fb.group({
      searchQuery: [''],
      location: [''],
      propertyType: ['All Types'],
      listingType: ['For Sale'],
      budget: ['Any Budget'],
    });
  }

  selectChip(chipValue: string): void {
    this.activeChip = this.activeChip === chipValue ? null : chipValue;
    // Sync chip with form
    if (this.activeChip) {
      const typeMap: Record<string, string> = {
        Villas: 'Villa',
        Apartments: 'Apartment',
        Penthouses: 'Penthouse',
        Estates: 'Estate',
      };
      this.searchForm.patchValue({ propertyType: typeMap[this.activeChip] });
    } else {
      this.searchForm.patchValue({ propertyType: 'All Types' });
    }
  }

  onExplore(): void {
    const { searchQuery, location, propertyType, listingType, budget } = this.searchForm.value;

    const input = (searchQuery || '').trim();
    const isAdvancedSearch = input.includes(' ') || input.length > 10;
    const cityVal = location || (!isAdvancedSearch && input ? input : undefined);

    const payload: SearchPayload = {
      search: isAdvancedSearch && input ? input : undefined,
      city: cityVal,
      type: propertyType === 'All Types' ? undefined : propertyType.toLowerCase(),
      listingType: listingType === 'For Sale' ? 'for-sale' : 'for-rent',
      ...this.budgetToRange(budget)
    };

    // Clean query params
    const queryParams = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v != null && v !== '')
    );

    this.router.navigate(['/properties'], {
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  private budgetToRange(budget: string): { minPrice?: number; maxPrice?: number } {
    switch (budget) {
      case 'Up to 500K EGP':
      case 'Up to $500K':
        return { maxPrice: 500000 };
      case '500K – 1.5M EGP':
        return { minPrice: 500000, maxPrice: 1500000 };
      case '1.5M – 3M EGP':
      case '$1M – $3M':
        return { minPrice: 1500000, maxPrice: 3000000 };
      case '3M – 5M EGP':
        return { minPrice: 3000000, maxPrice: 5000000 };
      case '5M+ EGP':
      case '$10M+':
        return { minPrice: 5000000 };
      default:
        return {};
    }
  }
}
