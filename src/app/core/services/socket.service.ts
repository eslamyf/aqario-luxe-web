import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, EMPTY, of } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ─────────────────────────────────────────────────────────────────────────────
// SocketService — thin wrapper around socket.io-client
// Uses dynamic import() so it tree-shakes correctly in Angular builds
// Feature-flagged via isSocketEnabled to gracefully handle Serverless / Vercel
// ─────────────────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class SocketService {
  // Feature flag to control WebSockets (set to false for Vercel/Serverless environments)
  private isSocketEnabled: boolean = (environment as any)?.enableSockets ?? false;

  private socket: any = null;
  private socketPromise: Promise<any> | null = null;
  private socketSubject = new BehaviorSubject<any>(null);
  socket$ = this.socketSubject.asObservable();

  private get baseUrl(): string {
    return environment.apiUrl.replace('/api/v1', '');
  }

  connect(token: string): void {
    if (!this.isSocketEnabled) {
      console.info('[Socket] WebSockets are temporarily disabled.');
      return;
    }

    if (token) {
      localStorage.setItem('aqario_token', token);
    }
    if (this.socket?.connected || this.socketPromise) return;
    this.getSocket();
  }

  private getSocket(): Promise<any> {
    if (!this.isSocketEnabled) {
      console.info('[Socket] WebSockets are temporarily disabled.');
      return Promise.resolve(null);
    }

    if (this.socket) return Promise.resolve(this.socket);
    
    const token = localStorage.getItem('aqario_token');
    if (!token) {
      return Promise.resolve(null);
    }
    
    if (!this.socketPromise) {
      this.socketPromise = import('socket.io-client').then((socketIoClient: any) => {
        const io = socketIoClient.io ?? socketIoClient.default?.io ?? socketIoClient.default ?? socketIoClient;
        if (!this.isSocketEnabled) {
          return null;
        }

        this.socket = io(this.baseUrl, {
          auth: { token },
          withCredentials: true,
          transports: ['websocket', 'polling'],
          autoConnect: this.isSocketEnabled,
          reconnection: this.isSocketEnabled,
        });

        this.socket.on('connect', () => {
          // Connected successfully
        });

        this.socket.on('connect_error', (error: Error) => {
          console.warn('[Socket] connection error:', error?.message ?? error);
        });

        this.socketSubject.next(this.socket);
        return this.socket;
      }).catch((err) => {
        console.warn('[Socket] socket.io-client not available', err);
        return null;
      });
    }
    
    return this.socketPromise;
  }

  disconnect(): void {
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch {
        // Safe disconnect fallback
      }
      this.socket = null;
    }
    this.socketPromise = null;
    this.socketSubject.next(null);
  }

  updateTokenAndReconnect(newToken: string): void {
    if (!this.isSocketEnabled) {
      return;
    }

    if (newToken) {
      localStorage.setItem('aqario_token', newToken);
    }

    const triggerReconnect = (socketInstance: any) => {
      if (socketInstance && this.isSocketEnabled) {
        socketInstance.auth = { token: newToken };
        socketInstance.disconnect();
        socketInstance.connect();
      }
    };

    if (this.socket) {
      triggerReconnect(this.socket);
    } else if (this.socketPromise) {
      this.socketPromise.then((socketInstance) => {
        triggerReconnect(socketInstance);
      });
    } else {
      this.connect(newToken);
    }
  }

  onNotification(): Observable<any> {
    if (!this.isSocketEnabled) {
      return EMPTY;
    }

    return this.socket$.pipe(
      filter(socket => !!socket),
      switchMap(socket => {
        if (!socket || !this.isSocketEnabled) return EMPTY;
        return new Observable(subscriber => {
          const handler = (data: any) => subscriber.next(data);
          socket.on('notification', handler);
          return () => {
            if (socket) {
              socket.off('notification', handler);
            }
          };
        });
      })
    );
  }

  emit(event: string, data: any): void {
    if (!this.isSocketEnabled) {
      return;
    }

    if (this.socket) {
      this.socket.emit(event, data);
    } else if (this.socketPromise) {
      this.socketPromise.then((socketInstance) => {
        if (socketInstance && this.isSocketEnabled) {
          socketInstance.emit(event, data);
        }
      });
    }
  }
}
