import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

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
  private readonly base = environment.apiUrl;

  private readonly favoritesSubject = new BehaviorSubject<string[]>(this.getLocalFavorites());
  readonly favorites$ = this.favoritesSubject.asObservable();

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
   * Toggle favorite:
   *  - If currently favorited → DELETE /favorites/:propertyId
   *  - If not favorited       → POST  /favorites { propertyId }
   *
   * Backend:
   *  POST   → 201 { status: 'success', message: '...', data: { favorite } }
   *  DELETE → 200 { status: 'success', message: '...' }
   */
  toggleFavorite(propertyId: string): Observable<boolean> {
    const isCurrent = this.favoritesSubject.value.includes(propertyId);

    if (isCurrent) {
      // Un-favourite → DELETE
      return this.http
        .delete<ApiResponse<null>>(`${this.base}/favorites/${propertyId}`)
        .pipe(
          map(() => false),
          tap(() => this.updateLocalState(propertyId, false)),
          catchError(() => {
            // Optimistic rollback failed — do nothing, keep current state
            return of(false);
          })
        );
    } else {
      // Favourite → POST
      return this.http
        .post<ApiResponse<{ favorite: any }>>(`${this.base}/favorites`, { propertyId })
        .pipe(
          // Backend returns { status:'success', data:{ favorite } } — not a boolean
          map(() => true),
          tap(() => this.updateLocalState(propertyId, true)),
          catchError(() => {
            // Optimistic local-only toggle when offline
            this.updateLocalState(propertyId, true);
            return of(true);
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
      ? [...current, propertyId]
      : current.filter(id => id !== propertyId);
    this.favoritesSubject.next(updated);
    this.saveLocalFavorites(updated);
  }

  private getLocalFavorites(): string[] {
    try {
      return JSON.parse(localStorage.getItem('aqario_favorites') ?? '[]');
    } catch {
      return [];
    }
  }

  private saveLocalFavorites(ids: string[]): void {
    localStorage.setItem('aqario_favorites', JSON.stringify(ids));
  }
}
