import { Component, OnInit, DestroyRef, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, switchMap, catchError, of, tap, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AdminService, KycSubmission } from '../../admin.service';
import { NotificationService } from '../../../../shared/services/notification.service';

@Component({
  selector: 'app-admin-kyc',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './admin-kyc.component.html',
  styleUrl: './admin-kyc.component.scss'
})
export class AdminKycComponent implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  // State
  isLoading = true;
  kycUsers: KycSubmission[] = [];
  totalUsers = 0;
  selectedUser: KycSubmission | null = null;
  
  // Pagination & Filters
  page = 1;
  limit = 50;
  filters = {
    search: '',
    status: 'pending' // Default tab
  };

  // Stats
  kycStats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    notSubmitted: 0,
    completionRate: 0
  };

  // Streams
  private refreshSubject = new BehaviorSubject<number>(0);
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  // UI States
  isSubmitting = false;
  showRejectModal = false;
  rejectionReason = '';
  previewImageUrl: string | null = null;

  ngOnInit(): void {
    // Setup Search Debounce
    this.searchSub = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(value => {
      this.filters.search = value;
      this.page = 1;
      this.loadKycData();
    });

    // Main Data Stream
    this.refreshSubject.pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.isLoading = true),
      switchMap(() => combineLatest({
        stats: this.adminService.getKYCSummary().pipe(catchError(() => of(null))),
        list: this.adminService.getKYCList({
          page: this.page,
          limit: this.limit,
          search: this.filters.search,
          status: this.filters.status
        }).pipe(catchError(() => of(null)))
      }))
    ).subscribe((res) => {
      if (res.stats) {
        this.kycStats = res.stats.kycStats;
      }
      if (res.list) {
        this.kycUsers = res.list.users;
        this.totalUsers = res.list.total;
      }
      this.isLoading = false;
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  loadKycData(): void {
    this.refreshSubject.next(Date.now());
  }

  onSearch(event: any): void {
    this.searchSubject.next(event.target.value);
  }

  setTab(status: 'pending' | 'approved' | 'rejected' | 'all'): void {
    this.filters.status = status;
    this.page = 1;
    this.selectedUser = null;
    this.loadKycData();
  }

  onReviewUser(user: KycSubmission): void {
    this.selectedUser = user;
    this.showRejectModal = false;
    this.rejectionReason = '';
  }

  getOptimizedImageUrl(url: string | undefined): string {
    if (!url) return 'assets/images/id-placeholder.png';
    if (url.includes('cloudinary.com')) {
      const parts = url.split('/upload/');
      if (parts.length === 2) {
        return `${parts[0]}/upload/w_800,q_auto,f_auto/${parts[1]}`;
      }
    }
    return url;
  }

  getFileIcon(fileType?: string): string {
    switch (fileType) {
      case 'pdf': return 'fa-file-pdf';
      case 'doc': return 'fa-file-word';
      default: return 'fa-file-image';
    }
  }

  getFileIconColor(fileType?: string): string {
    switch (fileType) {
      case 'pdf': return '#e74c3c';
      case 'doc': return '#2980b9';
      default: return '#C9A96E';
    }
  }

  downloadOwnership(own: any): void {
    if (!this.selectedUser || !own || !own._id) return;
    this.adminService.downloadOwnershipFile(this.selectedUser._id, own._id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = own.fileName || 'ownership-document';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    });
  }

  approveKyc(): void {
    if (!this.selectedUser) return;
    this.isSubmitting = true;
    this.adminService.approveKYC(this.selectedUser._id).subscribe({
      next: () => {
        this.notificationService.show('KYC Approved successfully', 'success');
        this.isSubmitting = false;
        this.selectedUser = null;
        this.loadKycData();
      },
      error: () => this.isSubmitting = false
    });
  }

  openRejectModal(): void {
    this.showRejectModal = true;
    this.rejectionReason = '';
  }

  cancelReject(): void {
    this.showRejectModal = false;
    this.rejectionReason = '';
  }

  submitReject(): void {
    if (!this.selectedUser) return;
    if (this.rejectionReason.length < 10 || this.rejectionReason.length > 500) {
      this.notificationService.show('Rejection reason must be between 10 and 500 characters.', 'error');
      return;
    }

    this.isSubmitting = true;
    this.adminService.rejectKYC(this.selectedUser._id, this.rejectionReason).subscribe({
      next: () => {
        this.notificationService.show('KYC Rejected', 'info');
        this.isSubmitting = false;
        this.showRejectModal = false;
        this.selectedUser = null;
        this.loadKycData();
      },
      error: () => this.isSubmitting = false
    });
  }

  revertToPending(): void {
    if (!this.selectedUser) return;
    
    this.isSubmitting = true;
    this.adminService.revertToPendingKYC(this.selectedUser._id).subscribe({
      next: () => {
        this.notificationService.show('KYC status reverted to pending', 'info');
        this.isSubmitting = false;
        this.selectedUser = null;
        this.loadKycData();
      },
      error: () => this.isSubmitting = false
    });
  }

  openImage(url: string): void {
    if (url) {
      this.previewImage(url);
    }
  }

  previewImage(url: string): void {
    this.previewImageUrl = url;
  }

  closePreviewImage(): void {
    this.previewImageUrl = null;
  }

  downloadImage(url: string, filename: string): void {
    if (!url) return;
    this.notificationService.show('Downloading image...', 'info');
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename || 'downloaded-image';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch(err => {
        console.error('Failed to download image:', err);
        window.open(url, '_blank');
      });
  }

  downloadUserData(): void {
    if (!this.selectedUser) return;
    const userData = {
      id: this.selectedUser._id,
      name: this.selectedUser.name,
      email: this.selectedUser.email,
      kycStatus: this.selectedUser.kycStatus,
      kycNationality: this.selectedUser.kycNationality,
      kycPhoneNumber: this.selectedUser.kycPhoneNumber,
      kycVersion: this.selectedUser.kycVersion,
      kycAttempts: this.selectedUser.kycAttempts,
      kycSubmittedAt: this.selectedUser.kycSubmittedAt,
      kycApprovedAt: this.selectedUser.kycApprovedAt,
      kycRejectionReason: this.selectedUser.kycRejectionReason,
      documents: this.selectedUser.kycDocuments || [],
      ownershipDocuments: this.selectedUser.ownershipDocuments || []
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(userData, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `kyc-dossier-${this.selectedUser.name.toLowerCase().replace(/\s+/g, '-')}-${this.selectedUser._id.slice(-8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.notificationService.show('Dossier downloaded successfully', 'success');
  }
}
