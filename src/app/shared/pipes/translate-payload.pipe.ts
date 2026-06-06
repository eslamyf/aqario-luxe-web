import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'translatePayload',
  pure: false,
  standalone: true
})
export class TranslatePayloadPipe implements PipeTransform {
  private translate = inject(TranslateService);

  transform(value: any): string {
    if (!value) return '';
    const activeLang = this.translate.currentLang || this.translate.defaultLang || 'en';

    if (typeof value === 'object') {
      return value[activeLang] || value['en'] || value['ar'] || '';
    }

    if (typeof value !== 'string') {
      return String(value);
    }

    // 1. Decode HTML entities
    let decoded = this.decodeHtmlEntities(value);

    // 2. Try to parse if it is a pure JSON object string
    try {
      const parsed = JSON.parse(decoded);
      if (parsed && typeof parsed === 'object') {
        return parsed[activeLang] || parsed['en'] || parsed['ar'] || decoded;
      }
    } catch (e) {
      // Ignore JSON error, continue with regex parsing
    }

    // 3. Find and replace embedded JS-like objects: { en: '...', ar: '...' }
    const objPattern = /\{[^{}]*?(?:"en"|'en'|en)\s*:\s*[^{}]*?\}/g;
    decoded = decoded.replace(objPattern, (match) => {
      return this.extractBilingual(match, activeLang);
    });

    // 4. Handle direct inline strings: "en: Modern Villa, ar: فيلا حديثة"
    if (decoded.includes('en:') && decoded.includes('ar:')) {
      const enMatch = decoded.match(/en\s*:\s*(.*?)(?=\s*,?\s*ar\s*:|$)/);
      const arMatch = decoded.match(/ar\s*:\s*(.*?)(?=\s*,?\s*en\s*:|$)/);
      if (activeLang === 'ar' && arMatch) {
        return arMatch[1].trim();
      }
      if (activeLang === 'en' && enMatch) {
        return enMatch[1].trim();
      }
    }

    return decoded;
  }

  private decodeHtmlEntities(str: string): string {
    return str
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  private extractBilingual(objStr: string, lang: string): string {
    const content = objStr.slice(1, -1).trim();
    const keyValueRegex = /(?:"([^"]+)"|'([^']+)'|([a-zA-Z0-9_]+))\s*:\s*(?:"([^"]*)"|'([^']*)'|([^,{}]+))/g;
    let match;
    const dict: { [key: string]: string } = {};

    while ((match = keyValueRegex.exec(content)) !== null) {
      const key = match[1] || match[2] || match[3];
      const value = match[4] !== undefined ? match[4] : (match[5] !== undefined ? match[5] : (match[6] || '').trim());
      if (key) {
        dict[key.trim()] = value;
      }
    }

    return dict[lang] || dict['en'] || dict['ar'] || objStr;
  }
}
