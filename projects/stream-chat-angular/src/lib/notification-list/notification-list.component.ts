import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import {
  NotificationPayload,
  NotificationService,
} from '../notification.service';

/**
 * The `NotificationList` component displays the list of active notifications.
 */
@Component({
  selector: 'stream-notification-list',
  templateUrl: './notification-list.component.html',
  styles: [],
})
export class NotificationListComponent {
  notifications$: Observable<NotificationPayload[]>;

  constructor(private notificationService: NotificationService) {
    this.notifications$ = this.notificationService.notifications$;
  }

  trackByItem(_: number, item: NotificationPayload) {
    return item;
  }
}
