import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, switchMap, shareReplay, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export type KYCStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

export interface KYCStatusResponse {
  success: boolean;
  status: KYCStatus;
  reason?: string;
  ownershipDocuments?: KYCOwnershipDoc[];
}

export interface BackendKYCResponse {
  status: string;
  data: {
    kycStatus: KYCStatus;
    rejectionReason?: string;
    submitted?: boolean;
    approved?: boolean;
  }
}

export interface KYCOwnershipDoc {
  _id?: string;           // MongoDB subdocument ID
  fileUrl?: string;
  imageUrl?: string;
  fileName?: string;
  fileType?: 'image' | 'pdf' | 'doc';
  isTemporary?: boolean;
  uploadedAt?: string;
}

export interface KYCSubmission {
  documentType: 'national_id' | 'passport' | 'drivers_license';
  frontImage: string;
  backImage?: string;
  ownershipDocuments?: string[];
  /** Phase 2 — Personal Info & Liveness */
  nationality?: string;
  phoneNumber?: string;
  livePhoto?: string;
}

export interface FullKYCResponse {
  status: string;
  data: {
    user: {
      name: string;
      email: string;
      photo?: string;
      kycStatus: KYCStatus;
    };
    kycInfo: {
      status: KYCStatus;
      documentcount: number;
      version: number;
      documents: any[];
      ownershipDocuments: KYCOwnershipDoc[];
      submittedAt?: string;
      approvedAt?: string;
      rejectionReason?: string;
      nationality?: string;
      phoneNumber?: string;
      livePhoto?: string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class KycService {
  private http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  uploadImage(file: File): Observable<{ success: boolean; url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ status: string; data: { url: string } }>(`${this.base}/kyc/upload`, formData).pipe(
      map(res => ({
        success: res.status === 'success',
        url: res.data.url
      }))
    );
  }

  /**
   * Submit the KYC documents
   */
  submitKYC(data: KYCSubmission): Observable<any> {
    return this.http.post(`${this.base}/kyc`, data);
  }

  /**
   * Upload a single ownership document (PDF/image) → saved to DB immediately
   */
  uploadOwnershipFile(file: File): Observable<{ status: string; data: { document: KYCOwnershipDoc; index: number; total: number } }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.base}/kyc/ownership/upload`, formData);
  }

  /**
   * Delete an ownership document by its MongoDB _id
   */
  deleteOwnershipFile(docId: string): Observable<{ status: string; data: { remaining: number } }> {
    return this.http.delete<any>(`${this.base}/kyc/ownership/${docId}`);
  }

  /**
   * Delete identity documents (front/back/passport) from DB
   */
  deleteIdentityDocument(): Observable<any> {
    return this.http.delete<any>(`${this.base}/kyc/identity-document`);
  }

  getKYCStatus(): Observable<KYCStatusResponse> {
    return this.http.get<BackendKYCResponse>(`${this.base}/kyc/status`).pipe(
      map(res => ({
        success: res.status === 'success',
        status: res.data.kycStatus,
        reason: res.data.rejectionReason
      }))
    );
  }

  /**
   * Consolidated Source of Truth: Fetch everything in one go
   * Polling also uses this to ensure consistency
   */
  pollFullData(): Observable<FullKYCResponse> {
    return timer(0, 30000).pipe(
      switchMap(() => this.getMyKYCData()),
      shareReplay(1)
    );
  }

  /**
   * Get full KYC data including ownership documents
   */
  getMyKYCData(): Observable<FullKYCResponse> {
    return this.http.get<FullKYCResponse>(`${this.base}/kyc/me`);
  }
}
