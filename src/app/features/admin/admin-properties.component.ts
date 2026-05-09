import { Component, OnInit, OnDestroy } from '@angular/core';
import { AdminService } from './admin.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-admin-properties',
  templateUrl: './admin-properties.component.html',
  styleUrls: ['./admin-properties.component.scss']
})
export class AdminPropertiesComponent implements OnInit, OnDestroy {
  properties: any[] = [];
  isLoading = false;
  activePropertyId: string | null = null;
  selectedProperty: any = null;

  // Pagination & Filters
  total = 0;
  page = 1;
  pages = 1;
  limit = 12;

  filters = {
    search: '',
    type: 'all',
    approvalStatus: 'all', // Changed from 'false' to 'all' as requested
    priceRange: 'all'
  };

  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    // Setup search debounce
    this.searchSub = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(value => {
      this.filters.search = value;
      this.page = 1;
      this.loadProperties();
    });

    this.loadProperties();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  loadProperties(): void {
    this.isLoading = true;

    // Construct query object
    const query = {
      search: this.filters.search,
      type: this.filters.type,
      isApproved: this.filters.approvalStatus === 'true' ? 'true' : (this.filters.approvalStatus === 'false' ? 'false' : undefined), // Keep backend compatibility or adjust as needed, Wait, the backend still uses `isApproved` as query parameter! Let's pass `isApproved` parameter but map it correctly
      priceRange: this.filters.priceRange,
      page: this.page,
      limit: this.limit
    };

    console.log('[AdminProperties] Loading with filters:', query);

    this.adminService.getProperties(query).subscribe({
      next: (res) => {
        console.log('[AdminProperties] Received:', res);
        this.properties = res.properties;
        this.total = res.total;
        this.pages = res.pages;
        this.page = res.page;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[AdminProperties] Error loading properties:', err);
        this.isLoading = false;
      }
    });
  }

  // Action handlers
  onSearch(event: any): void {
    this.searchSubject.next(event.target.value);
  }

  setTab(status: 'pending' | 'approved' | 'all'): void {
    if (status === 'pending') this.filters.approvalStatus = 'false';
    else if (status === 'approved') this.filters.approvalStatus = 'true';
    else this.filters.approvalStatus = 'all';

    this.page = 1;
    this.loadProperties();
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadProperties();
  }

  setPage(p: number): void {
    if (p < 1 || p > this.pages) return;
    this.page = p;
    this.loadProperties();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  selectProperty(property: any): void {
    this.selectedProperty = property;
  }

  updateApproval(property: any, decision: 'approve' | 'reject'): void {
    if (!property?._id) return;

    this.activePropertyId = property._id;
    this.adminService.updatePropertyApproval(property._id, decision).subscribe({
      next: () => {
        this.activePropertyId = null;
        this.selectedProperty = null;
        this.loadProperties();
      },
      error: () => {
        this.activePropertyId = null;
      }
    });
  }

  getOptimizedImageUrl(url: string | undefined): string {
    if (!url) return 'assets/images/property-placeholder.png';
    if (url.includes('cloudinary.com')) {
      const parts = url.split('/upload/');
      if (parts.length === 2) {
        return `${parts[0]}/upload/w_800,q_auto,f_auto/${parts[1]}`;
      }
    }
    return url;
  }
}
