import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

export interface SeoConfig {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private doc = inject(DOCUMENT);

  private readonly defaultTitle = 'AQARIO — سوق العقارات في صعيد مصر | شقق، أراضي، وفلل للبيع والإيجار';
  private readonly defaultDescription = 'منصة AQARIO الرائدة لسوق العقارات في صعيد مصر. اكتشف أفضل العقارات والشقق والأراضي والفلل بأسعار شفافة، وتواصل مباشرة مع أصحاب العقارات والمسوقين.';
  private readonly defaultKeywords = 'AQARIO, عقاريو, عقاريو صعيد مصر, عقارات صعيد مصر, عقارات الصعيد, شقق للبيع في الصعيد, شقق للايجار في الصعيد, عقارات قنا, شقق للبيع في قنا, عقارات قنا الجديدة, عقارات الأقصر, عقارات سوهاج, عقارات أسيوط, عقارات الغردقة, AQARIO Upper Egypt, Upper Egypt Real Estate, Upper Egypt Properties, Real Estate in Qena, Qena Properties, Luxor Real Estate, Sohag Real Estate, Asyut Real Estate, Hurghada Real Estate';

  updateSeo(config: SeoConfig = {}): void {
    const title = config.title ? `${config.title} | AQARIO` : this.defaultTitle;
    const description = config.description || this.defaultDescription;
    const keywords = config.keywords || this.defaultKeywords;
    const canonical = config.canonicalUrl || 'https://aqario.app/';
    const ogTitle = config.ogTitle || title;
    const ogDescription = config.ogDescription || description;
    const ogImage = config.ogImage || 'https://aqario.app/assets/images/logo.png';

    // 1. Update Title
    this.titleService.setTitle(title);

    // 2. Update Meta Tags
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ name: 'keywords', content: keywords });

    // 3. Update OpenGraph Tags
    this.metaService.updateTag({ property: 'og:title', content: ogTitle });
    this.metaService.updateTag({ property: 'og:description', content: ogDescription });
    this.metaService.updateTag({ property: 'og:image', content: ogImage });
    this.metaService.updateTag({ property: 'og:url', content: canonical });

    // 4. Update Twitter Card Tags
    this.metaService.updateTag({ name: 'twitter:title', content: ogTitle });
    this.metaService.updateTag({ name: 'twitter:description', content: ogDescription });
    this.metaService.updateTag({ name: 'twitter:image', content: ogImage });

    // 5. Update Canonical Link Element
    let link: HTMLLinkElement | null = this.doc.querySelector("link[rel='canonical']");
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', canonical);

    // 6. Update Hreflang Tags
    this.updateHreflangTags(canonical);
  }

  updateHreflangTags(url: string): void {
    let linkAr: HTMLLinkElement | null = this.doc.querySelector("link[hreflang='ar']");
    if (!linkAr) {
      linkAr = this.doc.createElement('link');
      linkAr.setAttribute('rel', 'alternate');
      linkAr.setAttribute('hreflang', 'ar');
      this.doc.head.appendChild(linkAr);
    }
    linkAr.setAttribute('href', url);

    let linkEn: HTMLLinkElement | null = this.doc.querySelector("link[hreflang='en']");
    if (!linkEn) {
      linkEn = this.doc.createElement('link');
      linkEn.setAttribute('rel', 'alternate');
      linkEn.setAttribute('hreflang', 'en');
      this.doc.head.appendChild(linkEn);
    }
    linkEn.setAttribute('href', url);
  }

  setBreadcrumbSchema(items: BreadcrumbItem[]): void {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': items.map((item, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'name': item.name,
        'item': item.url
      }))
    };
    this.injectJsonLd('breadcrumb-jsonld', schema);
  }

  setPropertySchema(property: any): void {
    if (!property) return;
    const schema = {
      '@context': 'https://schema.org',
      '@type': property.type === 'villa' || property.type === 'house' ? 'SingleFamilyResidence' : 'Apartment',
      'name': property.title,
      'description': property.description,
      'url': `https://aqario.app/properties/${property._id}`,
      'image': property.images?.[0] || 'https://aqario.app/assets/images/logo.png',
      'address': {
        '@type': 'PostalAddress',
        'addressLocality': property.city || 'Upper Egypt',
        'addressRegion': 'Upper Egypt',
        'addressCountry': 'EG'
      },
      'offers': {
        '@type': 'Offer',
        'price': property.price,
        'priceCurrency': 'EGP',
        'availability': property.availabilityStatus === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        'url': `https://aqario.app/properties/${property._id}`
      }
    };
    this.injectJsonLd('property-jsonld', schema);
  }

  private injectJsonLd(id: string, schema: any): void {
    let script: HTMLScriptElement | null = this.doc.getElementById(id) as HTMLScriptElement;
    if (!script) {
      script = this.doc.createElement('script');
      script.id = id;
      script.setAttribute('type', 'application/ld+json');
      this.doc.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);
  }
}
