import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DashboardUiService {
  private sidebarOpen$ = new BehaviorSubject<boolean>(false);
  private isDashboardRoute$ = new BehaviorSubject<boolean>(false);

  constructor(private router: Router) {
    // Watch route changes to determine if we're in a dashboard
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url;
      this.isDashboardRoute$.next(url.includes('/dashboard') || url.includes('/admin'));
    });
  }

  get sidebarOpen(): Observable<boolean> {
    return this.sidebarOpen$.asObservable();
  }

  get isDashboardRoute(): Observable<boolean> {
    return this.isDashboardRoute$.asObservable();
  }

  toggleSidebar(): void {
    this.sidebarOpen$.next(!this.sidebarOpen$.value);
  }

  closeSidebar(): void {
    this.sidebarOpen$.next(false);
  }

  openSidebar(): void {
    this.sidebarOpen$.next(true);
  }
}
