import { Injectable, TemplateRef } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { NotificationPayload, NotificationType } from './types';

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
   * @param content The text of the notification or the HTML template for the notification
   * @param type The type of the notification
   * @param timeout The number of milliseconds while the notification should be visible
   * @param translateParams Translation parameters for the `content` (for text notifications)
   * @param templateContext The input of the notification template (for HTML notifications)
   * @returns A method to clear the notification (before the timeout).
   */
  addTemporaryNotification<T>(
    content: string | TemplateRef<T>,
    type: NotificationType = 'error',
    timeout: number = 5000,
    translateParams?: Object,
    templateContext?: T
  ) {
    const notification = this.createNotification<T>(
      content,
      type,
      translateParams,
      templateContext
    );
    const id = setTimeout(
      () => this.removeNotification(notification.id),
      timeout
    );
    notification.dismissFn = () => {
      clearTimeout(id);
      this.removeNotification(notification.id);
    };
    this.notificationsSubject.next([
      ...this.notificationsSubject.getValue(),
      notification,
    ]);

    return notification.dismissFn;
  }

  /**
   * Displays a notification, that will be visible until it's removed.
   * @param content The text of the notification or the HTML template for the notification
   * @param type The type of the notification
   * @param translateParams Translation parameters for the `content` (for text notifications)
   * @param templateContext The input of the notification template (for HTML notifications)
   * @returns A method to clear the notification.
   */
  addPermanentNotification<
    T = {
      [key: string]: any;
      dismissFn: () => {};
    }
  >(
    content: string | TemplateRef<T>,
    type: NotificationType = 'error',
    translateParams?: Object,
    templateContext?: T
  ) {
    const notification = this.createNotification<T>(
      content,
      type,
      translateParams,
      templateContext
    );
    this.notificationsSubject.next([
      ...this.notificationsSubject.getValue(),
      notification,
    ]);

    return notification.dismissFn;
  }

  private createNotification<T>(
    content: string | TemplateRef<T>,
    type: NotificationType,
    translateParams?: Object,
    templateContext?: T
  ) {
    const id = new Date().getTime().toString() + Math.random().toString();
    return {
      id,
      [typeof content === 'string' ? 'text' : 'template']: content,
      type,
      translateParams,
      templateContext,
      dismissFn: () => this.removeNotification(id),
    };
  }

  private removeNotification(id: string) {
    const notifications = this.notificationsSubject.getValue();
    const index = notifications.findIndex((n) => n.id === id);
    if (index === -1) {
      return;
    }
    notifications.splice(index, 1);
    this.notificationsSubject.next([...notifications]);
  }
}
