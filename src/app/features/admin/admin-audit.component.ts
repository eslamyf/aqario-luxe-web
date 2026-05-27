import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { AdminService } from './admin.service';

export interface AuditLog {
  _id: string;
  actor: { _id: string; name: string; email: string; role: string; photo?: string };
  action: string;
  targetType: string;
  targetId: string;
  changes: { before?: any; after?: any };
  metadata: { ip?: string; userAgent?: string; reason?: string };
  createdAt: string;
}

@Component({
  selector: 'app-admin-audit',
  templateUrl: './admin-audit.component.html',
  styleUrls: ['./admin-audit.component.scss']
})
export class AdminAuditComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  logs: AuditLog[] = [];
  total = 0;
  page = 1;
  limit = 20;
  pages = 1;
  loading = false;
  error = '';

  expandedLogId: string | null = null;

  // Filter controls
  searchControl = new FormControl('');
  actionFilter = '';
  targetTypeFilter = '';
  dateFrom = '';
  dateTo = '';

  readonly ACTION_TYPES = [
    'APPROVE_PROPERTY', 'REJECT_PROPERTY',
    'APPROVE_BOOKING',  'REJECT_BOOKING', 'BULK_UPDATE_BOOKINGS',
    'BAN_USER', 'UNBAN_USER', 'CHANGE_ROLE', 'UPDATE_PERMISSIONS',
    'APPROVE_KYC', 'REJECT_KYC', 'REVERT_KYC', 'RESET_KYC',
    'DELETE_REVIEW', 'APPROVE_AUCTION'
  ];

  readonly TARGET_TYPES = ['Property', 'Booking', 'User', 'Review', 'Auction'];

  readonly ACTION_COLORS: Record<string, string> = {
    APPROVE_PROPERTY: 'emerald', REJECT_PROPERTY: 'rose',
    APPROVE_BOOKING:  'emerald', REJECT_BOOKING:  'rose', BULK_UPDATE_BOOKINGS: 'amber',
    BAN_USER:         'rose',    UNBAN_USER:       'sky',
    CHANGE_ROLE:      'violet',  UPDATE_PERMISSIONS: 'violet',
    APPROVE_KYC:      'emerald', REJECT_KYC:       'rose',
    REVERT_KYC:       'amber',   RESET_KYC:        'orange',
    DELETE_REVIEW:    'rose',    APPROVE_AUCTION:   'emerald',
  };

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadLogs();

    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.page = 1;
      this.loadLogs();
    });
  }

  loadLogs(): void {
    this.loading = true;
    this.error = '';

    const filters: any = {
      page: this.page,
      limit: this.limit,
    };
    if (this.actionFilter)     filters.action     = this.actionFilter;
    if (this.targetTypeFilter) filters.targetType = this.targetTypeFilter;
    if (this.dateFrom)         filters.dateFrom   = this.dateFrom;
    if (this.dateTo)           filters.dateTo     = this.dateTo;

    this.adminService.getAuditLogs(filters).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res: any) => {
        this.logs  = res.logs || [];
        this.total = res.total || 0;
        this.pages = res.pages || 1;
        this.loading = false;
      },
      error: (err: any) => {
        this.error   = err?.error?.message || 'Failed to load audit logs.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.page = 1;
    this.loadLogs();
  }

  resetFilters(): void {
    this.actionFilter     = '';
    this.targetTypeFilter = '';
    this.dateFrom         = '';
    this.dateTo           = '';
    this.page             = 1;
    this.loadLogs();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.pages) return;
    this.page = p;
    this.loadLogs();
  }

  toggleExpand(id: string): void {
    this.expandedLogId = this.expandedLogId === id ? null : id;
  }

  getActionColor(action: string): string {
    return this.ACTION_COLORS[action] || 'slate';
  }

  getActionLabel(action: string): string {
    return `AUDIT.ACTIONS.${action}`;
  }

  formatChanges(changes: any): string {
    return JSON.stringify(changes, null, 2);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
