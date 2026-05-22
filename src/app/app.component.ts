import { Component, HostListener, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { ModalEscapeService } from './core/services/modal-escape.service';
import { ThemeService } from './core/services/theme.service';
import { filter } from 'rxjs/operators';


@Component({
  selector: 'app-root',
  template: `
    <div [class.admin-mode]="isAdminRoute">
      <app-cursor></app-cursor>
      
      <app-nav></app-nav>
      
      <router-outlet></router-outlet>
      
      <app-footer *ngIf="!isHideFooter"></app-footer>
      
      <app-notification></app-notification>
      <app-auth-modal></app-auth-modal>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .admin-mode app-footer {
      display: block;
      margin-left: 280px; /* Width of admin sidebar */
    }
  `]
})
export class AppComponent {
  title = 'luxe-estates';
  isAdminRoute = false;
  isHideFooter = false;

  private auth = inject(AuthService);
  private modalEscapeService = inject(ModalEscapeService);
  private router = inject(Router);
  private themeService = inject(ThemeService);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url: string = event.urlAfterRedirects;

      // Admin sidebar layout toggle
      this.isAdminRoute = url.includes('/admin');

      // Hide footer on dashboard, account, admin, and checkout pages
      this.isHideFooter = url.includes('/dashboard') || 
                         url.includes('/account') || 
                         url.includes('/admin') ||
                         url.includes('/profile') ||
                         url.includes('/checkout');

      // The previous Route-Locked Dark Mode has been removed at the user's request.
      // Dashboard and account pages will now respect the global theme preference.
      this.themeService.unlockRoute();
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.modalEscapeService.trigger();
  }
}