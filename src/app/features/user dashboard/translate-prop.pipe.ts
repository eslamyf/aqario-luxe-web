import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AR_TRANSLATIONS } from '../properties/services/properties.service';

@Pipe({
  name: 'translateProp',
  pure: false,
  standalone: true
})
export class TranslatePropPipe implements PipeTransform {
  private translate = inject(TranslateService);

  transform(value: any): string {
    if (!value) return '';
    const activeLang = this.translate.currentLang || this.translate.defaultLang || 'en';

    // 1. If it's a bilingual object: { en: string, ar: string }
    if (typeof value === 'object') {
      return value[activeLang] || value['en'] || '';
    }

    // 2. If it's a string, use active translation / AR_TRANSLATIONS for legacy compatibility
    if (typeof value === 'string') {
      if (activeLang !== 'ar') return value;

      const clean = value.replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
      for (const key of Object.keys(AR_TRANSLATIONS)) {
        const cleanKey = key.replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
        if (clean === cleanKey) {
          return AR_TRANSLATIONS[key];
        }
      }
      return AR_TRANSLATIONS[value] || AR_TRANSLATIONS[value.trim()] || value;
    }

    return String(value);
  }
}
