import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, fromEvent, EMPTY } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ─────────────────────────────────────────────────────────────────────────────
// SocketService — thin wrapper around socket.io-client
// Uses dynamic import() so it tree-shakes correctly in Angular builds
// ─────────────────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: any = null;
  private socketPromise: Promise<any> | null = null;
  private socketSubject = new BehaviorSubject<any>(null);
  socket$ = this.socketSubject.asObservable();
  private get baseUrl(): string {
    return environment.apiUrl.replace('/api/v1', '');
  }

  connect(token: string): void {
    if (token) {
      localStorage.setItem('aqario_token', token);
    }
    if (this.socket?.connected || this.socketPromise) return;
    this.getSocket();
  }

  private getSocket(): Promise<any> {
    if (this.socket) return Promise.resolve(this.socket);
    
    const token = localStorage.getItem('aqario_token');
    if (!token) {
      return Promise.resolve(null);
    }
    
    if (!this.socketPromise) {
      this.socketPromise = import('socket.io-client').then(({ io }) => {
        this.socket = io(this.baseUrl, {
          auth: { token },
          withCredentials: true,
          transports:      ['websocket', 'polling'],
        });

        this.socket.on('connect', () => {
          console.log('[Socket] connected');
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
      this.socket.disconnect();
      this.socket = null;
    }
    this.socketPromise = null;
    this.socketSubject.next(null);
  }

  updateTokenAndReconnect(newToken: string): void {
    if (newToken) {
      localStorage.setItem('aqario_token', newToken);
    }

    const triggerReconnect = (socketInstance: any) => {
      if (socketInstance) {
        socketInstance.auth = { token: newToken };
        socketInstance.disconnect();
        socketInstance.connect();
        console.log('[Socket] Reconnected with fresh token');
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
    return this.socket$.pipe(
      filter(socket => !!socket),
      switchMap(socket => {
        return new Observable(subscriber => {
          const handler = (data: any) => subscriber.next(data);
          socket.on('notification', handler);
          return () => {
            socket.off('notification', handler);
          };
        });
      })
    );
  }
}
