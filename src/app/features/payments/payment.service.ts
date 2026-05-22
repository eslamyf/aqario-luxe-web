import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

interface CheckoutResponse {
  status: string;
  data: {
    paymentId: string;
    paymentUrl?: string;
    url?: string;
    totalAmount?: number;
    platformFee?: number;
    currency?: string;
    expiresAt?: string;
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

export interface VerifyPaymentStatusResponse {
  status: string;
  data: {
    paid: boolean;
    paymentStatus: string;

    verified: boolean;
    transactionId: string | null;
    provider: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) { }

  /**
   * Create a checkout session.
   * @param bookingId The booking ID
   * @param provider The payment provider ('paymob', 'paypal', 'bank_transfer', etc.)
   */
  checkout(bookingId: string, provider: string = 'paymob'): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.apiUrl}/checkout`, {
      bookingId,
      paymentMethod: provider
    });
  }

  /**
   * Get payment status (for polling on success page)
   */
  getPaymentStatus(paymentId: string): Observable<PaymentStatusResponse> {
    return this.http.get<PaymentStatusResponse>(`${this.apiUrl}/${paymentId}`);
  }

  /**
   * Secure backend verification endpoint for the frontend success polling
   */
  verifyPaymentStatus(bookingId: string): Observable<VerifyPaymentStatusResponse> {
    return this.http.get<VerifyPaymentStatusResponse>(`${this.apiUrl}/verify/${bookingId}`);
  }
}
