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
  readonly socialLinks = [
    { icon: 'fa-brands fa-x-twitter',  href: '#', ariaLabel: 'X (Twitter)' },
    { icon: 'fa-brands fa-instagram',  href: '#', ariaLabel: 'Instagram'    },
    { icon: 'fa-brands fa-linkedin-in', href: '#', ariaLabel: 'LinkedIn'     },
    { icon: 'fa-brands fa-youtube',     href: '#', ariaLabel: 'YouTube'      },
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
        { labelKey: 'FOOTER.SECTIONS.CONTACT',   routerLink: '/contact' },
      ],
    },
  ];
}
