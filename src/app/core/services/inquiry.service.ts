import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface InquiryPayload {
  propertyId: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class InquiryService {
  private http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /**
   * Send an inquiry about a property.
   * Backend requires: propertyId, message (min 5 chars)
   */
  makeInquiry(propertyId: string, message: string): Observable<boolean> {
    const payload: InquiryPayload = { propertyId, message };
    return this.http
      .post<void>(`${this.base}/inquiries`, payload)
      .pipe(map(() => true));
  }
}
