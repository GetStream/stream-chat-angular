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

/**
 * The `ChatClient` service connects the user to the Stream chat.
 */
@Injectable({
  providedIn: 'root',
})
export class ChatClientService {
  /**
   * The [StreamChat client](https://github.com/GetStream/stream-chat-js/blob/master/src/client.ts) instance. In general you shouldn't need to access the client, but it's there if you want to use it.
   */
  chatClient!: StreamChat;
  /**
   * Emits [`Notification`](https://github.com/GetStream/stream-chat-angular/blob/master/projects/stream-chat-angular/src/lib/chat-client.service.ts) events. The platform documentation covers [the list of client and notification events](https://getstream.io/chat/docs/javascript/event_object/?language=javascript).
   * :::important
   * For performance reasons this Observable operates outside of the Angular change detection zone. If you subscribe to it, you need to manually reenter Angular's change detection zone, our [Change detection guide](../concepts/change-detection.mdx) explains this in detail.
   * :::
   */
  notification$: Observable<Notification>;
  /**
   * Emits the current [application settings](https://getstream.io/chat/docs/javascript/app_setting_overview/?language=javascript). Since getting the application settings is an expensive API call and we don't always need the result, this is not initialized by default, you need to call `getApplicationSettings` to load them.
   */
  appSettings$: Observable<AppSettings | undefined>;
  /**
   * Emits the current connection state of the user (`online` or `offline`)
   */
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

  /**
   * Creates a [`StreamChat`](https://github.com/GetStream/stream-chat-js/blob/668b3e5521339f4e14fc657834531b4c8bf8176b/src/client.ts#L124) instance using the provided `apiKey`, and connects a user with the given meta data and token. More info about [connecting users](https://getstream.io/chat/docs/javascript/init_and_users/?language=javascript) can be found in the platform documentation.
   * @param apiKey
   * @param userOrId
   * @param userTokenOrProvider
   */
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

  /**
   * Disconnects the current user, and closes the WebSocket connection. Useful when disconnecting a chat user, use in combination with [`reset`](./ChannelService.mdx/#reset).
   */
  async disconnectUser() {
    await this.chatClient.disconnectUser();
  }

  /**
   * Loads the current [application settings](https://getstream.io/chat/docs/javascript/app_setting_overview/?language=javascript), if the application settings have already been loaded, it does nothing.
   */
  async getAppSettings() {
    if (this.appSettingsSubject.getValue()) {
      return;
    }
    const settings = await this.chatClient.getAppSettings();
    this.appSettingsSubject.next(settings.app || {});
  }

  /**
   * Flag the message with the given ID. If you want to know [more about flags](https://getstream.io/chat/docs/javascript/moderation/?language=javascript) check out the platform documentation.
   * @param messageId
   */
  async flagMessage(messageId: string) {
    await this.chatClient.flagMessage(messageId);
  }

  /**
   * Searches for users in the application that have ID or name matching the provided search term
   * @param searchTerm
   * @returns The users matching the search
   */
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
