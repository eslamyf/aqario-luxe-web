import { Component, HostListener, inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

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
  private translateService = inject(TranslateService);

  get currentLang(): string {
    return this.translateService.currentLang || 'ar';
  }

  activeChip: string | null = null;
  openDropdown: 'propertyType' | 'location' | 'listingType' | 'budget' | null = null;

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openDropdown = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.openDropdown = null;
  }

  chips = [
    { value: 'Villas', labelKey: 'REAL_ESTATE.VILLAS_CHIP' },
    { value: 'Apartments', labelKey: 'REAL_ESTATE.APARTMENTS_CHIP' },
    { value: 'Penthouses', labelKey: 'REAL_ESTATE.PENTHOUSES_CHIP' },
    { value: 'Estates', labelKey: 'REAL_ESTATE.ESTATES_CHIP' }
  ];

  searchForm: FormGroup;

  propertyTypes = [
    { value: 'All Types', nameAr: 'جميع الأنواع', nameEn: 'All Types' },
    { value: 'Villa', nameAr: 'فيلا', nameEn: 'Villa' },
    { value: 'Apartment', nameAr: 'شقة', nameEn: 'Apartment' },
    { value: 'Penthouse', nameAr: 'بنتهاوس', nameEn: 'Penthouse' },
    { value: 'Estate', nameAr: 'عقار تجاري / أرض', nameEn: 'Commercial / Land' }
  ];

  locations = [
    { value: '', nameAr: 'جميع المناطق', nameEn: 'All Locations' },
    { value: 'Qena', nameAr: 'قنا', nameEn: 'Qena' },
    { value: 'New Qena', nameAr: 'قنا الجديدة', nameEn: 'New Qena' },
    { value: 'Nag Hammadi', nameAr: 'نجع حمادي', nameEn: 'Nag Hammadi' },
    { value: 'Qous', nameAr: 'قوص', nameEn: 'Qous' },
    { value: 'Deshna', nameAr: 'دشنا', nameEn: 'Deshna' },
    { value: 'Naqada', nameAr: 'نقادة', nameEn: 'Naqada' },
    { value: 'Luxor', nameAr: 'الأقصر', nameEn: 'Luxor' },
    { value: 'Hurghada', nameAr: 'الغردقة', nameEn: 'Hurghada' },
    { value: 'Other Upper Egypt', nameAr: 'مناطق أخرى من صعيد مصر', nameEn: 'Other Upper Egypt' }
  ];

  listingTypes = [
    { value: 'For Sale', nameAr: 'للبيع', nameEn: 'For Sale' },
    { value: 'For Rent', nameAr: 'للإيجار', nameEn: 'For Rent' }
  ];

  budgets = [
    { value: 'Any Budget', nameAr: 'أي سعر', nameEn: 'Any Price' },
    { value: 'Up to 500K EGP', nameAr: 'حتى 500 ألف ج.م', nameEn: 'Up to 500K EGP' },
    { value: '500K – 1.5M EGP', nameAr: '500 ألف – 1.5 مليون ج.م', nameEn: '500K – 1.5M EGP' },
    { value: '1.5M – 3M EGP', nameAr: '1.5 مليون – 3 مليون ج.م', nameEn: '1.5M – 3M EGP' },
    { value: '3M – 5M EGP', nameAr: '3 مليون – 5 مليون ج.م', nameEn: '3M – 5M EGP' },
    { value: '5M+ EGP', nameAr: 'أكثر من 5 مليون ج.م', nameEn: '5M+ EGP' }
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

  toggleDropdown(dropdownName: 'propertyType' | 'location' | 'listingType' | 'budget', event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.openDropdown = this.openDropdown === dropdownName ? null : dropdownName;
  }

  selectOption(field: string, value: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.searchForm.patchValue({ [field]: value });
    this.openDropdown = null;

    if (field === 'propertyType') {
      // Sync chip state
      const reverseMap: Record<string, string> = {
        Villa: 'Villas',
        Apartment: 'Apartments',
        Penthouse: 'Penthouses',
        Estate: 'Estates',
      };
      this.activeChip = reverseMap[value] || null;
    }
  }

  closeDropdowns(): void {
    this.openDropdown = null;
  }

  getSelectedDisplay(field: 'propertyType' | 'location' | 'listingType' | 'budget'): string {
    const val = this.searchForm.value[field];
    const isAr = this.currentLang === 'ar';
    switch (field) {
      case 'propertyType': {
        const item = this.propertyTypes.find(t => t.value === val);
        return item ? (isAr ? item.nameAr : item.nameEn) : (isAr ? 'جميع الأنواع' : 'All Types');
      }
      case 'location': {
        const item = this.locations.find(l => l.value === val);
        return item ? (isAr ? item.nameAr : item.nameEn) : (isAr ? 'جميع المناطق' : 'All Locations');
      }
      case 'listingType': {
        const item = this.listingTypes.find(lt => lt.value === val);
        return item ? (isAr ? item.nameAr : item.nameEn) : (isAr ? 'للبيع' : 'For Sale');
      }
      case 'budget': {
        const item = this.budgets.find(b => b.value === val);
        return item ? (isAr ? item.nameAr : item.nameEn) : (isAr ? 'أي سعر' : 'Any Price');
      }
      default:
        return '';
    }
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
