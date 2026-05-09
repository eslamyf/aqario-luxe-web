import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonModule } from '@angular/common';
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

// ✅ FIX: import standalone component
import { AuthModalComponent } from './core/auth/auth-modal/auth-modal.component';

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
  ],

  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenRefreshInterceptor,
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
  ],

  bootstrap: [AppComponent],
})
export class AppModule { }