import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

interface CheckoutResponse {
  status: string;
  data: {
    paymentId: string;
    url: string;
    amount: number;
    platformFee: number;
    currency: string;
    expiresAt: string;
    existing?: boolean;
  };
}

interface PaymentStatusResponse {
  status: string;
  data: {
    paymentId: string;
    status: string;
    totalAmount: number;
    netAmount: number;
    platformFee: number;
    paymentMethod: string;
    transactionId: string;
    expiresAt: string;
    verifiedAt: string;
    createdAt: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) {}

  /**
   * Create a checkout session.
   * @param bookingId The booking ID
   * @param provider The payment provider ('stripe' or 'paymob')
   */
  checkout(bookingId: string, provider: 'stripe' | 'paymob' = 'stripe'): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.apiUrl}/checkout`, {
      bookingId,
      provider
    });
  }

  /**
   * Get payment status (for polling on success page)
   */
  getPaymentStatus(paymentId: string): Observable<PaymentStatusResponse> {
    return this.http.get<PaymentStatusResponse>(`${this.apiUrl}/${paymentId}`);
  }
}
