import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// ✅ استدعاء كومبوننت الترقية الجديد
import { BecomeAgentComponent } from './features/become-agent/become-agent.component';

import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';


const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/hero/hero.module').then((m) => m.HeroModule),
  },
  {
    path: 'properties',
    loadChildren: () =>
      import('./features/properties/properties.module').then(
        (m) => m.PropertiesModule
      ),
  },
  {
    path: 'auctions',
    loadChildren: () =>
      import('./features/auctions/auctions.module').then(
        (m) => m.AuctionsModule
      ),
  },
  {
    path: 'agents',
    loadChildren: () =>
      import('./features/agents/agents.module').then((m) => m.AgentsModule),
  },
  
  {
    path: 'become-agent',
    component: BecomeAgentComponent,
  },

  {
    path: 'account',
    canActivate: [authGuard],
    loadChildren: () => import('./features/account/account.module').then(m => m.AccountModule)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () => import('./features/user dashboard/user-dashboard.module').then(m => m.UserDashboardModule)
  },

  {
    path: 'profile',
    redirectTo: 'dashboard/profile',
    pathMatch: 'full'
  },

  // ── Payment Routes ────────────────────────────────────────────────────────
  {
    path: 'checkout/:bookingId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/payments/checkout.component').then(m => m.CheckoutComponent)
  },
  {
    path: 'payment/success',
    canActivate: [authGuard],
    loadComponent: () => import('./features/payments/payment-success.component').then(m => m.PaymentSuccessComponent)
  },
  {
    path: 'payment/failed',
    loadComponent: () => import('./features/payments/payment-failed.component').then(m => m.PaymentFailedComponent)
  },

  // ── Subscription Checkout Route ───────────────────────────────────────────
  {
    path: 'subscribe',
    canActivate: [authGuard],
    loadComponent: () => import('./features/subscriptions/subscription-checkout.component').then(m => m.SubscriptionCheckoutComponent)
  },

  // مسار إعادة تعيين كلمة المرور
  {
    path: 'reset-password/:token',
    loadComponent: () => import('./core/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  
  // مسار تأكيد الحساب (OTP)
  {
    path: 'verify-otp',
    loadComponent: () => import('./core/auth/otp-verify/otp-verify.component').then(m => m.OtpVerifyComponent)
  },

  // مسار الـ KYC
  {
    path: 'kyc',
    canActivate: [authGuard],
    loadComponent: () => import('./features/kyc/kyc.component').then(m => m.KycComponent)
  },

  // مسار الـ Admin
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule)
  },

  // مسار الـ Wildcard لاصطياد أي روابط خاطئة (يجب أن يظل في النهاية دائمًا)
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
 
@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'top',
      anchorScrolling: 'enabled',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}