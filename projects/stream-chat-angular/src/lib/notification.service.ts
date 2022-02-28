import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type NotificationType = 'success' | 'error';

export type NotificationPayload = {
  type: NotificationType;
  text: string;
  translateParams?: Object;
};

/**
 * The `NotificationService` can be used to add or remove notifications. By default the [`NotificationList`](../components/NotificationListComponent.mdx) component displays the currently active notifications.
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  /**
   * Emits the currently active [notifications](https://github.com/GetStream/stream-chat-angular/blob/master/projects/stream-chat-angular/src/lib/notification.service.ts).
   */
  notifications$: Observable<NotificationPayload[]>;
  private notificationsSubject = new BehaviorSubject<NotificationPayload[]>([]);

  constructor() {
    this.notifications$ = this.notificationsSubject.asObservable();
  }

  /**
   * Displays a notification for the given amount of time.
   * @param text The text of the notification
   * @param type The type of the notification
   * @param timeout The number of milliseconds while the notification should be visible
   * @param translateParams Translation parameters for the `text`
   * @returns A method to clear the notification (before the timeout).
   */
  addTemporaryNotification(
    text: string,
    type: NotificationType = 'error',
    timeout: number = 5000,
    translateParams?: Object
  ) {
    this.addNotification(text, type, translateParams);
    const id = setTimeout(() => this.removeNotification(text), timeout);

    return () => {
      clearTimeout(id);
      this.removeNotification(text);
    };
  }

  /**
   * Displays a notification, that will be visible until it's removed.
   * @param text The text of the notification
   * @param type The type of the notification
   * @param translateParams Translation parameters for the `text`
   * @returns A method to clear the notification.
   */
  addPermanentNotification(
    text: string,
    type: NotificationType = 'error',
    translateParams?: Object
  ) {
    this.addNotification(text, type, translateParams);

    return () => this.removeNotification(text);
  }

  private addNotification(
    text: string,
    type: NotificationType,
    translateParams?: Object
  ) {
    this.notificationsSubject.next([
      ...this.notificationsSubject.getValue(),
      { text, type, translateParams },
    ]);
  }

  private removeNotification(text: string) {
    const notifications = this.notificationsSubject.getValue();
    const index = notifications.findIndex((n) => n.text === text);
    if (index === -1) {
      return;
    }
    notifications.splice(index, 1);
    this.notificationsSubject.next([...notifications]);
  }
}
