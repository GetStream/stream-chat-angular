import { Component, Input, TemplateRef } from '@angular/core';
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
  /**
   * The content of the notification (can also be provided using `ng-content`)
   */
  @Input() content: TemplateRef<void> | undefined;

  constructor() {}
}
