import { Injectable } from '@angular/core';
import { Observable, fromEvent, EMPTY } from 'rxjs';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ─────────────────────────────────────────────────────────────────────────────
// SocketService — thin wrapper around socket.io-client
// Uses dynamic import() so it tree-shakes correctly in Angular builds
// ─────────────────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: any = null;
  private socketPromise: Promise<any> | null = null;
  private readonly baseUrl = environment.apiUrl.replace('/api/v1', '');

  connect(token: string): void {
    if (this.socket?.connected || this.socketPromise) return;
    this.getSocket(token);
  }

  private getSocket(token?: string): Promise<any> {
    if (this.socket) return Promise.resolve(this.socket);
    
    if (!this.socketPromise) {
      this.socketPromise = import('socket.io-client').then(({ io }) => {
        this.socket = io(this.baseUrl, {
          auth: (cb) => cb({ token: localStorage.getItem('luxe_token') }),
          withCredentials: true,
          transports:      ['websocket', 'polling'],
        });

        this.socket.on('connect', () => {
          console.log('[Socket] connected');
        });

        this.socket.on('connect_error', (error: Error) => {
          console.warn('[Socket] connection error:', error?.message ?? error);
        });

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
  }


  onNotification(): Observable<any> {
    return new Observable(subscriber => {
      let socketRef: any = null;
      const handler = (data: any) => subscriber.next(data);

      this.getSocket().then(socket => {
        if (!socket) return;
        socketRef = socket;
        socket.on('notification', handler);
      });

      return () => {
        if (socketRef) socketRef.off('notification', handler);
      };
    });
  }
}
