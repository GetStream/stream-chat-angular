import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type NotificationType = 'success' | 'error';

export type Notification = {
  type: NotificationType;
  text: string;
};

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  notifications$: Observable<Notification[]>;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);

  constructor() {
    this.notifications$ = this.notificationsSubject.asObservable();
  }

  addTemporaryNotification(
    text: string,
    type: NotificationType = 'error',
    timeout: number = 5000
  ) {
    this.addNotification(text, type);
    const id = setTimeout(() => this.removeNotification(text), timeout);

    return () => {
      clearTimeout(id);
      this.removeNotification(text);
    };
  }

  addPermanentNotification(text: string, type: NotificationType = 'error') {
    this.addNotification(text, type);

    return () => this.removeNotification(text);
  }

  private addNotification(text: string, type: NotificationType) {
    this.notificationsSubject.next([
      ...this.notificationsSubject.getValue(),
      { text, type },
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
