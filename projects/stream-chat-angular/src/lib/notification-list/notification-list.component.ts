import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { Notification, NotificationService } from '../notification.service';

@Component({
  selector: 'stream-notification-list',
  templateUrl: './notification-list.component.html',
  styles: [],
})
export class NotificationListComponent {
  notifications$: Observable<Notification[]>;

  constructor(private notificationService: NotificationService) {
    this.notifications$ = this.notificationService.notifications$;
  }

  trackByItem(_: number, item: Notification) {
    return item;
  }
}
