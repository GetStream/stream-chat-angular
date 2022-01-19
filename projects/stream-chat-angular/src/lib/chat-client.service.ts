import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import { OwnUserResponse, UserResponse } from 'stream-chat';
import { AppSettings, Event, StreamChat, TokenOrProvider } from 'stream-chat';
import { version } from '../assets/version';
import { NotificationService } from './notification.service';

export type Notification = {
  eventType: string;
  event: Event;
};

@Injectable({
  providedIn: 'root',
})
export class ChatClientService {
  chatClient!: StreamChat;
  notification$: Observable<Notification>;
  appSettings$: Observable<AppSettings | undefined>;
  connectionState$: Observable<'offline' | 'online'>;
  private notificationSubject = new ReplaySubject<Notification>(1);
  private connectionStateSubject = new ReplaySubject<'offline' | 'online'>(1);
  private appSettingsSubject = new BehaviorSubject<AppSettings | undefined>(
    undefined
  );

  constructor(
    private ngZone: NgZone,
    private notificationService: NotificationService
  ) {
    this.notification$ = this.notificationSubject.asObservable();
    this.connectionState$ = this.connectionStateSubject.asObservable();
    this.appSettings$ = this.appSettingsSubject.asObservable();
  }

  async init(
    apiKey: string,
    userOrId: string | OwnUserResponse | UserResponse,
    userTokenOrProvider: TokenOrProvider
  ) {
    this.chatClient = StreamChat.getInstance(apiKey);
    await this.ngZone.runOutsideAngular(async () => {
      const user = typeof userOrId === 'string' ? { id: userOrId } : userOrId;
      await this.chatClient.connectUser(user, userTokenOrProvider);
      this.chatClient.setUserAgent(
        `stream-chat-angular-${version}-${this.chatClient.getUserAgent()}`
      );
      this.chatClient.getAppSettings;
    });
    this.appSettingsSubject.next(undefined);
    this.chatClient.on((e) => {
      this.notificationSubject.next({
        eventType: e.type,
        event: e,
      });
    });
    let removeNotification: undefined | Function;
    this.chatClient.on('connection.changed', (e) => {
      this.ngZone.run(() => {
        const isOnline = e.online;
        if (isOnline) {
          if (removeNotification) {
            removeNotification();
          }
        } else {
          removeNotification =
            this.notificationService.addPermanentNotification(
              'streamChat.Connection failure, reconnecting now...'
            );
        }
        this.connectionStateSubject.next(isOnline ? 'online' : 'offline');
      });
    });
  }

  async disconnectUser() {
    await this.chatClient.disconnectUser();
  }

  async getAppSettings() {
    if (this.appSettingsSubject.getValue()) {
      return;
    }
    const settings = await this.chatClient.getAppSettings();
    this.appSettingsSubject.next(settings.app || {});
  }

  async flagMessage(messageId: string) {
    await this.chatClient.flagMessage(messageId);
  }

  async autocompleteUsers(searchTerm: string) {
    if (!searchTerm) {
      return [];
    }
    const result = await this.chatClient.queryUsers({
      $or: [
        { id: { $autocomplete: searchTerm } },
        { name: { $autocomplete: searchTerm } },
      ],
      id: { $ne: this.chatClient.userID! },
    });
    return result.users;
  }
}
