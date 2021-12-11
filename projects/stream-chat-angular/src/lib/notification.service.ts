import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type NotificationType = 'success' | 'error';

export type NotificationPayload = {
  type: NotificationType;
  text: string;
  translateParams?: Object;
};

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  notifications$: Observable<NotificationPayload[]>;
  private notificationsSubject = new BehaviorSubject<NotificationPayload[]>([]);

  constructor() {
    this.notifications$ = this.notificationsSubject.asObservable();
  }

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
