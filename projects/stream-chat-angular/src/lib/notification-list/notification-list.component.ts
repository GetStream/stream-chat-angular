import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { NotificationService } from '../notification.service';
import { NotificationPayload } from '../types';

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

  trackById(_: number, item: NotificationPayload) {
    return item.id;
  }

  getTemplateContext(notification: NotificationPayload) {
    return {
      ...notification.templateContext,
      dismissFn: notification.dismissFn,
    };
  }
}
