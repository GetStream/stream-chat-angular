import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { CustomTemplatesService } from '../custom-templates.service';
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

  constructor(
    public readonly customTemplatesService: CustomTemplatesService,
    private notificationService: NotificationService
  ) {
    this.notifications$ = this.notificationService.notifications$;
  }

  trackById(_: number, item: NotificationPayload) {
    return item.id;
  }

  getNotificationContentContext(notification: NotificationPayload) {
    return {
      ...notification.templateContext,
      dismissFn: notification.dismissFn,
    };
  }
}
