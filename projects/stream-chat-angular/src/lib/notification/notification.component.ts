import { Component, Input } from '@angular/core';
import { NotificationType } from '../types';

/**
 * The `Notification` component displays a notification within the [`NotificationList`](./NotificationListComponent.mdx)
 */
@Component({
  selector: 'stream-notification',
  templateUrl: './notification.component.html',
  styles: [],
})
export class NotificationComponent {
  /**
   * The type of the notification
   */
  @Input() type: NotificationType | undefined;

  constructor() {}
}
