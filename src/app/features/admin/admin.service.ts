import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../shared/services/notification.service';

// ── Domain Models ──────────────────────────────────────────────

export interface AdminStats {
  users: number;
  properties: number;
  bookings: number;
  revenue: number;
}

export interface ActivityFeedItem {
  type: string;
  message: string;
  entityId: string;
  createdAt: string;
  colorCode: string;
}

export interface RevenueReportItem {
  _id: { year: number; month?: number };
  totalRevenue: number;
  count: number;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'buyer' | 'owner' | 'agent' | 'admin';
  isBanned: boolean;
  isVerified: boolean;
  kycStatus: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  permissions?: string[];
  createdAt: string;
  photo: string | null;
  activeSubscription?: string | null;
  subscriptionStatus?: string;
}

export type AuditAction =
  | 'APPROVE_PROPERTY' | 'REJECT_PROPERTY'
  | 'APPROVE_BOOKING'  | 'REJECT_BOOKING' | 'BULK_UPDATE_BOOKINGS'
  | 'BAN_USER' | 'UNBAN_USER' | 'CHANGE_ROLE' | 'UPDATE_PERMISSIONS'
  | 'APPROVE_KYC' | 'REJECT_KYC' | 'REVERT_KYC' | 'RESET_KYC'
  | 'DELETE_REVIEW' | 'APPROVE_AUCTION';

export interface AuditLog {
  _id: string;
  actor: { _id: string; name: string; email: string; role: string; photo?: string };
  action: AuditAction;
  targetType: 'Property' | 'Booking' | 'User' | 'Review' | 'Auction';
  targetId: string;
  changes: { before?: any; after?: any };
  metadata: { ip?: string; userAgent?: string; reason?: string };
  createdAt: string;
}

export interface PaginatedAuditLogs {
  logs: AuditLog[];
  total: number;
  page: number;
  pages: number;
}

export const AVAILABLE_PERMISSIONS = [
  'approve_property', 'reject_property',
  'approve_booking',  'reject_booking',
  'ban_user',         'change_role',      'update_permissions',
  'approve_kyc',      'reject_kyc',
  'delete_review',    'view_audit_logs',
  'manage_auctions',  'export_data',      'bulk_actions',
] as const;

export type Permission = typeof AVAILABLE_PERMISSIONS[number];

export interface PaginatedUsers {
  users: AdminUser[];
  total: number;
  page: number;
  pages: number;
}

export interface KycDocument {
  type: string;
  frontImage: string;
  backImage?: string;
  uploadedAt: string;
  _id?: string;
}

export interface KycSubmission {
  _id: string;
  name: string;
  email: string;
  kycStatus: string;
  kycDocuments: KycDocument[];
  ownershipDocuments?: { 
    fileUrl?: string; 
    imageUrl?: string; 
    fileName?: string; 
    fileType?: 'image' | 'pdf' | 'doc'; 
    uploadedAt: string 
  }[];
  kycSubmittedAt: string;
  kycApprovedAt?: string;
  createdAt?: string;
  kycRejectionReason?: string;
  kycAttempts: number;
  kycVersion?: number;
}

export interface PaginatedKyc {
  users: KycSubmission[];
  total: number;
  page: number;
  pages: number;
}

export interface UserFilters {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// ── Internal API shape ─────────────────────────────────────────

interface ApiResponse<T> {
  status?: string;
  success?: boolean;
  data: T;
  message?: string;
}

// ── Service ────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private readonly base = environment.apiUrl;

  // ── Error Handler ──────────────────────────────────────────

  private handleError(defaultMessage: string) {
    return (err: any) => {
      const raw = err.error?.message || defaultMessage;
      // Surface conflict-of-interest errors with a clear prefix
      const message = err.error?.code === 'CONFLICT_OF_INTEREST'
        ? `⚠️ Conflict of Interest: ${raw}`
        : raw;
      this.notificationService.show(message, 'error');
      return throwError(() => err);
    };
  }


  private unwrapList<T>(key: string) {
    return (res: ApiResponse<T[] | Record<string, T[]>>) => {
      if (Array.isArray(res.data)) return res.data;
      const data = res.data as Record<string, T[]>;
      const value = data?.[key];
      return Array.isArray(value) ? value : [];
    };
  }

  // ── Dashboard Overview ─────────────────────────────────────

  getStats(): Observable<AdminStats> {
    return this.http
      .get<ApiResponse<{
        totalUsers?: number;
        totalProperties?: number;
        totalBookings?: number;
        totalRevenue?: number;
      }>>(`${this.base}/dashboard/admin/stats`)
      .pipe(
        map((res) => ({
          users:      res.data?.totalUsers     ?? 0,
          properties: res.data?.totalProperties ?? 0,
          bookings:   res.data?.totalBookings   ?? 0,
          revenue:    res.data?.totalRevenue    ?? 0,
        })),
        catchError(this.handleError('Failed to load dashboard stats'))
      );
  }

  getRecentTransactions(): Observable<any[]> {
    return this.http.get<ApiResponse<any[] | { payments: any[] }>>(`${this.base}/dashboard/admin/payments?limit=5`).pipe(
      map(this.unwrapList<any>('payments')),
      catchError(this.handleError('Failed to load recent transactions'))
    );
  }

  getSystemActivity(): Observable<ActivityFeedItem[]> {
    return this.http.get<ApiResponse<{ activities: ActivityFeedItem[] }>>(`${this.base}/dashboard/admin/activity?limit=5`).pipe(
      map((res) => res.data?.activities || []),
      catchError(this.handleError('Failed to load system activity'))
    );
  }

  getRevenueAnalytics(period: 'monthly' | 'yearly' = 'monthly'): Observable<RevenueReportItem[]> {
    return this.http.get<ApiResponse<{ report: RevenueReportItem[] }>>(`${this.base}/dashboard/admin/reports/revenue?period=${period}`).pipe(
      map((res) => res.data?.report || []),
      catchError(this.handleError('Failed to load revenue analytics'))
    );
  }

  // ── Users Management ───────────────────────────────────────

  getUsers(filters: UserFilters = {}): Observable<PaginatedUsers> {
    // Build params — remove empty/null keys
    const params: Record<string, any> = { limit: 20, ...filters };
    Object.keys(params).forEach(k => {
      if (params[k] === '' || params[k] === null || params[k] === undefined) {
        delete params[k];
      }
    });

    return this.http.get<any>(`${this.base}/dashboard/admin/users`, { params }).pipe(
      map((res) => ({
        users: res.data?.users || [],
        total: res.total        || 0,
        page:  res.page         || 1,
        pages: res.pages        || 1,
      })),
      catchError(this.handleError('Failed to load users'))
    );
  }

  updateUserRole(userId: string, role: string): Observable<AdminUser> {
    return this.http.patch<ApiResponse<{ user: AdminUser }>>(`${this.base}/dashboard/admin/users/${userId}/role`, { role }).pipe(
      map((res) => res.data?.user),
      catchError(this.handleError('Failed to update role'))
    );
  }

  toggleBanUser(userId: string): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.base}/dashboard/admin/users/${userId}/ban`, {}).pipe(
      map(res => res.data),
      catchError(this.handleError('Failed to toggle user ban status'))
    );
  }

  updateUserPermissions(userId: string, permissions: string[]): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.base}/dashboard/admin/users/${userId}/permissions`, { permissions }).pipe(
      map(res => res.data),
      catchError(this.handleError('Failed to update permissions'))
    );
  }

  // ── Audit Logs ─────────────────────────────────────────────

  getAuditLogs(filters: any = {}): Observable<PaginatedAuditLogs> {
    const params: Record<string, any> = { limit: 20, ...filters };
    Object.keys(params).forEach(k => {
      if (params[k] === '' || params[k] === null || params[k] === undefined) delete params[k];
    });
    return this.http.get<any>(`${this.base}/dashboard/admin/audit-logs`, { params }).pipe(
      map((res) => ({
        logs:  res.data?.logs || [],
        total: res.total      || 0,
        page:  res.page       || 1,
        pages: res.pages      || 1,
      })),
      catchError(this.handleError('Failed to load audit logs'))
    );
  }

  // ── KYC Management ──────────────────────────────────────────

  getKYCSummary(): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.base}/kyc/summary`).pipe(
      map(res => res.data),
      catchError(this.handleError('Failed to load KYC summary'))
    );
  }

  getKYCList(filters: any = {}): Observable<PaginatedKyc> {
    const params: Record<string, any> = { limit: 15, ...filters };
    // Clean empty values
    Object.keys(params).forEach(k => {
      if (params[k] === '' || params[k] === null || params[k] === undefined || params[k] === 'all') {
        delete params[k];
      }
    });

    return this.http.get<any>(`${this.base}/kyc/list`, { params }).pipe(
      map((res) => ({
        users: res.data?.users || [],
        total: res.total || 0,
        page: res.page || 1,
        pages: res.pages || 1,
      })),
      catchError(this.handleError('Failed to load KYC list'))
    );
  }

  approveKYC(userId: string): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.base}/kyc/${userId}/approve`, {}).pipe(
      map(res => res.data),
      catchError(this.handleError('Failed to approve KYC'))
    );
  }

  rejectKYC(userId: string, reason: string): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.base}/kyc/${userId}/reject`, { reason }).pipe(
      map(res => res.data),
      catchError(this.handleError('Failed to reject KYC'))
    );
  }

  revertToPendingKYC(userId: string): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.base}/kyc/${userId}/revert`, {}).pipe(
      map(res => res.data),
      catchError(this.handleError('Failed to revert KYC status'))
    );
  }

  // ── Properties Management ──────────────────────────────────

  getProperties(filters: any = {}): Observable<any> {
    const params: Record<string, any> = { limit: 12, ...filters };
    // Clean empty values
    Object.keys(params).forEach(k => {
      if (params[k] === '' || params[k] === null || params[k] === undefined || params[k] === 'all') {
        delete params[k];
      }
    });

    return this.http.get<any>(`${this.base}/dashboard/admin/properties`, { params }).pipe(
      map((res) => ({
        properties: res.data?.properties || [],
        total: res.total || 0,
        page: res.page || 1,
        pages: res.pages || 1,
      })),
      catchError(this.handleError('Failed to load properties'))
    );
  }

  updatePropertyApproval(propertyId: string, decision: 'approve' | 'reject'): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.base}/dashboard/admin/properties/${propertyId}/${decision}`, {}).pipe(
      map((res) => res.data),
      catchError(this.handleError('Failed to update property approval'))
    );
  }

  // ── Bookings Management ────────────────────────────────────

  getBookings(filters: any = {}): Observable<any> {
    const params: Record<string, any> = { limit: 15, ...filters };
    // Clean empty values
    Object.keys(params).forEach(k => {
      if (params[k] === '' || params[k] === null || params[k] === undefined || params[k] === 'all') {
        delete params[k];
      }
    });

    return this.http.get<any>(`${this.base}/dashboard/admin/bookings`, { params }).pipe(
      map((res) => ({
        bookings: res.data?.bookings || [],
        total: res.total || 0,
        page: res.page || 1,
        pages: res.pages || 1,
      })),
      catchError(this.handleError('Failed to load bookings'))
    );
  }

  updateBookingStatus(bookingId: string, status: string): Observable<any> {
    const action = status === 'approved' ? 'approve' : 'reject';
    return this.http.patch<ApiResponse<any>>(`${this.base}/bookings/${bookingId}/${action}`, {}).pipe(
      map((res) => res.data),
      catchError(this.handleError('Failed to update booking status'))
    );
  }

  bulkUpdateBookings(bookingIds: string[], status: string): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.base}/bookings/admin/bulk-status`, { bookingIds, status }).pipe(
      map((res) => res.data),
      catchError(this.handleError('Failed to perform bulk update'))
    );
  }

  exportBookings(filters: any = {}): void {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(k => {
      if (filters[k] && filters[k] !== 'all') params.append(k, filters[k]);
    });
    
    // Direct window open or hidden link for download
    window.open(`${this.base}/bookings/admin/export?${params.toString()}`, '_blank');
  }

  // ── Subscriptions Management ──────────────────────────────

  hardCancelSubscription(subscriptionId: string, data: { reason: string; forceDeactivateListings: boolean }): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.base}/subscriptions/admin/${subscriptionId}/hard-cancel`, data).pipe(
      map(res => res.data),
      catchError(this.handleError('Failed to hard cancel subscription'))
    );
  }
}
