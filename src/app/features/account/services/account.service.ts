import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: string;
  photo?: string;
  phone?: string;
  bio?: string;
  isVerified: boolean;
  kycStatus: string;
}

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private authService = inject(AuthService);
  private userSubject = new BehaviorSubject<UserProfile | null>(null);
  user$ = this.userSubject.asObservable();

  setUserData(user: UserProfile | null): void {
    this.userSubject.next(user);
    if (user) {
      // Sync with global auth state so Navbar and Admin Sidebar update immediately
      const currentUser = this.authService.getCurrentUser<any>();
      if (currentUser) {
        // Update the photo and name without touching sensitive data like tokens
        this.authService.setCurrentUser({
          ...currentUser,
          photo: user.photo,
          name: user.name
        });
        
        // Also update localStorage so it persists on refresh
        const mergedUser = { ...currentUser, photo: user.photo, name: user.name };
        localStorage.setItem('aqario_user', JSON.stringify(mergedUser));
      }
    }
  }

  getCurrentUser(): UserProfile | null {
    return this.userSubject.value;
  }

  getMe(): Observable<{ status: string, data: { user: UserProfile, dashboard: any } }> {
    return this.http.get<any>(`${this.apiUrl}/users/me`);
  }

  getKycStatus(): Observable<{ status: string, data: { kycStatus: string } }> {
    return this.http.get<any>(`${this.apiUrl}/kyc/status`);
  }

  updateProfile(data: FormData | Partial<UserProfile>): Observable<any> {
    // If data is FormData (containing photo), the backend handles it via updateMe middleware
    return this.http.patch<any>(`${this.apiUrl}/users/me`, data);
  }

  changePassword(data: any): Observable<any> {
    // Backend endpoint is /users/change-password
    return this.http.patch<any>(`${this.apiUrl}/users/change-password`, data);
  }
}
