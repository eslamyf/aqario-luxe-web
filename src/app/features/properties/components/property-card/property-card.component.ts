// ─────────────────────────────────────────────────────────────────────────────
// LUXE ESTATES — Property Card Component
// Visual reference: Template/index.html — .property-card (lines 418–531)
// ─────────────────────────────────────────────────────────────────────────────

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Property } from '../../models/property.model';
import { PropertiesService } from '../../services/properties.service';
import { FavoritesService } from '../../services/favorites.service';

@Component({
  selector: 'app-property-card',
  templateUrl: './property-card.component.html',
  styleUrls: ['./property-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyCardComponent implements OnInit, OnDestroy {
  private propertiesService = inject(PropertiesService);
  private favoritesService = inject(FavoritesService);
  private cdr = inject(ChangeDetectorRef);

  // ── Inputs ─────────────────────────────────────────────────────────────────
  @Input() property!: Property;
  @Input() isFirst = false;

  // ── Outputs ────────────────────────────────────────────────────────────────
  @Output() favoriteToggled  = new EventEmitter<string>();

  // ── Local state ────────────────────────────────────────────────────────────
  isFavorited  = false;
  imageError   = false;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Reactive favorite state
    this.favoritesService.isFavorited$(this.property._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(fav => {
        this.isFavorited = fav;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get priceParts(): { value: string; unit: string } {
    return this.propertiesService.formatPriceParts(
      this.property.price,
      this.property.currency ?? 'EGP',
      this.property.status
    );
  }

  get formattedPrice(): string {
    return this.propertiesService.formatPrice(
      this.property.price,
      this.property.currency ?? 'EGP',
      this.property.status
    );
  }

  get tagClass(): string {
    return this.property.status === 'for-rent' ? 'rent' : '';
  }

  get tagLabel(): string {
    return this.property.status === 'for-rent' ? 'For Rent' : 'For Sale';
  }

  onFavoriteClick(event: MouseEvent): void {
    event.stopPropagation();
    this.favoriteToggled.emit(this.property._id);
  }

  onImageError(): void {
    this.imageError = true;
  }
}
