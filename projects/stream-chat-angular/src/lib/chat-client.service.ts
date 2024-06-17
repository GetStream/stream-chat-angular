import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import {
  Channel,
  ChannelFilters,
  ChannelResponse,
  ConnectAPIResponse,
  OwnUserResponse,
  StreamChatOptions,
  UserFilters,
  UserResponse,
} from 'stream-chat';
import { AppSettings, Event, StreamChat, TokenOrProvider } from 'stream-chat';
import { version } from '../assets/version';
import { NotificationService } from './notification.service';
import { DefaultStreamChatGenerics } from './types';
import { take } from 'rxjs/operators';

export type ClientEvent<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> = {
  eventType: string;
  event: Event<T>;
};

/**
 * The `ChatClient` service connects the user to the Stream chat.
 */
@Injectable({
  providedIn: 'root',
})
export class ChatClientService<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> {
  /**
   * The [StreamChat client](https://github.com/GetStream/stream-chat-js/blob/master/src/client.ts) instance. In general you shouldn't need to access the client, but it's there if you want to use it.
   */
  chatClient!: StreamChat<T>;
  /**
   * Emits [`ClientEvent`](https://github.com/GetStream/stream-chat-angular/blob/master/projects/stream-chat-angular/src/lib/chat-client.service.ts) events. The platform documentation covers [the list of client, user presence and notification events](https://getstream.io/chat/docs/javascript/event_object/?language=javascript).
   * :::important
   * For performance reasons this Observable operates outside of the Angular change detection zone. If you subscribe to it, you need to manually reenter Angular's change detection zone, our [Change detection guide](../concepts/change-detection.mdx) explains this in detail.
   * :::
   */
  events$: Observable<ClientEvent<T>>;
  /**
   * Emits the current [application settings](https://getstream.io/chat/docs/javascript/app_setting_overview/?language=javascript). Since getting the application settings is an expensive API call and we don't always need the result, this is not initialized by default, you need to call `getApplicationSettings` to load them.
   */
  appSettings$: Observable<AppSettings | undefined>;
  /**
   * Emits the current connection state of the user (`online` or `offline`)
   */
  connectionState$: Observable<'offline' | 'online'>;
  /**
   * Emits the list of pending invites of the user. It emits every pending invitation during initialization and then extends the list when a new invite is received. More information can be found in the [channel invitations](../code-examples/channel-invites.mdx) guide.
   */
  pendingInvites$: Observable<(ChannelResponse<T> | Channel<T>)[]>;
  /**
   * Emits the current chat user
   */
  user$: Observable<OwnUserResponse<T> | UserResponse<T> | undefined>;
  private notificationSubject = new ReplaySubject<ClientEvent<T>>(1);
  private connectionStateSubject = new ReplaySubject<'offline' | 'online'>(1);
  private appSettingsSubject = new BehaviorSubject<AppSettings | undefined>(
    undefined
  );
  private pendingInvitesSubject = new BehaviorSubject<
    (ChannelResponse<T> | Channel<T>)[]
  >([]);
  private userSubject = new ReplaySubject<
    OwnUserResponse<T> | UserResponse<T> | undefined
  >(1);
  private subscriptions: { unsubscribe: () => void }[] = [];
  private trackPendingChannelInvites = true;

  constructor(
    private ngZone: NgZone,
    private notificationService: NotificationService
  ) {
    this.events$ = this.notificationSubject.asObservable();
    this.connectionState$ = this.connectionStateSubject.asObservable();
    this.appSettings$ = this.appSettingsSubject.asObservable();
    this.pendingInvites$ = this.pendingInvitesSubject.asObservable();
    this.user$ = this.userSubject.asObservable();
  }

  /**
   * Creates a [`StreamChat`](https://github.com/GetStream/stream-chat-js/blob/668b3e5521339f4e14fc657834531b4c8bf8176b/src/client.ts#L124) instance using the provided `apiKey`, and connects a user with the given meta data and token. More info about [connecting users](https://getstream.io/chat/docs/javascript/init_and_users/?language=javascript) can be found in the platform documentation.
   * @param apiKey
   * @param userOrId you can emit this for anonymous logins
   * @param userTokenOrProvider You can provide:<ul>
   *  <li> a token, </li>
   *  <li> a token provider, a method that returns `Promise<string>`, which can be called when the previous token expires (recommended setup for production applications)</li>
   *  <li> the keyword 'guest' to connect as [guest user](https://getstream.io/chat/docs/javascript/authless_users/?language=javascript#guest-users) </li>
   *  <li> the keyword 'anonymous' to connect as [anonymous user](https://getstream.io/chat/docs/javascript/authless_users/?language=javascript#anonymous-users) </li>
   *  </ul>
   * @param clientOptions Setting to provide to the Stream client instance
   */
  async init(
    apiKey: string,
    userOrId: string | OwnUserResponse<T> | UserResponse<T> | undefined,
    userTokenOrProvider: TokenOrProvider | 'anonymous' | 'guest',
    clientOptions?: StreamChatOptions & { trackPendingChannelInvites?: boolean }
  ): ConnectAPIResponse<T> {
    this.trackPendingChannelInvites =
      clientOptions?.trackPendingChannelInvites !== false;
    this.chatClient = StreamChat.getInstance<T>(apiKey, clientOptions);
    this.chatClient.recoverStateOnReconnect = false;
    this.chatClient.devToken;
    let result;
    await this.ngZone.runOutsideAngular(async () => {
      const user = typeof userOrId === 'string' ? { id: userOrId } : userOrId;
      try {
        result = await (
          {
            guest: () => this.chatClient.setGuestUser(user!),
            anonymous: () => this.chatClient.connectAnonymousUser(),
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          }[`${userTokenOrProvider}`] ??
          (() => this.chatClient.connectUser(user!, userTokenOrProvider))
        )();
      } catch (error) {
        this.notificationService.addPermanentNotification(
          'streamChat.Error connecting to chat, refresh the page to try again.',
          'error'
        );
        throw error;
      }
      this.userSubject.next(
        this.chatClient.user ? { ...this.chatClient.user } : undefined
      );
      const sdkPrefix = 'stream-chat-angular';
      if (!this.chatClient.getUserAgent().includes(sdkPrefix)) {
        this.chatClient.setUserAgent(
          `${sdkPrefix}-${version}-${this.chatClient.getUserAgent()}`
        );
      }
    });
    if (this.chatClient.user?.id && this.trackPendingChannelInvites) {
      const channels = await this.chatClient.queryChannels(
        {
          invite: 'pending',
          members: { $in: [this.chatClient.user?.id] },
        } as any as ChannelFilters<T> // TODO: find out why we need this typecast
      );
      this.pendingInvitesSubject.next(channels);
    }
    this.appSettingsSubject.next(undefined);
    this.subscriptions.push(
      this.chatClient.on((e) => {
        this.updateUser(e);
        this.updatePendingInvites(e);
        this.notificationSubject.next({
          eventType: e.type,
          event: e,
        });
      })
    );
    let removeNotification: undefined | Function;
    this.subscriptions.push(
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
      })
    );
    return result;
  }

  /**
   * Disconnects the current user, and closes the WebSocket connection. Useful when disconnecting a chat user, use in combination with [`reset`](./ChannelService.mdx/#reset).
   */
  async disconnectUser() {
    this.pendingInvitesSubject.next([]);
    await this.chatClient.disconnectUser();
    this.userSubject.next(undefined);
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  /**
   * Loads the current [application settings](https://getstream.io/chat/docs/javascript/app_setting_overview/?language=javascript), if the application settings have already been loaded, it does nothing.
   */
  async getAppSettings() {
    if (this.appSettingsSubject.getValue()) {
      return;
    }
    const settings = await this.chatClient.getAppSettings();
    this.appSettingsSubject.next((settings.app as AppSettings) || {});
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
    } as UserFilters<T>); // TODO: find out why we need this typecast
    return result.users;
  }

  private updatePendingInvites(e: Event<T>) {
    if (!this.trackPendingChannelInvites) {
      return;
    }
    if (e.member?.user?.id === this.chatClient.user?.id && e.channel) {
      const pendingInvites = this.pendingInvitesSubject.getValue();
      if (e.type === 'notification.invited') {
        this.pendingInvitesSubject.next([...pendingInvites, e.channel]);
      } else if (
        e.type === 'notification.invite_accepted' ||
        e.type === 'notification.invite_rejected'
      ) {
        const index = pendingInvites.findIndex(
          (i) => i?.cid === e.channel?.cid
        );
        if (index !== -1) {
          pendingInvites.splice(index, 1);
          this.pendingInvitesSubject.next([...pendingInvites]);
        }
      }
    }
  }

  private updateUser(e: Event<T>) {
    if (typeof e.total_unread_count !== 'undefined') {
      let user: OwnUserResponse<T> | UserResponse<T> | undefined;
      this.userSubject.pipe(take(1)).subscribe((u) => {
        user = u;
      });
      if (user && user.total_unread_count !== e.total_unread_count) {
        this.userSubject.next({
          ...user,
          total_unread_count: e.total_unread_count,
        });
      }
    }
    if (typeof e.unread_channels !== 'undefined') {
      let user: OwnUserResponse<T> | UserResponse<T> | undefined;
      this.userSubject.pipe(take(1)).subscribe((u) => {
        user = u;
      });
      if (user && user.unread_channels !== e.unread_channels) {
        this.userSubject.next({
          ...user,
          unread_channels: e.unread_channels,
        });
      }
    }
    if (typeof e.unread_count !== 'undefined') {
      let user: OwnUserResponse<T> | UserResponse<T> | undefined;
      this.userSubject.pipe(take(1)).subscribe((u) => {
        user = u;
      });
      if (user && user.unread_count !== e.unread_count) {
        this.userSubject.next({
          ...user,
          unread_count: e.unread_count,
        });
      }
    }
    if (
      e.type === 'user.updated' &&
      this.chatClient.user &&
      e.user?.id === this.chatClient.user.id
    ) {
      this.userSubject.next({ ...this.chatClient.user });
    }
  }
}
