import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { AdminService } from './admin.service';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-admin-property-requests',
  templateUrl: './admin-property-requests.component.html',
  styleUrls: ['./admin-property-requests.component.scss'],
})
export class AdminPropertyRequestsComponent implements OnInit, OnDestroy {
  requests: any[] = [];
  isLoading = false;
  selectedRequest: any = null;
  activeRequestId: string | null = null;

  // Pagination & Filters
  total = 0;
  page = 1;
  pages = 1;
  limit = 12;

  filters = {
    search: '',
    status: 'all',
  };

  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  private adminService = inject(AdminService);
  private notif = inject(NotificationService);
  public translate = inject(TranslateService);

  ngOnInit(): void {
    this.searchSub = this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((value) => {
        this.filters.search = value;
        this.page = 1;
        this.loadRequests();
      });

    this.loadRequests();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  loadRequests(): void {
    this.isLoading = true;
    const query = {
      search: this.filters.search,
      status: this.filters.status,
      page: this.page,
      limit: this.limit,
    };

    this.adminService.getPropertyRequests(query).subscribe({
      next: (res) => {
        this.requests = res.requests;
        this.total = res.total;
        this.pages = res.pages;
        this.page = res.page;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[AdminPropertyRequests] Error loading requests:', err);
        this.isLoading = false;
      },
    });
  }

  onSearch(event: any): void {
    this.searchSubject.next(event.target.value);
  }

  setStatusTab(status: 'all' | 'pending' | 'approved' | 'rejected'): void {
    this.filters.status = status;
    this.page = 1;
    this.loadRequests();
  }

  setPage(p: number): void {
    if (p < 1 || p > this.pages) return;
    this.page = p;
    this.loadRequests();
  }

  selectRequest(reqItem: any): void {
    this.selectedRequest = reqItem;
  }

  closeModal(): void {
    this.selectedRequest = null;
  }

  updateStatus(reqItem: any, newStatus: 'pending' | 'approved' | 'rejected'): void {
    if (!reqItem?._id) return;

    this.activeRequestId = reqItem._id;
    this.adminService.updateRequestStatus(reqItem._id, newStatus).subscribe({
      next: (res) => {
        this.activeRequestId = null;
        if (this.selectedRequest?._id === reqItem._id) {
          this.selectedRequest.status = newStatus;
        }

        const index = this.requests.findIndex((r) => r._id === reqItem._id);
        if (index !== -1) {
          this.requests[index].status = newStatus;
        }

        this.notif.show('تم تحديث حالة الطلب بنجاح', 'success');
      },
      error: () => {
        this.activeRequestId = null;
        this.notif.show('حدث خطأ أثناء تحديث حالة الطلب', 'error');
      },
    });
  }

  showDeleteModal = false;
  requestToDelete: any = null;

  promptDelete(reqItem: any): void {
    if (!reqItem?._id) return;
    this.requestToDelete = reqItem;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.requestToDelete = null;
  }

  executeDelete(): void {
    if (!this.requestToDelete?._id) return;

    const targetId = this.requestToDelete._id;
    this.activeRequestId = targetId;

    this.adminService.deletePropertyRequest(targetId).subscribe({
      next: () => {
        this.activeRequestId = null;
        if (this.selectedRequest?._id === targetId) {
          this.selectedRequest = null;
        }
        this.closeDeleteModal();
        this.notif.show('تم حذف الطلب بنجاح', 'success');
        this.loadRequests();
      },
      error: () => {
        this.activeRequestId = null;
        this.closeDeleteModal();
        this.notif.show('حدث خطأ أثناء حذف الطلب', 'error');
      },
    });
  }

  deleteRequest(reqItem: any): void {
    this.promptDelete(reqItem);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'approved':
        return 'badge-success';
      case 'rejected':
        return 'badge-danger';
      case 'pending':
      default:
        return 'badge-warning';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'approved':
        return this.translate.instant('ADMIN.PROPERTY_REQUESTS.STATUS.APPROVED');
      case 'rejected':
        return this.translate.instant('ADMIN.PROPERTY_REQUESTS.STATUS.REJECTED');
      case 'pending':
      default:
        return this.translate.instant('ADMIN.PROPERTY_REQUESTS.STATUS.PENDING');
    }
  }

  getWhatsAppUrl(phone: string): string {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    const formatted = cleanPhone.startsWith('0') ? '2' + cleanPhone : cleanPhone;
    return `https://wa.me/${formatted}`;
  }

  getTelUrl(phone: string): string {
    if (!phone) return '#';
    return `tel:${phone}`;
  }

  extractContactName(r: any): string {
    return r?.details?.contactName || r?.sender?.name || this.translate.instant('ADMIN.PROPERTY_REQUESTS.DEFAULTS.UNREGISTERED_LEAD');
  }

  extractContactPhone(r: any): string {
    return r?.details?.contactPhone || r?.sender?.phone || this.translate.instant('ADMIN.PROPERTY_REQUESTS.DEFAULTS.NOT_AVAILABLE');
  }

  extractPropertyType(r: any): string {
    const rawType = r?.details?.propertyType;
    if (!rawType) return this.translate.instant('ADMIN.PROPERTY_REQUESTS.TYPES.PROPERTY');

    const typeMap: Record<string, string> = {
      'شقة': 'ADMIN.PROPERTY_REQUESTS.TYPES.APARTMENT',
      'فيلا': 'ADMIN.PROPERTY_REQUESTS.TYPES.VILLA',
      'دوبلكس': 'ADMIN.PROPERTY_REQUESTS.TYPES.DUPLEX',
      'بنتهاوس': 'ADMIN.PROPERTY_REQUESTS.TYPES.PENTHOUSE',
      'تاون هاوس': 'ADMIN.PROPERTY_REQUESTS.TYPES.TOWNHOUSE',
      'شاليه': 'ADMIN.PROPERTY_REQUESTS.TYPES.CHALET',
      'أرض': 'ADMIN.PROPERTY_REQUESTS.TYPES.LAND',
      'محل تجاري': 'ADMIN.PROPERTY_REQUESTS.TYPES.COMMERCIAL_STORE',
      'مكتب': 'ADMIN.PROPERTY_REQUESTS.TYPES.OFFICE',
      'عمارة': 'ADMIN.PROPERTY_REQUESTS.TYPES.BUILDING',
      'Apartment': 'ADMIN.PROPERTY_REQUESTS.TYPES.APARTMENT',
      'Villa': 'ADMIN.PROPERTY_REQUESTS.TYPES.VILLA',
      'Duplex': 'ADMIN.PROPERTY_REQUESTS.TYPES.DUPLEX',
      'Penthouse': 'ADMIN.PROPERTY_REQUESTS.TYPES.PENTHOUSE',
      'Townhouse': 'ADMIN.PROPERTY_REQUESTS.TYPES.TOWNHOUSE',
      'Chalet': 'ADMIN.PROPERTY_REQUESTS.TYPES.CHALET',
      'Land': 'ADMIN.PROPERTY_REQUESTS.TYPES.LAND',
      'Commercial Store': 'ADMIN.PROPERTY_REQUESTS.TYPES.COMMERCIAL_STORE',
      'Office': 'ADMIN.PROPERTY_REQUESTS.TYPES.OFFICE',
      'Building': 'ADMIN.PROPERTY_REQUESTS.TYPES.BUILDING'
    };

    if (typeMap[rawType]) {
      return this.translate.instant(typeMap[rawType]);
    }
    return rawType;
  }

  extractListingType(r: any): string {
    const rawListing = r?.details?.listingType;
    if (!rawListing) return this.translate.instant('ADMIN.PROPERTY_REQUESTS.TYPES.SALE');

    const listingMap: Record<string, string> = {
      'بيع': 'ADMIN.PROPERTY_REQUESTS.TYPES.SALE',
      'إيجار': 'ADMIN.PROPERTY_REQUESTS.TYPES.RENT',
      'ايجار': 'ADMIN.PROPERTY_REQUESTS.TYPES.RENT',
      'Sale': 'ADMIN.PROPERTY_REQUESTS.TYPES.SALE',
      'Rent': 'ADMIN.PROPERTY_REQUESTS.TYPES.RENT'
    };

    if (listingMap[rawListing]) {
      return this.translate.instant(listingMap[rawListing]);
    }
    return rawListing;
  }

  extractCity(r: any): string {
    return r?.details?.city || this.translate.instant('ADMIN.PROPERTY_REQUESTS.DEFAULTS.DEFAULT_CITY');
  }

  extractNotes(r: any): string {
    return r?.details?.notes || r?.content || '';
  }

  getPropertyTypeIcon(r: any): string {
    const rawType = (r?.details?.propertyType || '').toLowerCase();
    if (rawType.includes('فيلا') || rawType.includes('villa')) return 'fa-house-chimney';
    if (rawType.includes('أرض') || rawType.includes('land')) return 'fa-map-location-dot';
    if (rawType.includes('محل') || rawType.includes('store') || rawType.includes('commercial')) return 'fa-store';
    if (rawType.includes('مكتب') || rawType.includes('office')) return 'fa-briefcase';
    if (rawType.includes('شاليه') || rawType.includes('chalet')) return 'fa-umbrella-beach';
    if (rawType.includes('بنتهاوس') || rawType.includes('penthouse')) return 'fa-building-circle-arrow-right';
    return 'fa-building';
  }
}
