import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { UserDashboardComponent }           from './user-dashboard.component';
import { UserOverviewComponent }            from './user-overview.component';
import { UserBookingsComponent }            from './user-bookings.component';
import { UserPropertiesComponent }          from './user-properties.component';
import { UserSavedComponent }               from './user-saved.component';
import { UserPaymentsComponent }            from './user-payments.component';
import { UserProfileComponent }             from './user-profile.component';
import { UserOwnerBookingsComponent }       from './user-owner-bookings.component';
import { UserViewingRequestsComponent }     from './user-viewing-requests.component';
import { UserOwnerViewingRequestsComponent } from './user-owner-viewing-requests.component';

const routes: Routes = [
  {
    path: '',
    component: UserDashboardComponent,
    children: [
      { path: '',                        redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview',                component: UserOverviewComponent               },
      { path: 'bookings',                component: UserBookingsComponent               },
      { path: 'owner-bookings',          component: UserOwnerBookingsComponent          },
      { path: 'viewing-requests',        component: UserViewingRequestsComponent        },
      { path: 'owner-viewing-requests',  component: UserOwnerViewingRequestsComponent   },
      { path: 'properties',              component: UserPropertiesComponent             },
      { path: 'saved',                   component: UserSavedComponent                 },
      { path: 'payments',                component: UserPaymentsComponent              },
      { path: 'profile',                 component: UserProfileComponent               },
    ],
  },
];

@NgModule({
  declarations: [
    UserDashboardComponent,
    UserOverviewComponent,
    UserBookingsComponent,
    UserPropertiesComponent,
    UserSavedComponent,
    UserPaymentsComponent,
    UserProfileComponent,
    UserOwnerBookingsComponent,
    UserViewingRequestsComponent,
    UserOwnerViewingRequestsComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
  ],
})
export class UserDashboardModule {}
