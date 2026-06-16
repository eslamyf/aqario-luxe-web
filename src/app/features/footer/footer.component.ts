// ============================================================
// LUXE ESTATES — Footer Component
// Based on reference design: Template/index.html <footer>
// Coding rules: §1, §2.2 (2fr 1fr 1fr 1fr grid), §3.2 buttons,
//               §5.1 SCSS imports, §5.7 RTL logical props
// ============================================================

import { Component } from '@angular/core';

interface FooterLink {
  labelKey: string;
  routerLink?: string;
  queryParams?: any;
  href?: string;
}

interface FooterColumn {
  titleKey: string;
  links: FooterLink[];
}

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent {

  readonly currentYear = new Date().getFullYear();

  // ── Social Icons ─────────────────────────────────────────
  // Text placeholders per task spec — no SVG dependency needed
  readonly socialLinks = [
    { label: '𝕏',  href: '#', ariaLabel: 'X (Twitter)' },
    { label: 'IG', href: '#', ariaLabel: 'Instagram'    },
    { label: 'IN', href: '#', ariaLabel: 'LinkedIn'     },
    { label: 'YT', href: '#', ariaLabel: 'YouTube'      },
  ];

  // ── Navigation Columns (template lines 1772–1803) ────────
  readonly columns: FooterColumn[] = [
    {
      titleKey: 'FOOTER.SECTIONS.PROPERTIES',
      links: [
        { labelKey: 'FOOTER.SECTIONS.FOR_SALE',          routerLink: '/properties', queryParams: { listingType: 'sale' } },
        { labelKey: 'FOOTER.SECTIONS.FOR_RENT',          routerLink: '/properties', queryParams: { listingType: 'rent' } },
        { labelKey: 'FOOTER.SECTIONS.VILLAS',            routerLink: '/properties', queryParams: { type: 'villa' } },
        { labelKey: 'FOOTER.SECTIONS.NEW_DEVELOPMENTS',  routerLink: '/properties' },
        { labelKey: 'FOOTER.SECTIONS.COMMERCIAL',        routerLink: '/properties', queryParams: { type: 'commercial' } },
        { labelKey: 'FOOTER.SECTIONS.OFF_PLAN',          routerLink: '/properties' },
      ],
    },
    {
      titleKey: 'FOOTER.SECTIONS.COMPANY',
      links: [
        { labelKey: 'FOOTER.SECTIONS.ABOUT_US',  routerLink: '/about' },
        { labelKey: 'FOOTER.SECTIONS.OUR_TEAM',  routerLink: '/agents' },
        { labelKey: 'NAV.FAVOURITES',            routerLink: '/dashboard/saved' },
        { labelKey: 'FOOTER.SECTIONS.CAREERS',   routerLink: '/careers' },
        { labelKey: 'FOOTER.SECTIONS.PRESS',     routerLink: '/press' },
        { labelKey: 'FOOTER.SECTIONS.PARTNERS',  routerLink: '/partners' },
        { labelKey: 'FOOTER.SECTIONS.CONTACT',   routerLink: '/contact' },
      ],
    },
    {
      titleKey: 'FOOTER.SECTIONS.LEGAL',
      links: [
        { labelKey: 'FOOTER.SECTIONS.PRIVACY',    routerLink: '/privacy' },
        { labelKey: 'FOOTER.SECTIONS.TERMS',      routerLink: '/terms' },
        { labelKey: 'FOOTER.SECTIONS.COOKIE',     routerLink: '/cookie' },
        { labelKey: 'FOOTER.SECTIONS.AML',        routerLink: '/aml' },
        { labelKey: 'FOOTER.SECTIONS.API',        routerLink: '/api' },
      ],
    },
  ];
}
