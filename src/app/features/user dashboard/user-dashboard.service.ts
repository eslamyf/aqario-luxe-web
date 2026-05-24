import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../shared/services/notification.service';
import { AuthService } from '../../core/auth/auth.service';
import { TranslateService } from '@ngx-translate/core';

// ── Interfaces matched 1:1 with backend user.model.js ─────────────────────────

export type UserRole = 'buyer' | 'owner' | 'agent' | 'admin';
export type KycStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  photo: string;
  bio: string;
  phone: string | null;
  isVerified: boolean;
  isActive: boolean;
  isBanned: boolean;
  kycStatus: KycStatus;
  kycRejectionReason: string | null;
  createdAt: string;
}

// Dashboard data shapes — matched to getMe() controller response
export interface OwnerAgentDashboard {
  role: 'owner' | 'agent';
  // ── Hosting stats ──
  properties: any[];
  totalProperties: number;
  activeListings: number;
  bookingRequests: number;
  upcomingViewings: number;
  // ── Personal consumer data (owner is ALSO a buyer) ──
  savedPropertiesCount: number;
  myBookings: any[];
  personalViewings: any[];
  // ── Subscription ──
  subscription: {
    plan: string;
    status: string;
    listingsUsed: number;
    listingsLimit: number;
    endDate: string;
    paymentVerified: boolean;
  } | null;
  // ── KYC ──
  isVerified: boolean;
  kycStatus: KycStatus;
  kycApproved: boolean;
  kycRejected: boolean;
  kycPending: boolean;
  kycRejectionReason: string | null;
}

export interface BuyerDashboard {
  role: 'buyer';
  savedPropertiesCount: number;
  myBookings: any[];
  viewingRequests: any[];
  isVerified: boolean;
  kycStatus: KycStatus;
  kycApproved: boolean;
  kycRejected: boolean;
  kycPending: boolean;
  kycRejectionReason: string | null;
}

export type DashboardData = OwnerAgentDashboard | BuyerDashboard;

export interface MeResponse {
  user: UserProfile;
  dashboard: DashboardData;
}

interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class UserDashboardService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private notif = inject(NotificationService);
  private authService = inject(AuthService);
  private translate = inject(TranslateService);
  private readonly base = environment.apiUrl;

  private dashboardDataSubject = new BehaviorSubject<DashboardData | null>(null);
  public dashboardData$ = this.dashboardDataSubject.asObservable();

  // ── GET /users/me (Enhanced dashboard data) ─────────────────────────────────
  getMe(): Observable<MeResponse> {
    return this.http.get<ApiResponse<MeResponse>>(`${this.base}/users/me`).pipe(
      tap((res) => {
        this.authService.setCurrentUser(res.data.user as any);
        this.dashboardDataSubject.next(res.data.dashboard);
      }),
      map((res) => res.data),
      catchError(this.handleError('Failed to load profile data'))
    );
  }

  private handleError(key: string) {
    return (err: any) => {
      const keyMap: Record<string, string> = {
        'Failed to load profile data': 'DASHBOARD.ERR_LOAD_PROFILE',
        'Failed to update profile': 'DASHBOARD.ERR_UPDATE_PROFILE',
        'Failed to change password': 'DASHBOARD.ERR_CHANGE_PASSWORD',
        'Failed to load bookings': 'DASHBOARD.ERR_LOAD_BOOKINGS',
        'Failed to cancel booking': 'DASHBOARD.ERR_CANCEL_BOOKING',
        'Failed to load owner booking requests': 'DASHBOARD.ERR_LOAD_OWNER_BOOKINGS',
        'Failed to approve booking': 'DASHBOARD.ERR_APPROVE_BOOKING',
        'Failed to reject booking': 'DASHBOARD.ERR_REJECT_BOOKING',
        'Failed to load booking details': 'DASHBOARD.ERR_LOAD_BOOKING_DETAILS',
        'Failed to load properties': 'DASHBOARD.ERR_LOAD_PROPERTIES',
        'Failed to load saved properties': 'DASHBOARD.ERR_LOAD_SAVED_PROPERTIES',
        'Failed to remove saved property': 'DASHBOARD.ERR_REMOVE_SAVED',
        'Failed to load subscription plans': 'DASHBOARD.ERR_LOAD_PLANS',
        'Failed to subscribe': 'DASHBOARD.ERR_SUBSCRIBE',
        'Failed to cancel subscription': 'DASHBOARD.ERR_CANCEL_SUB',
        'Failed to get payment status': 'DASHBOARD.ERR_PAYMENT_STATUS',
        'Failed to load viewing requests': 'DASHBOARD.ERR_LOAD_VR',
        'Failed to load owner viewing requests': 'DASHBOARD.ERR_LOAD_OWNER_VR',
        'Failed to approve viewing request': 'DASHBOARD.ERR_APPROVE_VR',
        'Failed to reject viewing request': 'DASHBOARD.ERR_REJECT_VR',
        'Failed to cancel viewing request': 'DASHBOARD.ERR_CANCEL_VR',
        'Failed to load payments': 'DASHBOARD.ERR_LOAD_PAYMENTS',
        'Failed to load stats': 'DASHBOARD.ERR_LOAD_STATS'
      };

      const transKey = keyMap[key] || key;
      const message = this.translate.instant(transKey);
      this.notif.show(message, 'error');
      return throwError(() => err);
    };
  }

  // ── PATCH /users/me ────────────────────────────────────────────────────────
  updateMe(payload: FormData | Partial<UserProfile>): Observable<UserProfile> {
    return this.http.patch<ApiResponse<{ user: UserProfile }>>(`${this.base}/users/me`, payload).pipe(
      map((res) => res.data.user),
      tap((user) => this.authService.setCurrentUser(user as any)),
      catchError(this.handleError('Failed to update profile'))
    );
  }

  // ── PATCH /users/change-password ───────────────────────────────────────────
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.base}/users/change-password`, {
      currentPassword,
      newPassword,
    }).pipe(
      catchError(this.handleError('Failed to change password'))
    );
  }

  // ── Bookings ── GET /dashboard/me/bookings ───────────────────────────────
  getMyBookings(): Observable<any[]> {
    return this.http.get<ApiResponse<any>>(`${this.base}/dashboard/me/bookings`).pipe(
      map((res) => {
        if (Array.isArray(res.data)) return res.data;
        return res.data?.bookings ?? [];
      }),
      catchError(this.handleError('Failed to load bookings'))
    );
  }

  cancelBooking(bookingId: string, reason?: string): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.base}/bookings/${bookingId}/cancel`, { reason: reason || '' }).pipe(
      map((res) => res.data),
      catchError(this.handleError('Failed to cancel booking'))
    );
  }

  // ── Owner: Incoming Booking Requests ─────────────────────────────────────
  getOwnerBookings(page = 1, limit = 20): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.base}/bookings/owner-requests`, {
      params: { page, limit }
    }).pipe(
      map((res) => res.data ?? res),
      catchError(this.handleError('Failed to load owner booking requests'))
    );
  }

  approveBooking(bookingId: string): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.base}/bookings/${bookingId}/approve`, {}).pipe(
      map((res) => res.data),
      catchError(this.handleError('Failed to approve booking'))
    );
  }

  rejectBooking(bookingId: string, reason?: string): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.base}/bookings/${bookingId}/reject`, { reason }).pipe(
      map((res) => res.data),
      catchError(this.handleError('Failed to reject booking'))
    );
  }

  getBookingDetails(bookingId: string): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.base}/bookings/${bookingId}`).pipe(
      map((res) => res.data?.booking ?? res.data),
      catchError(this.handleError('Failed to load booking details'))
    );
  }

  // ── Properties (owner/agent) ── GET /properties/my ────────────────────────
  getMyProperties(): Observable<any[]> {
    return this.http.get<ApiResponse<any>>(`${this.base}/properties/my`).pipe(
      map((res) => {
        if (Array.isArray(res.data)) return res.data;
        return res.data?.properties ?? [];
      }),
      catchError(this.handleError('Failed to load properties'))
    );
  }

  // ── Upload property (owner/agent) ──────────────────────────────────────────
  createProperty(payload: FormData): Observable<any> {
    const key = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
    return this.http.post<ApiResponse<any>>(`${this.base}/properties`, payload, {
      headers: { 'Idempotency-Key': key }
    }).pipe(
      map((res) => res.data),
      // Do NOT use handleError here — the component shows the specific backend error message.
      // handleError would fire a generic toast AND the component would fire a specific one (double toast).
      catchError((err) => throwError(() => err))
    );
  }

  // ── Saved / Favourites (buyer) ── GET /dashboard/me/favorites ───────────
  getSavedProperties(): Observable<any[]> {
    return this.http.get<ApiResponse<any>>(`${this.base}/dashboard/me/favorites`).pipe(
      map((res) => {
        if (Array.isArray(res.data)) return res.data;
        return res.data?.favorites ?? [];
      }),
      catchError(this.handleError('Failed to load saved properties'))
    );
  }

  unsaveProperty(propertyId: string): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.base}/favorites/${propertyId}`).pipe(
      map((res) => res.data),
      catchError(this.handleError('Failed to remove saved property'))
    );
  }

  // ── Subscription ── GET /subscriptions/plans | POST /subscriptions/subscribe ──
  getPlans(): Observable<any[]> {
    return this.http.get<ApiResponse<any>>(`${this.base}/subscriptions/plans`).pipe(
      map((res) => res.data?.plans ?? []),
      catchError(this.handleError('Failed to load subscription plans'))
    );
  }

  getMySubscription(): Observable<any | null> {
    return this.http.get<ApiResponse<any>>(`${this.base}/subscriptions/my`).pipe(
      map((res) => res.data),
      catchError((_) => of(null))
    );
  }

  // ── Subscription Checkout (gateway payment) ─────────────────────────────
  subscriptionCheckout(plan: string, paymentMethod: 'paymob' | 'paypal'): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.base}/subscriptions/subscribe`, { plan, paymentMethod }).pipe(
      map((res) => res.data),
      catchError((err) => throwError(() => err))
    );
  }

  subscribe(plan: string): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.base}/subscriptions/subscribe`, { plan }).pipe(
      map((res) => res.data),
      catchError(this.handleError('Failed to subscribe'))
    );
  }

  cancelSubscription(): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.base}/subscriptions/cancel`, {}).pipe(
      map((res) => res.data),
      catchError(this.handleError('Failed to cancel subscription'))
    );
  }

  // ── Payment Checkout (for approved bookings) ─────────────────────────────
  initiateBookingPayment(bookingId: string, paymentMethod: 'paymob' | 'paypal'): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.base}/payments/checkout`, {
      bookingId,
      paymentMethod,
    }).pipe(
      map((res) => res.data),
      catchError((err) => throwError(() => err))
    );
  }

  // ── Promotion Checkout (Monetization) ──────────────────────────────────
  initiatePromotion(propertyId: string, type: string, paymentMethod: string): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.base}/payments/promotion-checkout`, {
      propertyId,
      type,
      paymentMethod
    }).pipe(
      catchError((err) => throwError(() => err))
    );
  }

  getPaymentStatus(paymentId: string): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.base}/payments/${paymentId}/status`).pipe(
      map((res) => res.data),
      catchError(this.handleError('Failed to get payment status'))
    );
  }

  // ── Viewing Requests ──────────────────────────────────────────────────────
  // Backend response shape: { status, results, data: { requests: [...] } }
  getMyViewingRequests(): Observable<any[]> {
    return this.http.get<any>(`${this.base}/viewing-requests/my`).pipe(
      map((res) => res.data?.requests ?? res.data ?? []),
      catchError(this.handleError('Failed to load viewing requests'))
    );
  }

  getOwnerViewingRequests(): Observable<any[]> {
    return this.http.get<any>(`${this.base}/viewing-requests/owner`).pipe(
      map((res) => res.data?.requests ?? res.data ?? []),
      catchError(this.handleError('Failed to load owner viewing requests'))
    );
  }

  // PATCH /viewing-requests/:id/status  { status: 'approved' | 'rejected' }
  approveViewingRequest(id: string): Observable<any> {
    return this.http.patch<any>(`${this.base}/viewing-requests/${id}/status`, { status: 'approved' }).pipe(
      map((res) => res.data),
      catchError(this.handleError('Failed to approve viewing request'))
    );
  }

  rejectViewingRequest(id: string): Observable<any> {
    return this.http.patch<any>(`${this.base}/viewing-requests/${id}/status`, { status: 'rejected' }).pipe(
      map((res) => res.data),
      catchError(this.handleError('Failed to reject viewing request'))
    );
  }

  // PATCH /viewing-requests/:id/cancel
  cancelViewingRequest(id: string): Observable<any> {
    return this.http.patch<any>(`${this.base}/viewing-requests/${id}/cancel`, {}).pipe(
      map((res) => res.data),
      catchError(this.handleError('Failed to cancel viewing request'))
    );
  }

  // ── Payments ── GET /dashboard/me/payments ───────────────────────────────
  getPayments(): Observable<any[]> {
    return this.http.get<ApiResponse<any>>(`${this.base}/dashboard/me/payments`).pipe(
      map((res) => {
        if (Array.isArray(res.data)) return res.data;
        return res.data?.payments ?? [];
      }),
      catchError(this.handleError('Failed to load payments'))
    );
  }

  // ── Stats ── GET /dashboard/me/stats ───────────────────────────────
  getMyStats(): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.base}/dashboard/me/stats`).pipe(
      map((res) => res.data),
      catchError(this.handleError('Failed to load stats'))
    );
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  logout(): Observable<any> {
    this.authService.logout();
    return new Observable(observer => {
      observer.next(undefined);
      observer.complete();
    });
  }
}
