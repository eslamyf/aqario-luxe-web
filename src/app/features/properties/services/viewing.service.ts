import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

// The viewing eligibility state for a property
export interface ViewingStatus {
  /** Whether the user is eligible to book this property */
  eligible: boolean;
  /**
   * null     → no viewing request submitted
   * pending  → request submitted, awaiting owner review
   * approved → owner approved the viewing
   * completed → viewing physically completed
   * rejected  → owner rejected
   * cancelled → user cancelled
   */
  viewingStatus: 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled' | null;
  viewingId: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ViewingService {
  private http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /**
   * Check if the current authenticated user is eligible to book a property.
   * Returns a "not eligible, no viewing" status for unauthenticated users.
   */
  checkViewingStatus(propertyId: string): Observable<ViewingStatus> {
    return this.http
      .get<any>(`${this.base}/viewing-requests/check-status/${propertyId}`)
      .pipe(
        map(res => res.data as ViewingStatus),
        catchError(() => of({
          eligible: false,
          viewingStatus: null,
          viewingId: null
        } as ViewingStatus))
      );
  }

  /**
   * Submit a viewing request for a property.
   */
  requestViewing(payload: {
    propertyId: string;
    preferredDate: string;
    preferredTime: string;
    message?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.base}/viewing-requests`, payload);
  }

  /**
   * Get the booking button display state based on viewing status.
   */
  getBookingState(status: ViewingStatus): 'locked' | 'pending' | 'eligible' {
    if (status.eligible) return 'eligible';
    if (status.viewingStatus === 'pending') return 'pending';
    return 'locked';
  }
}
