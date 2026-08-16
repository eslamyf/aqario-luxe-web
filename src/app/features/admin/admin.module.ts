import { NgModule } from '@angular/core';
import { CommonModule, TitleCasePipe, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { AdminComponent }            from './admin.component';
import { AdminDashboardComponent }   from './admin-dashboard.component';
import { AdminUsersComponent }       from './admin-users.component';
import { AdminPropertiesComponent }  from './admin-properties.component';
import { AdminPropertyRequestsComponent } from './admin-property-requests.component';
import { AdminBookingsComponent }    from './admin-bookings.component';
import { AdminKycComponent }         from './kyc/admin-kyc/admin-kyc.component';
import { AdminAuditComponent }       from './admin-audit.component';

// Shared sub-components
import { KpiCardComponent }          from './components/kpi-card/kpi-card.component';
import { RevenueChartComponent }     from './components/revenue-chart/revenue-chart.component';
import { TransactionsTableComponent } from './components/transactions-table/transactions-table.component';
import { ActivityFeedComponent }     from './components/activity-feed/activity-feed.component';

// Users management components
import { RoleBadgeComponent }        from './components/role-badge/role-badge.component';
import { UserActionsComponent }      from './components/user-actions/user-actions.component';

import { TranslatePropPipe } from '../user dashboard/translate-prop.pipe';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
      { path: '',           redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview',   component: AdminDashboardComponent  },
      { path: 'dashboard',  redirectTo: 'overview', pathMatch: 'full' },
      { path: 'users',      component: AdminUsersComponent      },
      { path: 'requests',   component: AdminPropertyRequestsComponent },
      { path: 'properties', component: AdminPropertiesComponent },
      { path: 'bookings',   component: AdminBookingsComponent   },
      { path: 'kyc',        component: AdminKycComponent        },
      { path: 'audit',      component: AdminAuditComponent      },
    ],
  },
];

@NgModule({
  declarations: [
    AdminComponent,
    AdminDashboardComponent,
    AdminUsersComponent,
    AdminPropertyRequestsComponent,
    AdminPropertiesComponent,
    AdminBookingsComponent,
    AdminAuditComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    TranslateModule,
    TranslatePropPipe,
    // Dashboard overview sub-components (standalone)
    AdminKycComponent,
    KpiCardComponent,
    RevenueChartComponent,
    TransactionsTableComponent,
    ActivityFeedComponent,
    // Users management sub-components (standalone)
    RoleBadgeComponent,
    UserActionsComponent,
  ],
  providers: [TitleCasePipe, DatePipe, CurrencyPipe],
})
export class AdminModule {}
