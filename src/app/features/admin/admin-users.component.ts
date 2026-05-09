import {
  Component, OnInit, OnDestroy, inject, DestroyRef
} from '@angular/core';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Subject, combineLatest, of } from 'rxjs';
import {
  debounceTime, distinctUntilChanged, switchMap, catchError
} from 'rxjs/operators';

import { AdminService, AdminUser, PaginatedUsers, UserFilters, AVAILABLE_PERMISSIONS, Permission } from './admin.service';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss'],
})
export class AdminUsersComponent implements OnInit, OnDestroy {
  private adminService        = inject(AdminService);
  private notificationService = inject(NotificationService);
  private route               = inject(ActivatedRoute);
  private router              = inject(Router);
  private destroyRef          = inject(DestroyRef);
  private destroy$            = new Subject<void>();

  // ── Expose Math for template ──────────────────────────────
  readonly Math = Math;

  // ── Paginated State ───────────────────────────────────────
  users:       AdminUser[] = [];
  isLoading    = false;
  totalUsers   = 0;
  currentPage  = 1;
  totalPages   = 1;
  pageSize     = 20;
  activeUserId: string | null = null;
  permissionsConfig = AVAILABLE_PERMISSIONS;

  // ── Filter Subjects ───────────────────────────────────────
  private searchSubject = new BehaviorSubject<string>('');
  private roleSubject   = new BehaviorSubject<string>('');
  private statusSubject = new BehaviorSubject<string>('');
  private pageSubject   = new BehaviorSubject<number>(1);

  // ── Static options ────────────────────────────────────────
  readonly ROLES = [
    { value: '',       label: 'All Roles'  },
    { value: 'buyer',  label: 'Buyer'      },
    { value: 'owner',  label: 'Owner'      },
    { value: 'agent',  label: 'Agent'      },
    { value: 'admin',  label: 'Admin'      },
  ];

  readonly STATUSES = [
    { value: '',       label: 'All Statuses' },
    { value: 'active', label: 'Active'        },
    { value: 'banned', label: 'Banned'        },
  ];

  ngOnInit(): void {
    // Seed filter subjects from URL query params
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params: Params) => {
        this.searchSubject.next((params['search'] as string) || '');
        this.roleSubject.next((params['role']   as string) || '');
        this.statusSubject.next((params['status'] as string) || '');
        this.pageSubject.next(Number(params['page']) || 1);
      });

    // Reactive pipeline: filters → debounce → API
    combineLatest([
      this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()),
      this.roleSubject.pipe(distinctUntilChanged()),
      this.statusSubject.pipe(distinctUntilChanged()),
      this.pageSubject.pipe(distinctUntilChanged()),
    ])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(([search, role, status, page]) => {
          this.isLoading = true;
          const filters: UserFilters = {
            search: search || undefined,
            role:   role   || undefined,
            status: status || undefined,
            page,
            limit: this.pageSize,
          };
          return this.adminService.getUsers(filters).pipe(
            catchError(() => of<PaginatedUsers>({ users: [], total: 0, page: 1, pages: 1 }))
          );
        })
      )
      .subscribe((result: PaginatedUsers) => {
        this.users      = result.users;
        this.totalUsers = result.total;
        this.currentPage = result.page;
        this.totalPages  = result.pages;
        this.isLoading   = false;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Filter Accessors ──────────────────────────────────────

  get searchValue(): string { return this.searchSubject.getValue(); }
  get roleValue():   string { return this.roleSubject.getValue();   }
  get statusValue(): string { return this.statusSubject.getValue(); }

  onSearch(value: string): void {
    this.searchSubject.next(value);
    this.pageSubject.next(1);
    this.syncUrl();
  }

  onRoleChange(role: string): void {
    this.roleSubject.next(role);
    this.pageSubject.next(1);
    this.syncUrl();
  }

  onStatusChange(status: string): void {
    this.statusSubject.next(status);
    this.pageSubject.next(1);
    this.syncUrl();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.pageSubject.next(page);
    this.syncUrl();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  clearFilters(): void {
    this.searchSubject.next('');
    this.roleSubject.next('');
    this.statusSubject.next('');
    this.pageSubject.next(1);
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  private syncUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: this.searchSubject.getValue() || null,
        role:   this.roleSubject.getValue()   || null,
        status: this.statusSubject.getValue() || null,
        page:   this.pageSubject.getValue() > 1 ? this.pageSubject.getValue() : null,
      },
      queryParamsHandling: 'merge',
    });
  }

  // ── Actions ───────────────────────────────────────────────

  onRoleChange_action(user: AdminUser, role: string): void {
    if (user.role === role) return; // No change
    this.activeUserId = user._id;
    const oldRole = user.role;

    // Optimistic Update
    user.role = role as any;

    this.adminService.updateUserRole(user._id, role).subscribe({
      next: () => {
        this.notificationService.show(`${user.name}'s role updated to ${role}`, 'success');
        this.activeUserId = null;
      },
      error: () => {
        // Rollback
        user.role = oldRole;
        this.activeUserId = null;
      },
    });
  }

  onBanToggle(user: AdminUser): void {
    this.activeUserId = user._id;
    const oldStatus = user.isBanned;

    // Optimistic Update
    user.isBanned = !user.isBanned;

    this.adminService.toggleBanUser(user._id).subscribe({
      next: () => {
        const msg = user.isBanned
          ? `${user.name} has been banned`
          : `${user.name} has been unbanned`;
        this.notificationService.show(msg, user.isBanned ? 'success' : 'info');
        this.activeUserId = null;
      },
      error: () => {
        // Rollback
        user.isBanned = oldStatus;
        this.activeUserId = null;
      },
    });
  }

  onPermissionToggle(user: AdminUser, permission: Permission, event: Event): void {
    const input = event.target as HTMLInputElement;
    const isChecked = input.checked;
    
    // Ensure permissions array exists
    if (!user.permissions) {
      user.permissions = [];
    }
    
    const oldPermissions = [...user.permissions];
    
    // Optimistic Update
    if (isChecked && !user.permissions.includes(permission)) {
      user.permissions.push(permission);
    } else if (!isChecked && user.permissions.includes(permission)) {
      user.permissions = user.permissions.filter(p => p !== permission);
    }
    
    const permissionsToSend = Array.isArray(user.permissions) ? user.permissions : [];
    
    this.adminService.updateUserPermissions(user._id, permissionsToSend).subscribe({
      next: () => {
        this.notificationService.show('Permissions updated successfully', 'success');
      },
      error: () => {
        // Rollback on error
        user.permissions = oldPermissions;
        // Revert the UI checkbox
        input.checked = !isChecked;
      }
    });
  }
  
  onHardCancel(user: AdminUser, data: { reason: string; archiveListings: boolean }): void {
    if (!user.activeSubscription) return;
    
    this.activeUserId = user._id;
    
    this.adminService.hardCancelSubscription(user.activeSubscription, {
      reason: data.reason,
      forceDeactivateListings: data.archiveListings
    }).subscribe({
      next: (res) => {
        user.subscriptionStatus = 'none';
        user.activeSubscription = null;
        
        let msg = `Subscription for ${user.name} has been revoked.`;
        if (res.listingsArchived > 0) {
          msg += ` ${res.listingsArchived} listings were archived.`;
        }
        
        this.notificationService.show(msg, 'success');
        this.activeUserId = null;
      },
      error: () => {
        this.activeUserId = null;
      }
    });
  }

  private refresh(): void {
    const p = this.pageSubject.getValue();
    this.pageSubject.next(0);
    setTimeout(() => this.pageSubject.next(p), 50);
  }

  // ── Template Helpers ──────────────────────────────────────

  get hasActiveFilters(): boolean {
    return !!(
      this.searchSubject.getValue() ||
      this.roleSubject.getValue()   ||
      this.statusSubject.getValue()
    );
  }

  getVisiblePages(): number[] {
    const current = this.currentPage;
    const total   = this.totalPages;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const range = new Set<number>();
    [1, 2, current - 1, current, current + 1, total - 1, total]
      .filter(n => n >= 1 && n <= total)
      .forEach(n => range.add(n));
    return Array.from(range).sort((a, b) => a - b);
  }

  isEllipsis(pages: number[], idx: number): boolean {
    if (idx === 0) return false;
    return pages[idx] - pages[idx - 1] > 1;
  }

  getUserInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getAvatarColor(name: string): string {
    const colors = ['#6366f1', '#c9a96e', '#22d3ee', '#4ade80', '#f87171', '#a78bfa', '#fb923c'];
    return colors[name.charCodeAt(0) % colors.length];
  }

  kycLabel(status: string): string {
    return (status || 'not submitted').replace(/_/g, ' ');
  }

  trackById(_: number, user: AdminUser): string { return user._id; }

  // ── Pagination Helpers ──────────────────────────────────────

  get showingStart(): number {
    if (this.totalUsers === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get showingEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalUsers);
  }
}
