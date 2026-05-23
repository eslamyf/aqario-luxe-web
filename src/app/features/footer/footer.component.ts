// ============================================================
// LUXE ESTATES — Footer Component
// Based on reference design: Template/index.html <footer>
// Coding rules: §1, §2.2 (2fr 1fr 1fr 1fr grid), §3.2 buttons,
//               §5.1 SCSS imports, §5.7 RTL logical props
// ============================================================

import { Component } from '@angular/core';

interface FooterLink {
  labelKey: string;
  href: string;
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
        { labelKey: 'FOOTER.SECTIONS.FOR_SALE',          href: '#' },
        { labelKey: 'FOOTER.SECTIONS.FOR_RENT',          href: '#' },
        { labelKey: 'FOOTER.SECTIONS.VILLAS',            href: '#' },
        { labelKey: 'FOOTER.SECTIONS.NEW_DEVELOPMENTS',  href: '#' },
        { labelKey: 'FOOTER.SECTIONS.COMMERCIAL',        href: '#' },
        { labelKey: 'FOOTER.SECTIONS.OFF_PLAN',          href: '#' },
      ],
    },
    {
      titleKey: 'FOOTER.SECTIONS.COMPANY',
      links: [
        { labelKey: 'FOOTER.SECTIONS.ABOUT_US',  href: '#' },
        { labelKey: 'FOOTER.SECTIONS.OUR_TEAM',  href: '#' },
        { labelKey: 'FOOTER.SECTIONS.CAREERS',   href: '#' },
        { labelKey: 'FOOTER.SECTIONS.PRESS',     href: '#' },
        { labelKey: 'FOOTER.SECTIONS.PARTNERS',  href: '#' },
        { labelKey: 'FOOTER.SECTIONS.CONTACT',   href: '#' },
      ],
    },
    {
      titleKey: 'FOOTER.SECTIONS.LEGAL',
      links: [
        { labelKey: 'FOOTER.SECTIONS.PRIVACY',    href: '#' },
        { labelKey: 'FOOTER.SECTIONS.TERMS',      href: '#' },
        { labelKey: 'FOOTER.SECTIONS.COOKIE',     href: '#' },
        { labelKey: 'FOOTER.SECTIONS.AML',        href: '#' },
        { labelKey: 'FOOTER.SECTIONS.API',        href: '#' },
      ],
    },
  ];
}
