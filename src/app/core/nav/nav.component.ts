import { Component, HostListener, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../services/theme.service';
import { NotificationsApiService } from '../services/notifications-api.service';
import { DashboardUiService } from '../../shared/services/dashboard-ui.service';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss'],
})
export class NavComponent implements OnDestroy {
  isScrolled = false;
  showDropdown = false; // User dropdown
  showNotifications = false; // Notifications dropdown
  isMobileMenuOpen = false;

  get theme$() {
    return this.themeService.theme$;
  }

  get lang$() {
    return this.languageService.lang$;
  }

  get currentUrl(): string {
    return this.router.url || '/';
  }

  get isDashboardContext(): boolean {
    const url = this.currentUrl;
    return url.includes('/dashboard') || url.includes('/account') || url.includes('/admin');
  }

  // Dynamic Floating Bottom Navigation Bar Items
  get floatingBottomNavItems() {
    const isDash = this.isDashboardContext;
    const user = this.auth.currentUser;
    const role = user?.role || 'guest';

    if (isDash) {
      const items: Array<{ labelKey: string; icon: string; link: string; exact?: boolean }> = [
        { labelKey: 'DASHBOARD.OVERVIEW', icon: 'fa-solid fa-chart-pie', link: '/dashboard/overview' },
        { labelKey: 'NAV.MY_ACCOUNT', icon: 'fa-solid fa-user-gear', link: '/account' },
        { labelKey: 'DASHBOARD.MY_BOOKINGS', icon: 'fa-solid fa-calendar-days', link: '/dashboard/bookings' },
      ];

      if (user && (role === 'owner' || role === 'agent' || role === 'admin')) {
        items.push({ labelKey: 'DASHBOARD.MY_PROPERTIES', icon: 'fa-solid fa-city', link: '/dashboard/properties' });
        items.push({ labelKey: 'DASHBOARD.INCOMING_REQUESTS', icon: 'fa-solid fa-inbox', link: '/dashboard/owner-bookings' });
        items.push({ labelKey: 'DASHBOARD.VIEWING_SCHEDULE', icon: 'fa-solid fa-calendar-check', link: '/dashboard/owner-viewing-requests' });
      }

      items.push({ labelKey: 'DASHBOARD.PAYMENTS', icon: 'fa-solid fa-wallet', link: '/dashboard/payments' });

      if (user && role === 'admin') {
        items.push({ labelKey: 'DASHBOARD.ADMIN_CENTER', icon: 'fa-solid fa-shield-halved', link: '/admin' });
      }

      items.push({ labelKey: 'NAV.BACK_TO_SITE', icon: 'fa-solid fa-house', link: '/', exact: true });

      return items;
    }

    // Public / Main site mode
    return [
      { labelKey: 'NAV.HOME', icon: 'fa-solid fa-house', link: '/', exact: true },
      { labelKey: 'NAV.PROPERTIES', icon: 'fa-solid fa-building', link: '/properties' },
      { labelKey: 'NAV.AGENTS', icon: 'fa-solid fa-users', link: '/agents' },
      { labelKey: 'NAV.FAVOURITES', icon: 'fa-solid fa-heart', link: '/dashboard/saved' },
      { labelKey: user ? 'NAV.MY_DASHBOARD' : 'NAV.SIGN_IN', icon: 'fa-solid fa-gauge', link: user ? '/dashboard/overview' : '/account' },
    ];
  }

  trackByNav(index: number, item: { link: string }): string {
    return item ? item.link : index.toString();
  }

  constructor(
    public auth: AuthService,
    private router: Router,
    private themeService: ThemeService,
    public notificationsApi: NotificationsApiService,
    public dashboardUi: DashboardUiService,
    private languageService: LanguageService
  ) {}

  toggleDashboardSidebar(): void {
    this.dashboardUi.toggleSidebar();
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  ngOnDestroy(): void {}

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (typeof window === 'undefined') return;
    const scrolled = window.scrollY > 50;
    if (this.isScrolled !== scrolled) {
      this.isScrolled = scrolled;
    }
  }

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent): void {
    if (!this.showDropdown && !this.showNotifications) return;
    
    const target = event.target as HTMLElement;
    const userWrapper = document.querySelector('.user-dropdown-container');
    const notifWrapper = document.querySelector('.notifications-dropdown-container');

    const clickedInsideUser = userWrapper?.contains(target);
    const clickedInsideNotif = notifWrapper?.contains(target);

    if (!clickedInsideUser && !clickedInsideNotif) {
      this.showDropdown = false;
      this.showNotifications = false;
    }
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) this.showNotifications = false;
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) this.showDropdown = false;
  }

  markAsRead(id: string): void {
    this.notificationsApi.markAsRead(id).subscribe();
  }

  onNotificationClick(n: any): void {
    this.notificationsApi.markAsRead(n._id).subscribe();
    this.showNotifications = false;

    let metadata = n.metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch {
        metadata = null;
      }
    }

    let chatId = metadata?.chatId || n.chatId || n.meta?.chatId;
    if (!chatId) {
      const url = n.targetUrl || n.link;
      if (url && url.includes('/dashboard/chat/')) {
        const parts = url.split('/');
        chatId = parts[parts.length - 1];
      }
    }

    if (chatId && chatId !== 'undefined') {
      this.router.navigate(['/dashboard/chat', chatId]);
      return;
    }

    const url = n.targetUrl || n.link;
    if (url && url !== '/') {
      this.router.navigateByUrl(url).catch(() => {
        this.router.navigate(['/dashboard/overview']);
      });
    } else {
      const type = metadata?.type || n.type;
      switch (type) {
        case 'payment':
          this.router.navigate(['/dashboard/payments']);
          break;
        case 'booking':
          const role = this.auth.currentUser?.role;
          if (role === 'owner' || role === 'agent') {
            this.router.navigate(['/dashboard/owner-bookings']);
          } else {
            this.router.navigate(['/dashboard/bookings']);
          }
          break;
        case 'viewing':
          const currentRole = this.auth.currentUser?.role;
          if (currentRole === 'owner' || currentRole === 'agent') {
            this.router.navigate(['/dashboard/owner-viewing-requests']);
          } else {
            this.router.navigate(['/dashboard/viewing-requests']);
          }
          break;
        default:
          this.router.navigate(['/dashboard/overview']);
          break;
      }
    }
  }

  markAllAsRead(): void {
    this.notificationsApi.markAllAsRead().subscribe();
    this.showNotifications = false;
  }

  markAllNotificationsAsRead(): void {
    this.notificationsApi.markAllAsRead().subscribe();
    this.showNotifications = false;
  }

  onLogout(): void {
    this.auth.logout();
    this.showDropdown = false;
    this.showNotifications = false;
    this.router.navigate(['/']);
  }

  navigateToAddProperty(): void {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      this.auth.openModal();
    } else if (currentUser.role === 'owner' || currentUser.role === 'agent' || currentUser.role === 'admin') {
      this.router.navigate(['/dashboard/properties'], { queryParams: { view: 'form' } });
    } else {
      this.router.navigate(['/kyc']);
    }
  }

  openLogin(): void {
    this.auth.openModal();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleLanguage(): void {
    this.languageService.toggleLanguage();
  }
}
