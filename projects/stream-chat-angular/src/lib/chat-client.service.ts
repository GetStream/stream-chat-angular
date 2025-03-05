import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import {
  AppSettingsAPIResponse,
  Channel,
  ChannelFilters,
  ConnectAPIResponse,
  OwnUserResponse,
  StreamChatOptions,
  UserFilters,
  UserResponse,
} from 'stream-chat';
import { AppSettings, Event, StreamChat, TokenOrProvider } from 'stream-chat';
import { version } from '../assets/version';
import { NotificationService } from './notification.service';
import { take } from 'rxjs/operators';

export type ClientEvent = {
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
   * Emits [`ClientEvent`](https://github.com/GetStream/stream-chat-angular/blob/master/projects/stream-chat-angular/src/lib/chat-client.service.ts) events. The platform documentation covers [the list of client, user presence and notification events](/chat/docs/javascript/event_object/).
   * :::important
   * For performance reasons this Observable operates outside of the Angular change detection zone. If you subscribe to it, you need to manually reenter Angular's change detection zone, our [Change detection guide](/chat/docs/sdk/angular/concepts/change-detection/) explains this in detail.
   * :::
   */
  events$: Observable<ClientEvent>;
  /**
   * Emits the current [application settings](/chat/docs/javascript/app_setting_overview/). Since getting the application settings is an expensive API call and we don't always need the result, this is not initialized by default, you need to call `getApplicationSettings` to load them.
   */
  appSettings$: Observable<AppSettings | undefined>;
  /**
   * Emits the current connection state of the user (`online` or `offline`)
   */
  connectionState$: Observable<'offline' | 'online'>;
  /**
   * Emits the list of pending invites of the user. It emits every pending invitation during initialization and then extends the list when a new invite is received. More information can be found in the [channel invitations](/chat/docs/sdk/angular/code-examples/channel-invites/) guide.
   */
  pendingInvites$: Observable<Channel[]>;
  /**
   * Emits the current chat user
   */
  user$: Observable<OwnUserResponse | UserResponse | undefined>;
  private notificationSubject = new ReplaySubject<ClientEvent>(1);
  private connectionStateSubject = new ReplaySubject<'offline' | 'online'>(1);
  private appSettingsSubject = new BehaviorSubject<AppSettings | undefined>(
    undefined
  );
  private pendingInvitesSubject = new BehaviorSubject<Channel[]>([]);
  private userSubject = new ReplaySubject<
    OwnUserResponse | UserResponse | undefined
  >(1);
  private subscriptions: { unsubscribe: () => void }[] = [];
  private trackPendingChannelInvites = true;
  private appSettingsPromise?: Promise<AppSettingsAPIResponse>;

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
   * Creates a [`StreamChat`](https://github.com/GetStream/stream-chat-js/blob/668b3e5521339f4e14fc657834531b4c8bf8176b/src/client.ts#L124) instance using the provided `apiKey`, and connects a user with the given meta data and token. More info about [connecting users](/chat/docs/javascript/init_and_users/) can be found in the platform documentation.
   * @param apiKey
   * @param userOrId you can emit this for anonymous logins
   * @param userTokenOrProvider You can provide:<ul>
   *  <li> a token, </li>
   *  <li> a token provider, a method that returns `Promise<string>`, which can be called when the previous token expires (recommended setup for production applications)</li>
   *  <li> the keyword 'guest' to connect as [guest user](/chat/docs/javascript/authless_users/#guest-users) </li>
   *  <li> the keyword 'anonymous' to connect as [anonymous user](/chat/docs/javascript/authless_users/#anonymous-users) </li>
   *  </ul>
   * @param clientOptions Setting to provide to the Stream client instance
   */
  async init(
    apiKey: string,
    userOrId: string | OwnUserResponse | UserResponse | undefined,
    userTokenOrProvider: TokenOrProvider,
    clientOptions?: StreamChatOptions & {
      trackPendingChannelInvites?: boolean;
    }
  ): ConnectAPIResponse {
    if (this.chatClient && this.chatClient.key !== apiKey) {
      this.appSettingsSubject.next(undefined);
      this.appSettingsPromise = undefined;
    }
    this.trackPendingChannelInvites =
      clientOptions?.trackPendingChannelInvites === true;
    this.chatClient = StreamChat.getInstance(apiKey, clientOptions);
    if ('sdkIdentifier' in this.chatClient) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (this.chatClient as any).sdkIdentifier = {
        name: 'angular',
        version,
      };
    } else {
      const userAgent = this.chatClient.getUserAgent();
      if (!userAgent.includes('stream-chat-angular')) {
        const parts = userAgent.split('-');
        const jsVersion = parts[parts.length - 1] ?? '0.0.0';
        this.chatClient.setUserAgent(
          `stream-chat-angular-v${version}-llc-v${jsVersion}`
        );
      }
    }
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
    });
    if (this.chatClient.user?.id && this.trackPendingChannelInvites) {
      const channels = await this.chatClient.queryChannels(
        {
          invite: 'pending',
          members: { $in: [this.chatClient.user?.id] },
        } as unknown as ChannelFilters // TODO: find out why we need this typecast
      );
      this.pendingInvitesSubject.next(channels);
    }
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
    let removeNotification: undefined | (() => void);
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
   * Disconnects the current user, and closes the WebSocket connection. Useful when disconnecting a chat user, use in combination with [`reset`](/chat/docs/sdk/angular/services/ChannelService/#reset/).
   */
  async disconnectUser() {
    this.pendingInvitesSubject.next([]);
    await this.chatClient.disconnectUser();
    this.userSubject.next(undefined);
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  /**
   * Loads the current [application settings](/chat/docs/javascript/app_setting_overview/), if the application settings have already been loaded, it does nothing.
   */
  async getAppSettings() {
    if (this.appSettingsPromise) {
      return;
    }
    if (this.appSettingsSubject.getValue()) {
      return;
    }
    this.appSettingsPromise = this.chatClient.getAppSettings();
    void this.appSettingsPromise.finally(() => {
      this.appSettingsPromise = undefined;
    });
    const settings = await this.appSettingsPromise;
    this.appSettingsSubject.next((settings.app as AppSettings) || {});
  }

  /**
   * Flag the message with the given ID. If you want to know [more about flags](/chat/docs/javascript/moderation/) check out the platform documentation.
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
    } as UserFilters); // TODO: find out why we need this typecast
    return result.users.filter((u) => u.id !== this.chatClient?.user?.id);
  }

  private updatePendingInvites(e: Event) {
    if (!this.trackPendingChannelInvites) {
      return;
    }
    if (e.member?.user?.id === this.chatClient.user?.id && e.channel) {
      const pendingInvites = this.pendingInvitesSubject.getValue();
      if (e.type === 'notification.invited') {
        const channel = this.chatClient.channel(e.channel?.type, e.channel?.id);
        this.pendingInvitesSubject.next([...pendingInvites, channel]);
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

  private updateUser(e: Event) {
    if (typeof e.total_unread_count !== 'undefined') {
      let user: OwnUserResponse | UserResponse | undefined;
      this.userSubject.pipe(take(1)).subscribe((u) => {
        user = u;
      });
      if (
        user &&
        'total_unread_count' in user &&
        user.total_unread_count !== e.total_unread_count
      ) {
        this.userSubject.next({
          ...user,
          total_unread_count: e.total_unread_count,
        });
      }
    }
    if (typeof e.unread_channels !== 'undefined') {
      let user: OwnUserResponse | UserResponse | undefined;
      this.userSubject.pipe(take(1)).subscribe((u) => {
        user = u;
      });
      if (
        user &&
        'unread_channels' in user &&
        user.unread_channels !== e.unread_channels
      ) {
        this.userSubject.next({
          ...user,
          unread_channels: e.unread_channels,
        });
      }
    }
    if (typeof e.unread_count !== 'undefined') {
      let user: OwnUserResponse | UserResponse | undefined;
      this.userSubject.pipe(take(1)).subscribe((u) => {
        user = u;
      });
      if (
        user &&
        'unread_count' in user &&
        user.unread_count !== e.unread_count
      ) {
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
