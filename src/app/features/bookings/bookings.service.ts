import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BookingRequest {
  propertyId: string;
  start_date: string;
  end_date: string;
  amount: number;
}

@Injectable({
  providedIn: 'root'
})
export class BookingsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/bookings`;

  createBooking(req: BookingRequest): Observable<any> {
    return this.http.post<any>(this.apiUrl, req, { withCredentials: true });
  }

  getMyBookings(): Observable<any> {
    return this.http.get<any>(this.apiUrl, { withCredentials: true });
  }

  cancelBooking(id: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/cancel`, {}, { withCredentials: true });
  }

  // ── Owner / Agent Booking Methods ─────────────────────────────────────────

  getOwnerBookings(page: number = 1, limit: number = 20): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/owner`, { 
      params: { page: page.toString(), limit: limit.toString() },
      withCredentials: true 
    });
  }

  approveBooking(id: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/approve`, {}, { withCredentials: true });
  }

  rejectBooking(id: string, reason?: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/reject`, { reason }, { withCredentials: true });
  }
}
