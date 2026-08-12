import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';

// ── Backend response shapes ───────────────────────────────────────────────────
interface ApiResponse<T> {
  status: string;
  data?: T;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly base = environment.apiUrl;

  private readonly favoritesSubject = new BehaviorSubject<string[]>(this.getLocalFavorites());
  readonly favorites$ = this.favoritesSubject.asObservable();

  constructor() {
    // Listen for authentication changes to automatically load or clear user favorites
    this.authService.isAuthenticated$.subscribe(isAuth => {
      if (isAuth) {
        this.loadUserFavorites();
      } else {
        this.clearLocalFavorites();
      }
    });
  }

  // ── Sync with backend ──────────────────────────────────────────────────────
  loadUserFavorites(): void {
    if (!this.authService.isAuthenticated()) return;

    this.getFavorites().subscribe({
      next: (favorites) => {
        if (Array.isArray(favorites)) {
          const ids = favorites
            .map(f => f?.property_id?._id || f?.property_id || f?._id)
            .filter((id): id is string => typeof id === 'string');
          this.favoritesSubject.next(ids);
          this.saveLocalFavorites(ids);
        }
      },
      error: () => {}
    });
  }

  // ── Get all favorite properties ─────────────────────────────────────────────
  getFavorites(): Observable<any[]> {
    return this.http
      .get<ApiResponse<{ favorites: any[] }>>(`${this.base}/favorites`)
      .pipe(
        map(res => res.data?.favorites ?? []),
        catchError(() => of([]))
      );
  }

  /**
   * Toggle favorite (Optimistic Update for 0ms Latency UI)
   *  - Updates local state IMMEDIATELY before network request.
   *  - If network request fails, reverts local state.
   */
  toggleFavorite(propertyId: string): Observable<boolean> {
    const isCurrent = this.favoritesSubject.value.includes(propertyId);
    const newState = !isCurrent;

    // ⚡ Optimistically update state IMMEDIATELY (0ms delay)
    this.updateLocalState(propertyId, newState);

    if (isCurrent) {
      // Un-favourite → DELETE
      return this.http
        .delete<ApiResponse<null>>(`${this.base}/favorites/${propertyId}`)
        .pipe(
          map(() => false),
          catchError(err => {
            // Revert optimistic update on failure
            this.updateLocalState(propertyId, true);
            return throwError(() => err);
          })
        );
    } else {
      // Favourite → POST
      return this.http
        .post<ApiResponse<{ favorite: any }>>(`${this.base}/favorites`, { propertyId })
        .pipe(
          map(() => true),
          catchError(err => {
            // Revert optimistic update on failure
            this.updateLocalState(propertyId, false);
            return throwError(() => err);
          })
        );
    }
  }

  isFavorited$(propertyId: string): Observable<boolean> {
    return this.favorites$.pipe(
      map(favorites => favorites.includes(propertyId))
    );
  }

  isFavorited(propertyId: string): boolean {
    return this.favoritesSubject.value.includes(propertyId);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  private updateLocalState(propertyId: string, add: boolean): void {
    const current = this.favoritesSubject.value;
    const updated = add
      ? Array.from(new Set([...current, propertyId]))
      : current.filter(id => id !== propertyId);
    this.favoritesSubject.next(updated);
    this.saveLocalFavorites(updated);
  }

  private clearLocalFavorites(): void {
    this.favoritesSubject.next([]);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('aqario_favorites');
    }
  }

  private getLocalFavorites(): string[] {
    try {
      return JSON.parse(localStorage.getItem('aqario_favorites') ?? '[]');
    } catch {
      return [];
    }
  }

  private saveLocalFavorites(ids: string[]): void {
    try {
      localStorage.setItem('aqario_favorites', JSON.stringify(ids));
    } catch {}
  }
}
