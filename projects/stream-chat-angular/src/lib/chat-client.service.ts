import { ApplicationRef, Injectable, NgZone } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';
import { Event, StreamChat } from 'stream-chat';
import { version } from '../assets/version';
import { NotificationService } from './notification.service';

export type Notification = {
  eventType:
    | 'notification.added_to_channel'
    | 'notification.message_new'
    | 'notification.removed_from_channel';
  event: Event;
};

@Injectable({
  providedIn: 'root',
})
export class ChatClientService {
  chatClient!: StreamChat;
  notification$: Observable<Notification>;
  connectionState$: Observable<'offline' | 'online'>;
  private notificationSubject = new ReplaySubject<Notification>(1);
  private connectionStateSubject = new ReplaySubject<'offline' | 'online'>(1);

  constructor(
    private ngZone: NgZone,
    private appRef: ApplicationRef,
    private notificationService: NotificationService
  ) {
    this.notification$ = this.notificationSubject.asObservable();
    this.connectionState$ = this.connectionStateSubject.asObservable();
  }

  async init(apiKey: string, userId: string, userToken: string) {
    this.chatClient = StreamChat.getInstance(apiKey);
    await this.ngZone.runOutsideAngular(async () => {
      await this.chatClient.connectUser({ id: userId }, userToken);
      this.chatClient.setUserAgent(
        `stream-chat-angular-${version}-${this.chatClient.getUserAgent()}`
      );
    });
    this.chatClient.on('notification.added_to_channel', (e) => {
      this.notificationSubject.next({
        eventType: 'notification.added_to_channel',
        event: e,
      });
      this.appRef.tick();
    });
    this.chatClient.on('notification.message_new', (e) => {
      this.notificationSubject.next({
        eventType: 'notification.message_new',
        event: e,
      });
      this.appRef.tick();
    });
    this.chatClient.on('notification.removed_from_channel', (e) => {
      this.notificationSubject.next({
        eventType: 'notification.removed_from_channel',
        event: e,
      });
      this.appRef.tick();
    });
    let removeNotification: undefined | Function;
    this.chatClient.on('connection.changed', (e) => {
      const isOnline = e.online;
      if (isOnline) {
        if (removeNotification) {
          removeNotification();
        }
      } else {
        removeNotification = this.notificationService.addPermanentNotification(
          'streamChat.Connection failure, reconnecting now...'
        );
      }
      this.connectionStateSubject.next(isOnline ? 'online' : 'offline');
      this.appRef.tick();
    });
  }

  async flagMessage(messageId: string) {
    await this.chatClient.flagMessage(messageId);
  }
}
