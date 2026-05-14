import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserDashboardService } from './user-dashboard.service';
import { AuthService, User } from '../../core/auth/auth.service';
import { DashboardUiService } from '../../shared/services/dashboard-ui.service';

@Component({
  selector: 'app-user-dashboard',
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.scss']
})
export class UserDashboardComponent implements OnInit, OnDestroy {
  user$: Observable<User | null>;
  isLoggingOut = false;
  sidebarOpen = false; // We'll sync this with service
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserDashboardService,
    private authService: AuthService,
    private dashboardUi: DashboardUiService
  ) {
    this.user$ = this.authService.currentUser$;
    
    // Sync sidebar state from service
    this.dashboardUi.sidebarOpen
      .pipe(takeUntil(this.destroy$))
      .subscribe(open => this.sidebarOpen = open);
  }

  toggleSidebar(): void {
    this.dashboardUi.toggleSidebar();
  }

  closeSidebar(): void {
    this.dashboardUi.closeSidebar();
  }

  ngOnInit(): void {
    // Load profile if not already in memory
    if (!this.authService.currentUser) {
      this.userService.getMe().pipe(takeUntil(this.destroy$)).subscribe();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getInitials(user: User | null): string {
    if (!user?.name) return '?';
    return user.name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('');
  }

  getRoleLabel(user: User | null): string {
    const map: Record<string, string> = {
      buyer: 'Buyer',
      owner: 'Owner',
      agent: 'Agent',
      admin: 'Admin',
    };
    return user?.role ? map[user.role] : '';
  }

  // Show "My Properties" nav link for owners and agents only
  canListProperties(user: User | null): boolean {
    return user?.role === 'owner' || user?.role === 'agent';
  }

  get dashboard$(): Observable<any> {
    return this.userService.dashboardData$;
  }

  isSubscriptionExpiring(sub: any): boolean {
    if (!sub || !sub.endDate) return false;
    const end = new Date(sub.endDate).getTime();
    const now = Date.now();
    const daysLeft = (end - now) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 3;
  }

  isSubscriptionExpired(sub: any): boolean {
    if (!sub) return false;
    return sub.status === 'expired' || (sub.endDate && new Date(sub.endDate).getTime() < Date.now());
  }

  // Show "Saved" for ALL roles — owners can also save other properties
  canViewSaved(user: User | null): boolean {
    return !!user;
  }

  logout(): void {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;
    this.userService.logout().subscribe({
      error: () => (this.isLoggingOut = false),
    });
  }
}
