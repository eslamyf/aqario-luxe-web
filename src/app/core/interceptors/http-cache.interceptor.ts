import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

interface CacheEntry {
  response: HttpResponse<any>;
  expiry: number;
}

@Injectable()
export class HttpCacheInterceptor implements HttpInterceptor {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 30000; // 30 seconds client-side cache for GET requests

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only cache GET requests for public API endpoints
    if (req.method !== 'GET' || !req.url.includes('/api/v1/properties')) {
      return next.handle(req);
    }

    // Do not cache authenticated requests (e.g. user profile / favorites)
    if (req.headers.has('Authorization')) {
      return next.handle(req);
    }

    const cacheKey = req.urlWithParams;
    const cachedEntry = this.cache.get(cacheKey);
    const now = Date.now();

    if (cachedEntry && cachedEntry.expiry > now) {
      return of(cachedEntry.response.clone());
    }

    return next.handle(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse && event.status === 200) {
          this.cache.set(cacheKey, {
            response: event.clone(),
            expiry: now + this.TTL_MS,
          });
        }
      })
    );
  }

  /**
   * Clear cache manually on mutating operations
   */
  clearCache(): void {
    this.cache.clear();
  }
}
