import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ChangeDetectorRef,
  NgZone,
  inject,
} from '@angular/core';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import { interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';
import { SearchPayload } from './search-bar/search-bar.component';
import { AuthService } from '../../core/auth/auth.service';
import { QuickPropertyService } from '../../core/services/quick-property.service';

// ─── Shared easing curve (mirrors var(--transition) from _variables.scss) ───
const EASE = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

// ─── Factory: reusable fadeInUp trigger with baked-in delay ─────────────────
function fadeInUp(triggerName: string, delayMs: number) {
  return trigger(triggerName, [
    state('hidden', style({ opacity: 0, transform: 'translateY(40px)' })),
    state('visible', style({ opacity: 1, transform: 'translateY(0)' })),
    transition(
      'hidden => visible',
      animate(`800ms ${delayMs}ms ${EASE}`)
    ),
  ]);
}

@Component({
  selector: 'app-hero',
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.scss'],
  animations: [
    fadeInUp('eyebrow', 100),
    fadeInUp('headline1', 200),
    fadeInUp('subText', 300),
    fadeInUp('buttons', 400),
    fadeInUp('heroImage', 500),
  ],
})
export class HeroComponent implements OnInit, OnDestroy, AfterViewInit {
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private auth = inject(AuthService);
  private quickPropService = inject(QuickPropertyService);

  animState: 'hidden' | 'visible' = 'visible';

  private destroy$ = new Subject<void>();

  tickerItems = [
    { key: 'DUBAI_MARINA', label: 'DUBAI MARINA', change: 12.4, positive: true },
    { key: 'MANHATTAN_PENTHOUSE', label: 'MANHATTAN PENTHOUSE', change: 8.2, positive: true },
    { key: 'LONDON_MAYFAIR', label: 'LONDON MAYFAIR', change: 2.1, positive: false },
    { key: 'PALM_JUMEIRAH', label: 'PALM JUMEIRAH', change: 15.7, positive: true },
    { key: 'PARIS_8EME', label: 'PARIS 8ÈME', change: 5.3, positive: true },
    { key: 'HONG_KONG_PEAK', label: 'HONG KONG PEAK', change: 1.8, positive: false },
    { key: 'MONACO_WATERFRONT', label: 'MONACO WATERFRONT', change: 9.1, positive: true },
    { key: 'MILAN_CENTRO', label: 'MILAN CENTRO', change: 3.4, positive: true },
    { key: 'TOKYO_ROPPONGI', label: 'TOKYO ROPPONGI', change: 0.7, positive: false },
    { key: 'SYDNEY_HARBOUR', label: 'SYDNEY HARBOUR', change: 6.9, positive: true },
  ];

  get allTickerItems() {
    return [...this.tickerItems, ...this.tickerItems];
  }

  ngOnInit(): void { }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() =>
        this.ngZone.run(() => {
          this.animState = 'visible';
          this.cdr.detectChanges();
        }),
        50);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onExplore(payload: SearchPayload): void {
    const queryParams: any = {};
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        queryParams[key] = value;
      }
    });
    this.router.navigate(['/properties'], { queryParams });
  }

  scrollToProperties(): void {
    const el = document.getElementById('properties');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      this.router.navigate(['/properties']);
    }
  }

  navigateToAddProperty(): void {
    this.quickPropService.openModal();
  }

  /** Graceful fallback if the Unsplash image fails to load */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none'; // CSS fallback gradient shows through
  }
}
