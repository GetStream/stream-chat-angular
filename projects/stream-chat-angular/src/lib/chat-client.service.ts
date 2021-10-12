import { ApplicationRef, Injectable, NgZone } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';
import { Event, StreamChat } from 'stream-chat';

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
  private notificationSubject = new ReplaySubject<Notification>(1);

  constructor(private ngZone: NgZone, private appRef: ApplicationRef) {
    this.notification$ = this.notificationSubject;
  }

  async init(apiKey: string, userId: string, userToken: string) {
    this.chatClient = StreamChat.getInstance(apiKey);
    await this.ngZone.runOutsideAngular(
      async () => await this.chatClient.connectUser({ id: userId }, userToken)
    );
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
  }
}
