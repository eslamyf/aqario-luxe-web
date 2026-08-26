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
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Property } from '../../models/property.model';
import { PropertiesService } from '../../services/properties.service';
import { FavoritesService } from '../../services/favorites.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CloudImagePipe } from '../../../../shared/pipes/cloud-image.pipe';

@Component({
  selector: 'app-property-card',
  templateUrl: './property-card.component.html',
  styleUrls: ['./property-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, CloudImagePipe],
})
export class PropertyCardComponent implements OnInit, OnDestroy {
  private router             = inject(Router);
  private propertiesService  = inject(PropertiesService);
  private favoritesService   = inject(FavoritesService);
  private authService        = inject(AuthService);
  private notificationService = inject(NotificationService);
  private translateService   = inject(TranslateService);
  private cdr                = inject(ChangeDetectorRef);

  // ── Inputs ─────────────────────────────────────────────────────────────────
  @Input() property!: Property;
  @Input() isFirst = false;

  // ── Outputs ────────────────────────────────────────────────────────────────
  @Output() favoriteToggled = new EventEmitter<string>();

  // ── Local state ────────────────────────────────────────────────────────────
  isFavorited = false;
  imageError = false;

  private destroy$ = new Subject<void>();

  get propertyId(): string {
    return this.property?._id || (this.property as any)?.id || '';
  }

  ngOnInit(): void {
    const id = this.propertyId;
    if (id) {
      // Reactive favorite state
      this.favoritesService.isFavorited$(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe(fav => {
          this.isFavorited = fav;
          this.cdr.markForCheck();
        });
    }
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

  onCardClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.property-favorite')) {
      return;
    }
    const id = this.propertyId;
    if (id) {
      this.router.navigate(['/properties', id]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onBookNowClick(event: MouseEvent): void {
    event.stopPropagation();
    const id = this.propertyId;
    if (id) {
      this.router.navigate(['/properties', id]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onFavoriteClick(event: MouseEvent): void {
    event.stopPropagation();

    if (!this.authService.isAuthenticated()) {
      this.authService.openModal('login');
      this.notificationService.show(
        this.translateService.instant('PROPERTIES.NOTIF.SIGN_IN_FAVORITES'),
        'info'
      );
      return;
    }

    const id = this.propertyId;
    if (!id) return;

    this.favoritesService.toggleFavorite(id).subscribe({
      next: (isFav) => {
        this.notificationService.show(
          this.translateService.instant(
            isFav ? 'PROPERTIES.NOTIF.ADDED_FAVORITES' : 'PROPERTIES.NOTIF.REMOVED_FAVORITES'
          ),
          isFav ? 'success' : 'info'
        );
      },
      error: () => {
        this.notificationService.show(
          this.translateService.instant('PROPERTIES.NOTIF.FAILED_FAVORITES'),
          'error'
        );
      }
    });

    this.favoriteToggled.emit(id);
  }

  onImageError(): void {
    this.imageError = true;
  }

  onCallClick(event: MouseEvent): void {
    event.stopPropagation();
    const prop = this.property as any;
    const phone = prop?.owner?.phone || prop?.agent?.phone || prop?.contactPhone || '+201000000000';
    window.location.href = `tel:${phone}`;
  }

  onWhatsAppClick(event: MouseEvent): void {
    event.stopPropagation();
    const prop = this.property as any;
    const rawPhone = prop?.owner?.phone || prop?.agent?.phone || prop?.contactPhone || '201000000000';
    let cleanPhone = String(rawPhone).replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
      cleanPhone = '2' + cleanPhone;
    }

    let hash = 0;
    const id = this.propertyId || '1001';
    for (let i = 0; i < id.length; i++) {
      hash = (hash * 31 + id.charCodeAt(i)) % 8999;
    }
    const propertyCode = `AQR-${1000 + Math.abs(hash)}`;

    const baseUrl = window.location.origin.includes('localhost')
      ? 'https://aqario-luxe.vercel.app'
      : window.location.origin;

    const propertyUrl = `${baseUrl}/properties/${this.propertyId}`;

    const message = `مرحباً، أرغب في الاستفسار عن / حجز العقار:\n*${this.property.title}*\n(كود: ${propertyCode})\n\n🔗 الرابط:\n${propertyUrl}`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  }
}
