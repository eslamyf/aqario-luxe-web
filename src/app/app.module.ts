import { NgModule, ErrorHandler, Injectable } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { SocialLoginModule, SocialAuthServiceConfig, GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { environment } from '../environments/environment';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FooterModule } from './features/footer/footer.module';
import { NavComponent } from './core/nav/nav.component';
import { CursorComponent } from './shared/cursor/cursor.component';
import { NotificationComponent } from './shared/notification/notification.component';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { TokenRefreshInterceptor } from './core/interceptors/token-refresh.interceptor';
import { KycInterceptor } from './core/interceptors/kyc.interceptor';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, '/assets/i18n/', `.json?v=${Date.now()}`);
}

// ✅ FIX: import standalone component
import { AuthModalComponent } from './core/auth/auth-modal/auth-modal.component';

// Dynamic locale support
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeAr from '@angular/common/locales/ar';
import { TranslateService } from '@ngx-translate/core';

registerLocaleData(localeAr);

export class DynamicLocaleId extends String {
  constructor(private translate: TranslateService) {
    super();
  }
  override toString(): string {
    return this.translate.currentLang || this.translate.defaultLang || 'en';
  }
}

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    const message = error?.message || String(error || '');
    if (
      message.includes('Could not establish connection') ||
      message.includes('Receiving end does not exist')
    ) {
      // Safely ignore browser extension noise
      return;
    }
    console.error(error);
  }
}

@NgModule({
  declarations: [
    AppComponent,
    NavComponent,
    CursorComponent,
    NotificationComponent,
  ],

  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    CommonModule,
    AppRoutingModule,

    // ✅ FIX: standalone component must be in imports
    AuthModalComponent,

    // Footer feature module — exports FooterComponent as <app-footer>
    FooterModule,

    // Task 1.4 — Google Sign-In SDK
    SocialLoginModule,

    // Translation support
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
  ],

  providers: [
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenRefreshInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: KycInterceptor,
      multi: true,
    },
    // Task 1.4 — Google OAuth provider config
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(environment.googleClientId, {
              oneTapEnabled: false, // disable One Tap to avoid cross-origin iframe issues
            }),
          },
        ],
        onError: (err: any) => console.error('[GoogleAuth] Provider error:', err),
      } as SocialAuthServiceConfig,
    },
    // Dynamic LOCALE_ID provider for reactive date/time formatting
    {
      provide: LOCALE_ID,
      useClass: DynamicLocaleId,
      deps: [TranslateService],
    },
  ],

  bootstrap: [AppComponent],
})
export class AppModule { }