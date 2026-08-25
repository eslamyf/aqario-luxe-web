import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserDashboardService } from './user-dashboard.service';
import { FavoritesService } from '../properties/services/favorites.service';
import { PropertiesService } from '../properties/services/properties.service';
import { Property } from '../properties/models/property.model';
import { PropertyCardComponent } from '../properties/components/property-card/property-card.component';

@Component({
  selector: 'app-user-saved',
  templateUrl: './user-saved.component.html',
  styleUrls: ['./user-saved.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    PropertyCardComponent,
  ]
})
export class UserSavedComponent implements OnInit, OnDestroy {
  private userService        = inject(UserDashboardService);
  private favoritesService   = inject(FavoritesService);
  private propertiesService  = inject(PropertiesService);
  private router             = inject(Router);

  saved: any[] = [];
  properties: Property[] = [];
  isLoading = false;
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.load();

    // Sync reactively with favorites stream
    this.favoritesService.favorites$
      .pipe(takeUntil(this.destroy$))
      .subscribe((favIds) => {
        if (this.properties.length > 0) {
          this.properties = this.properties.filter(p => p._id && favIds.includes(p._id));
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.isLoading = true;
    this.userService.getSavedProperties()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.saved = data || [];
          this.properties = (this.saved)
            .map((item) => {
              const rawProp = item.property_id ?? item.property ?? item;
              if (!rawProp || typeof rawProp !== 'object') return null;
              return this.propertiesService.translateProperty(
                (this.propertiesService as any).mapProperty ? (this.propertiesService as any).mapProperty(rawProp) : rawProp
              );
            })
            .filter((p): p is Property => p !== null && !!p._id);
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  onFavoriteToggled(propertyId: any): void {
    const id = typeof propertyId === 'string' ? propertyId : (propertyId?.detail || propertyId);
    if (id) {
      this.properties = this.properties.filter(p => p._id !== id);
    }
  }

  navigateToBrowse(): void {
    this.router.navigate(['/properties']);
  }
}
