import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  NotificationService,
  Notification,
} from '../services/notification.service';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: (Notification & { visible: boolean })[] = [];
  private subs = new Subscription();

  constructor(
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.notificationService.notifications$.subscribe((n) => {
        this.notifications.push({ ...n, visible: true });
        this.cdr.markForCheck();
      })
    );

    this.subs.add(
      this.notificationService.dismiss$.subscribe((id) => {
        const item = this.notifications.find((n) => n.id === id);
        if (item) {
          item.visible = false;
          this.cdr.markForCheck();
          // Remove from array after animation
          setTimeout(() => {
            this.notifications = this.notifications.filter((n) => n.id !== id);
            this.cdr.markForCheck();
          }, 400);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  dismiss(id: number): void {
    this.notificationService.dismiss(id);
  }

  trackById(_: number, item: Notification): number {
    return item.id;
  }
}
