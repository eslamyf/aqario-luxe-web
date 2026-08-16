import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AdminService } from './admin.service';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-admin-properties',
  templateUrl: './admin-properties.component.html',
  styleUrls: ['./admin-properties.component.scss'],
})
export class AdminPropertiesComponent implements OnInit, OnDestroy {
  properties: any[] = [];
  isLoading = false;
  activePropertyId: string | null = null;
  selectedProperty: any = null;

  // Manual Add Property Modal State
  showCreateModal = false;
  isSubmittingForm = false;
  createForm!: FormGroup;
  selectedFiles: File[] = [];
  imagePreviews: string[] = [];

  // Pagination & Filters
  total = 0;
  page = 1;
  pages = 1;
  limit = 12;

  filters = {
    search: '',
    type: 'all',
    approvalStatus: 'all',
    priceRange: 'all',
  };

  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  private adminService = inject(AdminService);
  private fb = inject(FormBuilder);
  private notif = inject(NotificationService);

  ngOnInit(): void {
    this.buildCreateForm();

    this.searchSub = this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((value) => {
        this.filters.search = value;
        this.page = 1;
        this.loadProperties();
      });

    this.loadProperties();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  buildCreateForm(): void {
    this.createForm = this.fb.group({
      title: this.fb.group({
        en: ['Luxury Villa in New Qena', [Validators.required, Validators.minLength(10)]],
        ar: ['فيلا فاخرة في قنا الجديدة', [Validators.required, Validators.minLength(10)]],
      }),
      description: this.fb.group({
        en: ['High-end residential villa with modern architecture and premium finishings in New Qena.', [Validators.required, Validators.minLength(20)]],
        ar: ['فيلا سكنية فاخرة بتصميم معماري حديث وتطيبات سوبر لوكس في قنا الجديدة.', [Validators.required, Validators.minLength(20)]],
      }),
      price: [2500000, [Validators.required, Validators.min(1)]],
      area: [300],
      rooms: [6],
      bedrooms: [4],
      bathrooms: [3],
      city: this.fb.group({
        en: ['New Qena', Validators.required],
        ar: ['قنا الجديدة', Validators.required],
      }),
      district: this.fb.group({
        en: ['District 1', Validators.required],
        ar: ['الحي الأول', Validators.required],
      }),
      address: ['شارع التسعين، قنا الجديدة'],
      type: ['villa', Validators.required],
      listingType: ['sale', Validators.required],
    });
  }

  loadProperties(): void {
    this.isLoading = true;
    const query = {
      search: this.filters.search,
      type: this.filters.type,
      isApproved:
        this.filters.approvalStatus === 'true'
          ? 'true'
          : this.filters.approvalStatus === 'false'
          ? 'false'
          : undefined,
      priceRange: this.filters.priceRange,
      page: this.page,
      limit: this.limit,
    };

    this.adminService.getProperties(query).subscribe({
      next: (res) => {
        this.properties = res.properties;
        this.total = res.total;
        this.pages = res.pages;
        this.page = res.page;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[AdminProperties] Error loading properties:', err);
        this.isLoading = false;
      },
    });
  }

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

  // ── Manual Property Addition Modal ──
  openCreateModal(): void {
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.selectedFiles = [];
    this.imagePreviews = [];
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    Array.from(input.files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        this.selectedFiles.push(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          this.imagePreviews.push(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    });
    input.value = '';
  }

  removeImage(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.imagePreviews.splice(index, 1);
  }

  submitCreateProperty(): void {
    if (this.isSubmittingForm) return;
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      this.notif.show('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    this.isSubmittingForm = true;
    const fd = new FormData();
    const v = this.createForm.value;

    fd.append('title[en]', v.title.en);
    fd.append('title[ar]', v.title.ar);
    fd.append('description[en]', v.description.en);
    fd.append('description[ar]', v.description.ar);
    fd.append('price', String(v.price));
    fd.append('type', v.type);
    fd.append('listingType', v.listingType);
    fd.append('currency', 'EGP');

    fd.append('location[city][en]', v.city.en);
    fd.append('location[city][ar]', v.city.ar);
    fd.append('location[district][en]', v.district.en);
    fd.append('location[district][ar]', v.district.ar);
    if (v.address) fd.append('location[street]', v.address);

    if (v.area) fd.append('area', String(v.area));
    if (v.rooms) fd.append('rooms', String(v.rooms));
    if (v.bedrooms) fd.append('bedrooms', String(v.bedrooms));
    if (v.bathrooms) fd.append('bathrooms', String(v.bathrooms));

    this.selectedFiles.forEach((file) => fd.append('images', file));

    this.adminService.createPropertyByAdmin(fd).subscribe({
      next: () => {
        this.isSubmittingForm = false;
        this.notif.show('تمت إضافة العقار ونشره بنجاح!', 'success');
        this.closeCreateModal();
        this.loadProperties();
      },
      error: (err) => {
        this.isSubmittingForm = false;
        console.error('Error creating property:', err);
        const msg = err?.error?.message || 'حدث خطأ أثناء إضافة العقار';
        this.notif.show(msg, 'error');
      },
    });
  }

  deleteProperty(property: any): void {
    if (!property?._id) return;
    if (!confirm('هل أنت متأكد من حذف هذا العقار نهائياً؟')) return;

    this.activePropertyId = property._id;
    this.adminService.deletePropertyByAdmin(property._id).subscribe({
      next: () => {
        this.activePropertyId = null;
        this.selectedProperty = null;
        this.notif.show('تم حذف العقار بنجاح', 'success');
        this.loadProperties();
      },
      error: () => {
        this.activePropertyId = null;
        this.notif.show('حدث خطأ أثناء حذف العقار', 'error');
      },
    });
  }

  updateApproval(property: any, decision: 'approve' | 'reject'): void {
    if (!property?._id) return;

    this.activePropertyId = property._id;
    this.adminService.updatePropertyApproval(property._id, decision).subscribe({
      next: (res) => {
        this.activePropertyId = null;
        this.selectedProperty = null;
        this.loadProperties();
      },
      error: () => {
        this.activePropertyId = null;
      },
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
