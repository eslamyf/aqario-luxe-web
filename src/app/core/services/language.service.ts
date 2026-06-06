import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

export type LanguageMode = 'en' | 'ar';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly LANG_KEY = 'aqario_lang';
  private readonly _lang$ = new BehaviorSubject<LanguageMode>('en');

  readonly lang$ = this._lang$.asObservable();

  constructor(
    private translate: TranslateService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeLanguage();
  }

  private initializeLanguage(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const savedLang = localStorage.getItem(this.LANG_KEY) as LanguageMode;
    const initialLang: LanguageMode = savedLang || 'en';

    this.translate.addLangs(['en', 'ar']);
    this.translate.setDefaultLang('en');
    this.setLanguage(initialLang);
  }

  getLanguage(): LanguageMode {
    return this._lang$.value;
  }

  setLanguage(lang: LanguageMode): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.translate.use(lang);
    this._lang$.next(lang);
    localStorage.setItem(this.LANG_KEY, lang);
    this._applyDirection(lang);
  }

  toggleLanguage(): void {
    this.setLanguage(this._lang$.value === 'en' ? 'ar' : 'en');
  }

  private _applyDirection(lang: LanguageMode): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
    document.body.setAttribute('dir', dir);
  }
}
