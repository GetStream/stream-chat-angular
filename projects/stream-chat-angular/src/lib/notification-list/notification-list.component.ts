import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { CustomTemplatesService } from '../custom-templates.service';
import { NotificationService } from '../notification.service';
import { ThemeService } from '../theme.service';
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
  themeVersion: '1' | '2';
  theme$: Observable<string>;

  constructor(
    public readonly customTemplatesService: CustomTemplatesService,
    private notificationService: NotificationService,
    private themeService: ThemeService
  ) {
    this.notifications$ = this.notificationService.notifications$;
    this.theme$ = this.themeService.theme$;
    this.themeVersion = this.themeService.themeVersion;
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
