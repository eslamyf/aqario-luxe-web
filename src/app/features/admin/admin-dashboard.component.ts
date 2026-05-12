import { Component, inject, OnInit } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, of } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { AdminService, AdminStats, ActivityFeedItem, RevenueReportItem } from './admin.service';

interface DashboardState {
  stats: AdminStats | null;
  revenue: RevenueReportItem[];
  transactions: any[];
  activities: ActivityFeedItem[];
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);

  private periodSubject = new BehaviorSubject<'monthly' | 'yearly'>('monthly');
  period$ = this.periodSubject.asObservable();

  state$: Observable<DashboardState>;

  constructor() {
    this.state$ = combineLatest([
      this.adminService.getStats().pipe(startWith(null), catchError(() => of(null))),
      this.period$.pipe(switchMap(period => this.adminService.getRevenueAnalytics(period).pipe(startWith([]), catchError(() => of([]))))),
      this.adminService.getRecentTransactions().pipe(startWith([]), catchError(() => of([]))),
      this.adminService.getSystemActivity().pipe(startWith([]), catchError(() => of([])))
    ]).pipe(
      map(([stats, revenue, transactions, activities]) => ({
        stats,
        revenue,
        transactions,
        activities,
        loading: stats === null && revenue.length === 0,
        error: null
      }))
    );
  }

  ngOnInit(): void {}

  setPeriod(period: 'monthly' | 'yearly') {
    this.periodSubject.next(period);
  }

  exportBookings() {
    this.adminService.exportBookings();
  }
}
