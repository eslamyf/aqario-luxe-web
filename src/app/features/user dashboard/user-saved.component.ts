import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserDashboardService } from './user-dashboard.service';

@Component({
  selector: 'app-user-saved',
  templateUrl: './user-saved.component.html',
  styleUrls: ['./user-saved.component.scss']
})
export class UserSavedComponent implements OnInit, OnDestroy {
  saved: any[] = [];
  isLoading = false;
  activeId: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(private userService: UserDashboardService) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.isLoading = true;
    this.userService.getSavedProperties()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.saved = data; this.isLoading = false; },
        error: () => { this.isLoading = false; },
      });
  }

  remove(item: any): void {
    const id = item.property_id?._id ?? item.property?._id ?? item.propertyId ?? item._id;
    if (!id || this.activeId) return;
    this.activeId = id;
    this.userService.unsaveProperty(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.activeId = null; this.load(); },
        error: () => { this.activeId = null; },
      });
  }

  propertyTitle(item: any): string {
    return item.property_id?.title ?? item.property?.title ?? item.title ?? 'N/A';
  }

  propertyCity(item: any): string {
    const prop = item.property_id ?? item.property;
    return prop?.location?.city ?? prop?.city ?? '—';
  }

  propertyPrice(item: any): number {
    return item.property_id?.price ?? item.property?.price ?? item.price ?? 0;
  }

  // Resolves the Mongo _id used for navigation to /properties/:id
  propertyId(item: any): string {
    return item.property_id?._id ?? item.property?._id ?? item.propertyId ?? item._id ?? '';
  }
}
