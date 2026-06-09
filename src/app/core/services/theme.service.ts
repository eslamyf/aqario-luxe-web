import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly THEME_KEY = 'aqario_theme';

  // Extract initialization to a static helper to use synchronously
  private getInitialTheme(): ThemeMode {
    if (typeof window !== 'undefined' && window.localStorage) {
      const currentAttr = document.documentElement.getAttribute('data-theme') as ThemeMode;
      const savedTheme = localStorage.getItem(this.THEME_KEY) as ThemeMode;
      // Priority: DOM attr set by inline script → localStorage → 'dark' default
      return currentAttr || savedTheme || 'dark';
    }
    return 'dark';
  }

  // Initialize synchronously to prevent FOUC
  private readonly _theme$ = new BehaviorSubject<ThemeMode>(this.getInitialTheme());
  private _routeLock: ThemeMode | null = null;

  readonly theme$ = this._theme$.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.initializeTheme();
  }

  /**
   * Sync theme with localStorage or system preference on load
   */
  private initializeTheme(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // 1. Check if index.html already set a theme on the <html> tag
    const currentAttr = document.documentElement.getAttribute('data-theme') as ThemeMode;
    
    // 2. Check localStorage
    const savedTheme = localStorage.getItem(this.THEME_KEY) as ThemeMode;
    
    // 3. Determine initial theme (Attribute from index.html takes priority as it runs first)
    const initialTheme: ThemeMode = currentAttr || savedTheme || 'dark';
    
    this._theme$.next(initialTheme);
    this._applyTheme(initialTheme);
  }

  getTheme(): ThemeMode {
    return this._theme$.value;
  }

  setTheme(theme: ThemeMode): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this._theme$.next(theme);
    localStorage.setItem(this.THEME_KEY, theme);
    this._applyTheme(theme);
  }

  toggleTheme(): void {
    this.setTheme(this._theme$.value === 'dark' ? 'light' : 'dark');
  }

  /**
   * Locks the theme for a specific route (e.g. landing page)
   */
  lockRoute(theme: ThemeMode): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this._routeLock = theme;
    document.documentElement.setAttribute('data-theme', theme);
  }

  unlockRoute(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this._routeLock = null;
    this._applyTheme(this._theme$.value);
  }

  private _applyTheme(theme: ThemeMode): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this._routeLock) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }
}
