import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, timer, of } from 'rxjs';
import { map, switchMap, tap, shareReplay, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { SocketService } from './socket.service';
import { NotificationService } from '../../shared/services/notification.service';

export interface BackendNotification {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
  metadata?: {
    type?: string;
    referenceId?: string;
    chatId?: string;
  };
}

export interface NotificationsResponse {
  status: string;
  unreadCount: number;
  count: number;
  nextCursor?: string;
  hasMore: boolean;
  data: {
    notifications: BackendNotification[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsApiService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private socketService = inject(SocketService);
  private router = inject(Router);
  private toastService = inject(NotificationService);
  private readonly base = environment.apiUrl;

  private unreadCountSubject = new BehaviorSubject<number>(0);
  readonly unreadCount$ = this.unreadCountSubject.asObservable();

  private notificationsSubject = new BehaviorSubject<BackendNotification[]>([]);
  readonly notifications$ = this.notificationsSubject.asObservable();

  constructor() {
    // When a user logs in, fetch initial notifications
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.fetchNotifications().subscribe();
      } else {
        this.unreadCountSubject.next(0);
        this.notificationsSubject.next([]);
      }
    });

    // Listen for real-time notifications via Sockets
    this.socketService.onNotification().subscribe((notif: BackendNotification) => {
      if (notif) {
        const current = this.notificationsSubject.value;
        // Prepend to list if not already there
        if (!current.find(n => n._id === notif._id)) {
          this.notificationsSubject.next([notif, ...current]);
          this.unreadCountSubject.next(this.unreadCountSubject.value + 1);

          // Active Viewport Toast Suppression: skip chat notifications when user is already on chat page
          const currentUrl = this.router.url;
          if (!currentUrl.startsWith('/dashboard/chat') || (notif.type !== 'inquiry' && notif.type !== 'chat')) {
            this.toastService.show(notif.message, 'info');
          }
        }
      }
    });
  }

  fetchNotifications(limit: number = 5): Observable<NotificationsResponse> {
    if (!this.authService.isAuthenticated() || !this.authService.getToken()) {
      return of({ status: 'success', unreadCount: 0, data: { notifications: [] } } as any);
    }

    return this.http.get<NotificationsResponse>(`${this.base}/notifications?limit=${limit}`).pipe(
      tap(res => {
        if (res?.status === 'success') {
          this.unreadCountSubject.next(res.unreadCount || 0);
          this.notificationsSubject.next(res.data?.notifications || []);
        }
      }),
      catchError(() => of({ status: 'success', unreadCount: 0, data: { notifications: [] } } as any))
    );
  }

  markAsRead(id: string): Observable<any> {
    return this.http.patch<any>(`${this.base}/notifications/${id}/read`, {}).pipe(
      tap(() => {
        // Optimistically update local state
        const current = this.notificationsSubject.value;
        const updated = current.map(n => n._id === id ? { ...n, isRead: true } : n);
        this.notificationsSubject.next(updated);
        this.unreadCountSubject.next(Math.max(0, this.unreadCountSubject.value - 1));
      })
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.patch<any>(`${this.base}/notifications/read-all`, {}).pipe(
      tap(() => {
        // Optimistically update local state
        const current = this.notificationsSubject.value;
        const updated = current.map(n => ({ ...n, isRead: true }));
        this.notificationsSubject.next(updated);
        this.unreadCountSubject.next(0);
      })
    );
  }
}
