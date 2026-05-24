import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, combineLatest, finalize, map, of } from 'rxjs';
import { AccountService } from '../services/account.service';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit {
  private accountService = inject(AccountService);
  private notificationService = inject(NotificationService);

  loading = false;
  kycLoadError = false;

  ngOnInit(): void {
    this.syncIdentityData();
  }

  syncIdentityData(): void {
    this.loading = true;
    this.kycLoadError = false;

    combineLatest([
      this.accountService.getMe().pipe(
        catchError(err => {
          this.notificationService.show('Critical: Failed to load user profile', 'error');
          throw err;
        })
      ),
      this.accountService.getKycStatus().pipe(
        catchError(() => {
          this.kycLoadError = true;
          // Fallback to allow profile to load even if KYC status check fails
          return of({ data: { kycStatus: 'error_fallback' } }); 
        })
      )
    ]).pipe(
      map(([userRes, kycRes]) => {
        const user = userRes.data.user;
        if (kycRes.data.kycStatus !== 'error_fallback') {
          user.kycStatus = kycRes.data.kycStatus;
        }
        return user;
      }),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (user) => this.accountService.setUserData(user),
      error: () => {} // Handled by inner catchError
    });
  }
}
