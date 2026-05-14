import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardUiService } from '../../shared/services/dashboard-ui.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  dashboardUi = inject(DashboardUiService);
  sidebarOpen = false;
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.dashboardUi.sidebarOpen
      .pipe(takeUntil(this.destroy$))
      .subscribe(open => this.sidebarOpen = open);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar(): void {
    this.dashboardUi.toggleSidebar();
  }

  closeSidebar(): void {
    this.dashboardUi.closeSidebar();
  }
}
