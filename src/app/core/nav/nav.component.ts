import { Component, HostListener } from '@angular/core';
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
export class NavComponent {
  isScrolled = false;
  showDropdown = false; // User dropdown
  showNotifications = false; // Notifications dropdown

  get theme$() {
    return this.themeService.theme$;
  }

  get lang$() {
    return this.languageService.lang$;
  }

  // Inject services via constructor
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

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.isScrolled = window.scrollY > 50;
  }

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Select the wrapper elements
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
    event.stopPropagation(); // Prevent document:click from closing it immediately
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) this.showNotifications = false;
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation(); // Prevent document:click from closing it immediately
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) this.showDropdown = false;
  }

  markAsRead(id: string): void {
    this.notificationsApi.markAsRead(id).subscribe();
  }

  markAllAsRead(): void {
    this.notificationsApi.markAllAsRead().subscribe();
    this.showNotifications = false;
  }

  // Logout and reset state
  onLogout(): void {
    this.auth.logout();
    this.showDropdown = false;
    this.showNotifications = false;
    this.router.navigate(['/']);
  }

  // Intelligent function to control "List Property" button based on roles
  navigateToAddProperty(): void {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      // If no user is logged in, open the login modal
      this.auth.openModal();
    } else if (currentUser.role === 'owner' || currentUser.role === 'agent' || currentUser.role === 'admin') {
      // Condition A: If owner/agent/admin, redirect to "Add Property" page in the dashboard
      this.router.navigate(['/dashboard/properties'], { queryParams: { view: 'form' } });
    } else {
      // Condition B: Standard user / not owner -> redirect immediately to KYC page
      this.router.navigate(['/kyc']);
    }
  }

  // Open registration modal
  openLogin(): void {
    this.auth.openModal();
  }

  // ✅ 3. Mobile Menu Logic
  isMobileMenuOpen = false;

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleLanguage(): void {
    this.languageService.toggleLanguage();
  }
}