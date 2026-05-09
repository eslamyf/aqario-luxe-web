import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../services/theme.service';
import { NotificationsApiService } from '../services/notifications-api.service';

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

  // إسلام: حقن الخدمات باستخدام constructor
  constructor(
    public auth: AuthService,
    private router: Router,
    private themeService: ThemeService,
    public notificationsApi: NotificationsApiService
  ) {}

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.isScrolled = window.scrollY > 50;
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) this.showNotifications = false;
  }

  toggleNotifications(): void {
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

  // إسلام: تسجيل الخروج وتصفير الحالة
  onLogout(): void {
    this.auth.logout();
    this.showDropdown = false;
    this.showNotifications = false;
    this.router.navigate(['/']);
  }

  // إسلام: دالة ذكية للتحكم في زر إضافة العقار بناءً على الصلاحيات
  onListPropertyClick(): void {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      // لو مفيش يوزر مسجل دخول، افتح مودال اللوجين
      this.auth.openModal();
    } else if (currentUser.role === 'buyer') {
      // لو مشتري عادي، وجهه لصفحة الترقية
      this.router.navigate(['/become-agent']);
    } else if (currentUser.role === 'owner' || currentUser.role === 'agent') {
      // لو بائع، وجهه لصفحة إضافة العقار
      this.router.navigate(['/add-property']);
    }
  }

  // إسلام: دالة فتح مودال التسجيل
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
}