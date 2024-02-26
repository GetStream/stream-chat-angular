import { Injectable, NgZone } from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  Observable,
  ReplaySubject,
  Subscription,
} from 'rxjs';
import { filter, first, map, shareReplay, take } from 'rxjs/operators';
import {
  Attachment,
  Channel,
  ChannelFilters,
  ChannelOptions,
  ChannelResponse,
  ChannelSort,
  Event,
  EventTypes,
  FormatMessageResponse,
  Message,
  MessageResponse,
  ReactionResponse,
  UpdatedMessage,
  UserFilters,
  UserResponse,
} from 'stream-chat';
import { ChatClientService, ClientEvent } from './chat-client.service';
import { getMessageTranslation } from './get-message-translation';
import { createMessagePreview } from './message-preview';
import { NotificationService } from './notification.service';
import { getReadBy } from './read-by';
import {
  AttachmentUpload,
  AttachmentUploadErrorReason,
  ChannelQueryState,
  DefaultStreamChatGenerics,
  MessageInput,
  MessageReactionType,
  NextPageConfiguration,
  StreamMessage,
} from './types';

/**
 * The `ChannelService` provides data and interaction for the channel list and message list.
 */
@Injectable({
  providedIn: 'root',
})
export class ChannelService<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> {
  /**
   * Emits `false` if there are no more pages of channels that can be loaded.
   */
  hasMoreChannels$: Observable<boolean>;
  /**
   * Emits the currently loaded and [watched](https://getstream.io/chat/docs/javascript/watch_channel/?language=javascript) channel list.
   *
   * :::important
   * If you want to subscribe to channel events, you need to manually reenter Angular's change detection zone, our [Change detection guide](../concepts/change-detection.mdx) explains this in detail.
   * :::
   *
   *  Apart from pagination, the channel list is also updated on the following events:
   *
   *  | Event type                          | Default behavior                                                   | Custom handler to override                    |
   *  | ----------------------------------- | ------------------------------------------------------------------ | --------------------------------------------- |
   *  | `channel.deleted`                   | Remove channel from the list                                       | `customChannelDeletedHandler`                 |
   *  | `channel.hidden`                    | Remove channel from the list                                       | `customChannelHiddenHandler`                  |
   *  | `channel.truncated`                 | Updates the channel                                                | `customChannelTruncatedHandler`               |
   *  | `channel.updated`                   | Updates the channel                                                | `customChannelUpdatedHandler`                 |
   *  | `channel.visible`                   | Adds the channel to the list                                       | `customChannelVisibleHandler`                 |
   *  | `message.new`                       | Moves the channel to top of the list                               | `customNewMessageHandler`                     |
   *  | `notification.added_to_channel`     | Adds the new channel to the top of the list and starts watching it | `customAddedToChannelNotificationHandler`     |
   *  | `notification.message_new`          | Adds the new channel to the top of the list and starts watching it | `customNewMessageNotificationHandler`         |
   *  | `notification.removed_from_channel` | Removes the channel from the list                                  | `customRemovedFromChannelNotificationHandler` |
   *
   *  It's important to note that filters don't apply to updates to the list from events.
   *
   *  Our platform documentation covers the topic of [channel events](https://getstream.io/chat/docs/javascript/event_object/?language=javascript#events) in depth.
   *
   *  By default if an error occurs during channel load, the Observable will emit an error, which will close the stream. Users will have to reload the page to be able to reinitialize the `ChannelService`. If you don't want the streams to be closed, you can pass `options.keepAliveChannels$OnError = true` to the `init` method. In that case the `channelQueryState$` stream will emit the status of the latest channel load request.
   */
  channels$: Observable<Channel<T>[] | undefined>;
  /**
   * The result of the latest channel query request.
   */
  channelQueryState$: Observable<ChannelQueryState | undefined>;
  /**
   * Emits the currently active channel.
   *
   * :::important
   * If you want to subscribe to channel events, you need to manually reenter Angular's change detection zone, our [Change detection guide](../concepts/change-detection.mdx) explains this in detail.
   * :::
   *
   * The active channel will always be marked as read when a new message is received
   */
  activeChannel$: Observable<Channel<T> | undefined>;
  /**
   * Emits the list of currently loaded messages of the active channel.
   */
  activeChannelMessages$: Observable<StreamMessage<T>[]>;
  /**
   * Emits the list of pinned messages of the active channel.
   */
  activeChannelPinnedMessages$: Observable<StreamMessage<T>[]>;
  /**
   * Emits the id of the currently selected parent message. If no message is selected, it emits undefined.
   */
  activeParentMessageId$: Observable<string | undefined>;
  /**
   * Emits the list of currently loaded thread replies belonging to the selected parent message. If there is no currently active thread it emits an empty array.
   */
  activeThreadMessages$: Observable<StreamMessage<T>[]>;
  /**
   * Emits the currently selected parent message. If no message is selected, it emits undefined.
   */
  activeParentMessage$: Observable<StreamMessage<T> | undefined>;
  /**
   * Emits the currently selected message to quote
   */
  messageToQuote$: Observable<StreamMessage<T> | undefined>;
  /**
   * Emits the ID of the message the message list should jump to (can be a channel message or thread message)
   */
  jumpToMessage$: Observable<{ id?: string; parentId?: string }>;
  /**
   * Emits the list of users that are currently typing in the channel (current user is not included)
   */
  usersTypingInChannel$: Observable<UserResponse<T>[]>;
  /**
   * Emits the list of users that are currently typing in the active thread (current user is not included)
   */
  usersTypingInThread$: Observable<UserResponse<T>[]>;
  /**
   * Emits a map that contains the date of the latest message sent by the current user by channels (this is used to detect if slow mode countdown should be started)
   */
  latestMessageDateByUserByChannels$: Observable<{ [key: string]: Date }>;
  /**
   * If you're using [semantic filters for moderation](https://getstream.io/automated-moderation/docs/automod_configuration/?q=semantic%20filters) you can set up rules for bouncing messages.
   *
   * If a message is bounced, it will be emitted via this `Observable`. The built-in [`MessageBouncePrompt` component](../../components/MessageBouncePromptComponent) will display the bounce option to the user if a bounced message is clicked.
   */
  bouncedMessage$: BehaviorSubject<StreamMessage<T> | undefined>;
  /**
   * The last read message id of the active channel, it's used by the message list component to display unread UI, and jump to latest read message
   *
   * This property isn't always updated, please use `channel.read` to display up-to-date read information
   */
  activeChannelLastReadMessageId?: string;
  /**
   * The unread count of the active channel, it's used by the message list component to display unread UI
   *
   * This property isn't always updated, please use `channel.read` to display up-to-date read information
   */
  activeChannelUnreadCount?: number;
  /**
   * Custom event handler to call if a new message received from a channel that is not being watched, provide an event handler if you want to override the [default channel list ordering](./ChannelService.mdx/#channels)
   */
  customNewMessageNotificationHandler?: (
    clientEvent: ClientEvent,
    channelListSetter: (
      channels: (Channel<T> | ChannelResponse<T>)[],
      shouldStopWatchingRemovedChannels?: boolean
    ) => void
  ) => void;
  /**
   * Custom event handler to call when the user is added to a channel, provide an event handler if you want to override the [default channel list ordering](./ChannelService.mdx/#channels)
   */
  customAddedToChannelNotificationHandler?: (
    clientEvent: ClientEvent,
    channelListSetter: (
      channels: (Channel<T> | ChannelResponse<T>)[],
      shouldStopWatchingRemovedChannels?: boolean
    ) => void
  ) => void;
  /**
   * Custom event handler to call when the user is removed from a channel, provide an event handler if you want to override the [default channel list ordering](./ChannelService.mdx/#channels)
   */
  customRemovedFromChannelNotificationHandler?: (
    clientEvent: ClientEvent,
    channelListSetter: (
      channels: (Channel<T> | ChannelResponse<T>)[],
      shouldStopWatchingRemovedChannels?: boolean
    ) => void
  ) => void;
  /**
   * Custom event handler to call when a channel is deleted, provide an event handler if you want to override the [default channel list ordering](./ChannelService.mdx/#channels)
   */
  customChannelDeletedHandler?: (
    event: Event,
    channel: Channel<T>,
    channelListSetter: (
      channels: (Channel<T> | ChannelResponse<T>)[],
      shouldStopWatchingRemovedChannels?: boolean
    ) => void,
    messageListSetter: (messages: StreamMessage<T>[]) => void,
    threadListSetter: (messages: StreamMessage<T>[]) => void,
    parentMessageSetter: (message: StreamMessage<T> | undefined) => void
  ) => void;
  /**
   * Custom event handler to call when a channel is updated, provide an event handler if you want to override the [default channel list ordering](./ChannelService.mdx/#channels)
   */
  customChannelUpdatedHandler?: (
    event: Event,
    channel: Channel<T>,
    channelListSetter: (
      channels: (Channel<T> | ChannelResponse<T>)[],
      shouldStopWatchingRemovedChannels?: boolean
    ) => void,
    messageListSetter: (messages: StreamMessage[]) => void,
    threadListSetter: (messages: StreamMessage[]) => void,
    parentMessageSetter: (message: StreamMessage | undefined) => void
  ) => void;
  /**
   * Custom event handler to call when a channel is truncated, provide an event handler if you want to override the [default channel list ordering](./ChannelService.mdx/#channels)
   */
  customChannelTruncatedHandler?: (
    event: Event,
    channel: Channel<T>,
    channelListSetter: (
      channels: (Channel<T> | ChannelResponse<T>)[],
      shouldStopWatchingRemovedChannels?: boolean
    ) => void,
    messageListSetter: (messages: StreamMessage<T>[]) => void,
    threadListSetter: (messages: StreamMessage<T>[]) => void,
    parentMessageSetter: (message: StreamMessage<T> | undefined) => void
  ) => void;
  /**
   * Custom event handler to call when a channel becomes hidden, provide an event handler if you want to override the [default channel list ordering](./ChannelService.mdx/#channels)
   */
  customChannelHiddenHandler?: (
    event: Event,
    channel: Channel<T>,
    channelListSetter: (
      channels: (Channel<T> | ChannelResponse<T>)[],
      shouldStopWatchingRemovedChannels?: boolean
    ) => void,
    messageListSetter: (messages: StreamMessage<T>[]) => void,
    threadListSetter: (messages: StreamMessage<T>[]) => void,
    parentMessageSetter: (message: StreamMessage<T> | undefined) => void
  ) => void;
  /**
   * Custom event handler to call when a channel becomes visible, provide an event handler if you want to override the [default channel list ordering](./ChannelService.mdx/#channels)
   */
  customChannelVisibleHandler?: (
    event: Event,
    channel: Channel<T>,
    channelListSetter: (
      channels: (Channel<T> | ChannelResponse<T>)[],
      shouldStopWatchingRemovedChannels?: boolean
    ) => void,
    messageListSetter: (messages: StreamMessage<T>[]) => void,
    threadListSetter: (messages: StreamMessage<T>[]) => void,
    parentMessageSetter: (message: StreamMessage<T> | undefined) => void
  ) => void;
  /**
   * Custom event handler to call if a new message received from a channel that is being watched, provide an event handler if you want to override the [default channel list ordering](./ChannelService.mdx/#channels)
   */
  customNewMessageHandler?: (
    event: Event,
    channel: Channel<T>,
    channelListSetter: (
      channels: (Channel<T> | ChannelResponse<T>)[],
      shouldStopWatchingRemovedChannels?: boolean
    ) => void,
    messageListSetter: (messages: StreamMessage<T>[]) => void,
    threadListSetter: (messages: StreamMessage<T>[]) => void,
    parentMessageSetter: (message: StreamMessage<T> | undefined) => void
  ) => void;
  /**
   * You can override the default file upload request - you can use this to upload files to your own CDN
   */
  customFileUploadRequest?: (
    file: File,
    channel: Channel<T>
  ) => Promise<{ file: string }>;
  /**
   * You can override the default image upload request - you can use this to upload images to your own CDN
   */
  customImageUploadRequest?: (
    file: File,
    channel: Channel<T>
  ) => Promise<{ file: string }>;
  /**
   * You can override the default file delete request - override this if you use your own CDN
   */
  customFileDeleteRequest?: (url: string, channel: Channel<T>) => Promise<void>;
  /**
   * You can override the default image delete request - override this if you use your own CDN
   */
  customImageDeleteRequest?: (
    url: string,
    channel: Channel<T>
  ) => Promise<void>;
  /**
   * The provided method will be called before deleting a message. If the returned Promise resolves to `true` to deletion will go ahead. If `false` is returned, the message won't be deleted.
   */
  messageDeleteConfirmationHandler?: (
    message: StreamMessage<T>
  ) => Promise<boolean>;
  /**
   * The provided method will be called before a new message is sent to Stream's API. You can use this hook to tranfrom or enrich the message being sent.
   */
  beforeSendMessage?: (
    input: MessageInput<T>
  ) => MessageInput<T> | Promise<MessageInput<T>>;
  /**
   * The provided method will be called before a message is sent to Stream's API for update. You can use this hook to tranfrom or enrich the message being updated.
   */
  beforeUpdateMessage?: (
    message: StreamMessage<T>
  ) => StreamMessage<T> | Promise<StreamMessage<T>>;
  /**
   * By default the SDK uses an offset based pagination, you can change/extend this by providing your own custom paginator method.
   *
   * The method will be called with the result of the latest channel query.
   *
   * You can return either an offset, or a filter using the [`$lte`/`$gte` operator](https://getstream.io/chat/docs/javascript/query_syntax_operators/). If you return a filter, it will be merged with the filter provided for the `init` method.
   */
  customPaginator?: (channelQueryResult: Channel<T>[]) => NextPageConfiguration;
  /**
   * internal
   */
  static readonly MAX_MESSAGE_REACTIONS_TO_FETCH = 1200;
  private channelsSubject = new BehaviorSubject<Channel<T>[] | undefined>(
    undefined
  );
  private activeChannelSubject = new BehaviorSubject<Channel<T> | undefined>(
    undefined
  );
  private activeChannelMessagesSubject = new BehaviorSubject<
    (StreamMessage<T> | MessageResponse<T> | FormatMessageResponse<T>)[]
  >([]);
  private activeChannelPinnedMessagesSubject = new BehaviorSubject<
    StreamMessage[]
  >([]);
  private hasMoreChannelsSubject = new ReplaySubject<boolean>(1);
  private activeChannelSubscriptions: { unsubscribe: () => void }[] = [];
  private channelSubscriptions: { [key: string]: () => void } = {};
  private activeParentMessageIdSubject = new BehaviorSubject<
    string | undefined
  >(undefined);
  private activeThreadMessagesSubject = new BehaviorSubject<
    (StreamMessage<T> | MessageResponse<T> | FormatMessageResponse<T>)[]
  >([]);
  private jumpToMessageSubject = new BehaviorSubject<{
    id?: string;
    parentId?: string;
  }>({ id: undefined, parentId: undefined });
  private latestMessageDateByUserByChannelsSubject = new BehaviorSubject<{
    [key: string]: Date;
  }>({});
  private filters: ChannelFilters<T> | undefined;
  private sort: ChannelSort<T> | undefined;
  private options:
    | (ChannelOptions & { keepAliveChannels$OnError?: boolean })
    | undefined;
  private readonly messagePageSize = 25;
  private messageToQuoteSubject = new BehaviorSubject<
    StreamMessage<T> | undefined
  >(undefined);
  private usersTypingInChannelSubject = new BehaviorSubject<UserResponse<T>[]>(
    []
  );
  private usersTypingInThreadSubject = new BehaviorSubject<UserResponse<T>[]>(
    []
  );
  private _shouldMarkActiveChannelAsRead = true;
  private shouldSetActiveChannel: boolean | undefined;
  private clientEventsSubscription: Subscription | undefined;
  private isStateRecoveryInProgress = false;
  private channelQueryStateSubject = new BehaviorSubject<
    ChannelQueryState | undefined
  >(undefined);

  private channelListSetter = (
    channels: (Channel<T> | ChannelResponse<T>)[],
    shouldStopWatchingRemovedChannels = true
  ) => {
    const currentChannels = this.channelsSubject.getValue() || [];
    const newChannels = channels.filter(
      (c) => !currentChannels.find((channel) => channel.cid === c.cid)
    );
    const deletedChannels = currentChannels.filter(
      (c) => !channels?.find((channel) => channel.cid === c.cid)
    );
    void this.addChannelsFromNotification(newChannels as ChannelResponse<T>[]);
    this.removeChannelsFromChannelList(
      deletedChannels.map((c) => c.cid),
      shouldStopWatchingRemovedChannels
    );
  };

  private messageListSetter = (messages: StreamMessage<T>[]) => {
    this.activeChannelMessagesSubject.next(messages);
  };

  private threadListSetter = (messages: StreamMessage<T>[]) => {
    this.activeThreadMessagesSubject.next(messages);
  };

  private parentMessageSetter = (message: StreamMessage<T> | undefined) => {
    this.activeParentMessageIdSubject.next(message?.id);
  };
  private dismissErrorNotification?: Function;
  private nextPageConfiguration?: NextPageConfiguration;
  private areReadEventsPaused = false;

  constructor(
    private chatClientService: ChatClientService<T>,
    private ngZone: NgZone,
    private notificationService: NotificationService
  ) {
    this.channels$ = this.channelsSubject.asObservable().pipe(shareReplay(1));
    this.activeChannel$ = this.activeChannelSubject
      .asObservable()
      .pipe(shareReplay(1));
    this.activeChannelMessages$ = this.activeChannelMessagesSubject.pipe(
      map((messages) => {
        const channel = this.activeChannelSubject.getValue()!;
        return messages.map((message) =>
          this.transformToStreamMessage(message, channel)
        );
      }),
      shareReplay(1)
    );
    this.bouncedMessage$ = new BehaviorSubject<StreamMessage<T> | undefined>(
      undefined
    );
    this.hasMoreChannels$ = this.hasMoreChannelsSubject
      .asObservable()
      .pipe(shareReplay(1));
    this.activeParentMessageId$ = this.activeParentMessageIdSubject
      .asObservable()
      .pipe(shareReplay(1));
    this.activeThreadMessages$ = this.activeThreadMessagesSubject.pipe(
      map((messages) => {
        const channel = this.activeChannelSubject.getValue()!;
        return messages.map((message) =>
          this.transformToStreamMessage(message, channel)
        );
      }),
      shareReplay(1)
    );
    this.activeParentMessage$ = combineLatest([
      this.activeChannelMessages$,
      this.activeParentMessageId$,
    ]).pipe(
      map(
        ([messages, parentMessageId]: [
          StreamMessage[],
          string | undefined
        ]) => {
          if (!parentMessageId) {
            return undefined;
          } else {
            const message = messages.find((m) => m.id === parentMessageId);
            if (!message) {
              void this.setAsActiveParentMessage(undefined);
              return undefined;
            } else {
              return message;
            }
          }
        }
      ),
      shareReplay(1)
    );
    this.messageToQuote$ = this.messageToQuoteSubject
      .asObservable()
      .pipe(shareReplay(1));
    this.jumpToMessage$ = this.jumpToMessageSubject
      .asObservable()
      .pipe(shareReplay(1));

    this.usersTypingInChannel$ = this.usersTypingInChannelSubject
      .asObservable()
      .pipe(shareReplay(1));
    this.usersTypingInThread$ = this.usersTypingInThreadSubject
      .asObservable()
      .pipe(shareReplay(1));
    this.latestMessageDateByUserByChannels$ =
      this.latestMessageDateByUserByChannelsSubject
        .asObservable()
        .pipe(shareReplay(1));
    this.activeChannelPinnedMessages$ = this.activeChannelPinnedMessagesSubject
      .asObservable()
      .pipe(shareReplay(1));
    this.channelQueryState$ = this.channelQueryStateSubject
      .asObservable()
      .pipe(shareReplay(1));
  }

  /**
   * If set to false, read events won't be sent as new messages are received. If set to true active channel (if any) will immediately be marked as read.
   */
  get shouldMarkActiveChannelAsRead() {
    return this._shouldMarkActiveChannelAsRead;
  }

  /**
   * If set to false, read events won't be sent as new messages are received. If set to true active channel (if any) will immediately be marked as read.
   */
  set shouldMarkActiveChannelAsRead(shouldMarkActiveChannelAsRead: boolean) {
    if (!this._shouldMarkActiveChannelAsRead && shouldMarkActiveChannelAsRead) {
      const activeChannel = this.activeChannelSubject.getValue();
      if (activeChannel && this.canSendReadEvents) {
        void activeChannel.markRead();
      }
    }
    this._shouldMarkActiveChannelAsRead = shouldMarkActiveChannelAsRead;
  }

  /**
   * Sets the given `channel` as active and marks it as read.
   * If the channel wasn't previously part of the channel, it will be added to the beginning of the list.
   *
   * @param channel
   */
  setAsActiveChannel(channel: Channel<T>) {
    const prevActiveChannel = this.activeChannelSubject.getValue();
    if (prevActiveChannel?.cid === channel.cid) {
      return;
    }
    this.stopWatchForActiveChannelEvents(prevActiveChannel);
    this.areReadEventsPaused = false;
    const readState =
      channel.state.read[this.chatClientService.chatClient.user?.id || ''];
    this.activeChannelLastReadMessageId = readState?.last_read_message_id;
    if (
      channel.state.latestMessages[channel.state.latestMessages.length - 1]
        ?.id === this.activeChannelLastReadMessageId
    ) {
      this.activeChannelLastReadMessageId = undefined;
    }
    this.activeChannelUnreadCount = readState?.unread_messages || 0;
    this.watchForActiveChannelEvents(channel);
    this.addChannel(channel);
    this.activeChannelSubject.next(channel);
    const channelStateLength = channel.state.latestMessages.length;
    if (channelStateLength > 2 * this.messagePageSize) {
      channel.state.latestMessages = channel.state.latestMessages.slice(
        channelStateLength - 2 * this.messagePageSize
      );
    }
    this.setChannelState(channel);
  }

  /**
   * Deselects the currently active (if any) channel
   */
  deselectActiveChannel() {
    const activeChannel = this.activeChannelSubject.getValue();
    if (!activeChannel) {
      return;
    }
    this.stopWatchForActiveChannelEvents(activeChannel);
    this.activeChannelMessagesSubject.next([]);
    this.activeChannelSubject.next(undefined);
    this.activeParentMessageIdSubject.next(undefined);
    this.activeThreadMessagesSubject.next([]);
    this.latestMessageDateByUserByChannelsSubject.next({});
    this.selectMessageToQuote(undefined);
    this.jumpToMessageSubject.next({ id: undefined, parentId: undefined });
    this.activeChannelPinnedMessagesSubject.next([]);
    this.usersTypingInChannelSubject.next([]);
    this.usersTypingInThreadSubject.next([]);
    this.activeChannelLastReadMessageId = undefined;
    this.activeChannelUnreadCount = undefined;
    this.areReadEventsPaused = false;
  }

  /**
   * Sets the given `message` as an active parent message. If `undefined` is provided, it will deleselect the current parent message.
   * @param message
   * @param loadMessagesForm
   */
  async setAsActiveParentMessage(
    message: StreamMessage<T> | undefined,
    loadMessagesForm: 'request' | 'state' = 'request'
  ) {
    const messageToQuote = this.messageToQuoteSubject.getValue();
    if (messageToQuote && !!messageToQuote.parent_id) {
      this.messageToQuoteSubject.next(undefined);
    }
    if (!message) {
      this.activeParentMessageIdSubject.next(undefined);
      this.activeThreadMessagesSubject.next([]);
      const messageToJumpTo = this.jumpToMessageSubject.getValue();
      if (messageToJumpTo && !!messageToJumpTo.parentId) {
        this.jumpToMessageSubject.next({ id: undefined, parentId: undefined });
      }
    } else {
      this.activeParentMessageIdSubject.next(message.id);
      const activeChannel = this.activeChannelSubject.getValue();
      if (loadMessagesForm === 'request') {
        const result = await activeChannel?.getReplies(message.id, {
          limit: this.options?.message_limit,
        });
        this.activeThreadMessagesSubject.next(result?.messages || []);
      } else {
        this.activeThreadMessagesSubject.next(
          activeChannel?.state.threads[message.id] || []
        );
      }
    }
  }

  /**
   * Loads the next page of messages of the active channel. The page size can be set in the [query option](https://getstream.io/chat/docs/javascript/query_channels/?language=javascript#query-options) object.
   * @param direction
   */
  loadMoreMessages(direction: 'older' | 'newer' = 'older') {
    const activeChnannel = this.activeChannelSubject.getValue();
    const messages = this.activeChannelMessagesSubject.getValue();
    const lastMessageId =
      messages[direction === 'older' ? 0 : messages.length - 1]?.id;
    if (
      direction === 'newer' &&
      activeChnannel?.state?.latestMessages === activeChnannel?.state?.messages
    ) {
      // If we are on latest message set, activeChannelMessages$ will be refreshed by WS events, no need for a request
      return false;
    }
    return activeChnannel
      ?.query({
        messages: {
          limit: this.options?.message_limit,
          [direction === 'older' ? 'id_lt' : 'id_gt']: lastMessageId,
        },
        members: { limit: 0 },
        watchers: { limit: 0 },
      })
      .then((res) => {
        if (
          activeChnannel?.data?.id ===
          this.activeChannelSubject.getValue()?.data?.id
        ) {
          this.activeChannelMessagesSubject.next([
            ...activeChnannel.state.messages,
          ]);
        }

        return res;
      });
  }

  /**
   * Loads the next page of messages of the active thread. The page size can be set in the [query option](https://getstream.io/chat/docs/javascript/query_channels/?language=javascript#query-options) object.
   * @param direction
   */
  async loadMoreThreadReplies(direction: 'older' | 'newer' = 'older') {
    if (direction === 'newer') {
      // Thread replies aren't broke into different message sets, activeThreadMessages$ will be refreshed by WS events, no need for a request
      return;
    }
    const activeChnannel = this.activeChannelSubject.getValue();
    const parentMessageId = this.activeParentMessageIdSubject.getValue();
    if (!parentMessageId) {
      return;
    }
    const threadMessages = this.activeThreadMessagesSubject.getValue();
    const lastMessageId =
      threadMessages[direction === 'older' ? 0 : threadMessages.length - 1]?.id;
    await activeChnannel?.getReplies(parentMessageId, {
      limit: this.options?.message_limit,
      [direction === 'older' ? 'id_lt' : 'id_gt']: lastMessageId,
    });
    this.activeThreadMessagesSubject.next(
      activeChnannel?.state.threads[parentMessageId] || []
    );
  }

  /**
   * Queries the channels with the given filters, sorts and options. More info about [channel querying](https://getstream.io/chat/docs/javascript/query_channels/?language=javascript) can be found in the platform documentation. By default the first channel in the list will be set as active channel and will be marked as read.
   * @param filters
   * @param sort
   * @param options
   * @param shouldSetActiveChannel Decides if the first channel in the result should be made as an active channel, or no channel should be marked as active
   * @returns the list of channels found by the query
   */
  async init(
    filters: ChannelFilters<T>,
    sort?: ChannelSort<T>,
    options?: ChannelOptions & { keepAliveChannels$OnError?: boolean },
    shouldSetActiveChannel: boolean = true
  ) {
    this.filters = filters;
    this.options = {
      limit: 25,
      state: true,
      presence: true,
      watch: true,
      message_limit: this.messagePageSize,
      ...options,
    };
    this.sort = sort || { last_message_at: -1 };
    this.shouldSetActiveChannel = shouldSetActiveChannel;
    this.clientEventsSubscription = this.chatClientService.events$.subscribe(
      (notification) => void this.handleNotification(notification)
    );
    try {
      const result = await this.queryChannels(this.shouldSetActiveChannel);
      return result;
    } catch (error) {
      this.dismissErrorNotification =
        this.notificationService.addPermanentNotification(
          'streamChat.Error loading channels',
          'error'
        );
      throw error;
    }
  }

  /**
   * Resets the `activeChannel$`, `channels$` and `activeChannelMessages$` Observables. Useful when disconnecting a chat user, use in combination with [`disconnectUser`](./ChatClientService.mdx/#disconnectuser).
   */
  reset() {
    this.deselectActiveChannel();
    this.channelsSubject.next(undefined);
    this.channelQueryStateSubject.next(undefined);
    this.clientEventsSubscription?.unsubscribe();
    this.dismissErrorNotification?.();
    this.dismissErrorNotification = undefined;
    Object.keys(this.channelSubscriptions).forEach((cid) => {
      this.channelSubscriptions[cid]();
    });
    this.channelSubscriptions = {};
    this.nextPageConfiguration = undefined;
  }

  /**
   * Loads the next page of channels. The page size can be set in the [query option](https://getstream.io/chat/docs/javascript/query_channels/?language=javascript#query-options) object.
   */
  async loadMoreChannels() {
    await this.queryChannels(false);
  }

  /**
   * Adds a reaction to a message.
   * @param messageId The id of the message to add the reaction to
   * @param reactionType The type of the reaction
   * @param customData
   */
  async addReaction(
    messageId: string,
    reactionType: MessageReactionType,
    customData?: T['reactionType']
  ) {
    await this.activeChannelSubject.getValue()?.sendReaction(messageId, {
      type: reactionType,
      ...customData,
    });
  }

  /**
   * Removes a reaction from a message.
   * @param messageId The id of the message to remove the reaction from
   * @param reactionType Thr type of reaction to remove
   */
  async removeReaction(messageId: string, reactionType: MessageReactionType) {
    await this.activeChannelSubject
      .getValue()
      ?.deleteReaction(messageId, reactionType);
  }

  /**
   * Sends a message to the active channel. The message is immediately added to the message list, if an error occurs and the message can't be sent, the error is indicated in `state` of the message.
   * @param text The text of the message
   * @param attachments The attachments
   * @param mentionedUsers Mentioned users
   * @param parentId Id of the parent message (if sending a thread reply)
   * @param quotedMessageId Id of the message to quote (if sending a quote reply)
   * @param customData
   */
  async sendMessage(
    text: string,
    attachments: Attachment<T>[] = [],
    mentionedUsers: UserResponse<T>[] = [],
    parentId: string | undefined = undefined,
    quotedMessageId: string | undefined = undefined,
    customData: undefined | Partial<T['messageType']> = undefined
  ) {
    let input: MessageInput<T> = {
      text,
      attachments,
      mentionedUsers,
      parentId,
      quotedMessageId,
      customData,
    };
    if (this.beforeSendMessage) {
      input = await this.beforeSendMessage(input);
    }
    const preview = createMessagePreview(
      this.chatClientService.chatClient.user!,
      input.text,
      input.attachments,
      input.mentionedUsers,
      input.parentId,
      input.quotedMessageId,
      input.customData
    );
    const channel = this.activeChannelSubject.getValue()!;
    preview.readBy = [];
    channel.state.addMessageSorted(preview, true);
    const response = await this.sendMessageRequest(preview, input.customData);
    return response;
  }

  /**
   * Resends the given message to the active channel
   * @param message The message to resend
   */
  async resendMessage(message: StreamMessage) {
    const channel = this.activeChannelSubject.getValue()!;
    channel.state.addMessageSorted(
      {
        ...(message as any as MessageResponse<T>),
        errorStatusCode: undefined,
        status: 'sending',
      },
      true
    );
    return this.sendMessageRequest(message, undefined, true);
  }

  /**
   * Updates the message in the active channel
   * @param message Mesage to be updated
   */
  async updateMessage(message: StreamMessage<T>) {
    let messageToUpdate = { ...message };
    delete messageToUpdate.i18n;
    if (this.beforeUpdateMessage) {
      messageToUpdate = await this.beforeUpdateMessage(messageToUpdate);
    }
    if (message.moderation_details) {
      return this.resendMessage(message);
    }
    const response = await this.chatClientService.chatClient.updateMessage(
      messageToUpdate as any as UpdatedMessage<T>
    );

    const channel = this.channelsSubject
      .getValue()
      ?.find((c) => c.cid === message.cid);

    if (
      response.message.type === 'error' &&
      response.message.moderation_details
    ) {
      this.notificationService.addTemporaryNotification(
        'streamChat.This message did not meet our content guidelines'
      );
      return message;
    }

    return this.transformToStreamMessage(response.message, channel);
  }

  /**
   * Deletes the message from the active channel
   * @param message Message to be deleted
   * @param isLocalDelete set this `true` if you want to delete a message that's only part of the local state, not yet saved on the backend
   */
  async deleteMessage(message: StreamMessage, isLocalDelete = false) {
    if (isLocalDelete && this.activeChannel) {
      const result = this.activeChannel.state.removeMessage({
        id: message.id,
        parent_id: message.parent_id,
      });
      if (result) {
        message.parent_id
          ? this.activeThreadMessagesSubject.next(
              this.activeChannel.state.threads[message.parent_id]
            )
          : this.activeChannelMessagesSubject.next(
              this.activeChannel.state.messages
            );
      }
      return;
    }
    if (this.messageDeleteConfirmationHandler) {
      const result = await this.messageDeleteConfirmationHandler(message);
      if (result) {
        await this.chatClientService.chatClient.deleteMessage(message.id);
      }
    } else {
      await this.chatClientService.chatClient.deleteMessage(message.id);
    }
  }

  /**
   * Uploads files to the channel. If you want to know more about [file uploads](https://getstream.io/chat/docs/javascript/file_uploads/?language=javascript) check out the platform documentation.
   * @param uploads the attachments to upload (output of the [`AttachmentService`](./AttachmentService.mdx))
   * @returns the result of file upload requests
   */
  async uploadAttachments(
    uploads: AttachmentUpload[]
  ): Promise<AttachmentUpload[]> {
    const result: AttachmentUpload[] = [];
    const channel = this.activeChannelSubject.getValue()!;
    const uploadResults = await Promise.allSettled(
      uploads.map((upload) =>
        upload.type === 'image'
          ? this.customImageUploadRequest
            ? this.customImageUploadRequest(upload.file, channel)
            : channel.sendImage(upload.file, upload.file.name, upload.file.type)
          : this.customFileUploadRequest
          ? this.customFileUploadRequest(upload.file, channel)
          : channel.sendFile(upload.file, upload.file.name, upload.file.type)
      )
    );
    uploadResults.forEach((uploadResult, i) => {
      const file = uploads[i].file;
      const type = uploads[i].type;
      if (uploadResult.status === 'fulfilled') {
        result.push({
          file,
          type,
          state: 'success',
          url: uploadResult.value.file,
          /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
          thumb_url: (uploadResult.value as any).thumb_url,
        });
      } else {
        let reason: AttachmentUploadErrorReason = 'unknown';
        let extraData: { param: string } | undefined;
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
        const message: string | undefined =
          /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */
          uploadResult.reason.response?.data?.message;
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
        const code: number | undefined =
          /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */
          uploadResult.reason.response?.data?.code;
        if (code === 22) {
          reason = 'file-size';
          extraData = { param: /\d+MB/.exec(message || '')?.[0] || '100MB' };
        } else if (
          code === 4 &&
          message?.toLowerCase()?.includes('file extension')
        ) {
          reason = 'file-extension';
          extraData = { param: /\.\w+/.exec(message)?.[0] || '' };
        }
        result.push({
          file,
          type,
          state: 'error',
          errorReason: reason,
          errorExtraInfo: extraData ? [extraData] : undefined,
        });
      }
    });

    return result;
  }

  /**
   * Deletes an uploaded file by URL. If you want to know more about [file uploads](https://getstream.io/chat/docs/javascript/file_uploads/?language=javascript) check out the platform documentation
   * @param attachmentUpload Attachment to be deleted (output of the [`AttachmentService`](./AttachmentService.mdx))
   */
  async deleteAttachment(attachmentUpload: AttachmentUpload) {
    const channel = this.activeChannelSubject.getValue()!;
    await (attachmentUpload.type === 'image'
      ? this.customImageDeleteRequest
        ? this.customImageDeleteRequest(attachmentUpload.url!, channel)
        : channel.deleteImage(attachmentUpload.url!)
      : this.customFileDeleteRequest
      ? this.customFileDeleteRequest(attachmentUpload.url!, channel)
      : channel.deleteFile(attachmentUpload.url!));
  }

  /**
   * Returns the autocomplete options for current channel members. If the channel has less than 100 members, it returns the channel members, otherwise sends a [search request](https://getstream.io/chat/docs/javascript/query_members/?language=javascript#pagination-and-ordering) with the given search term.
   * @param searchTerm Text to search for in the names of members
   * @returns The list of members matching the search filter
   */
  async autocompleteMembers(searchTerm: string) {
    const activeChannel = this.activeChannelSubject.getValue();
    if (!activeChannel) {
      return [];
    }
    if (Object.keys(activeChannel.state.members).length < 100) {
      return Object.values(activeChannel.state.members).filter(
        (m) => m.user?.id !== this.chatClientService.chatClient.userID!
      );
    } else {
      if (!searchTerm) {
        return [];
      }
      const result = await activeChannel.queryMembers({
        name: { $autocomplete: searchTerm },
        id: { $ne: this.chatClientService.chatClient.userID! },
      } as UserFilters<T>); // TODO: find out why we need typecast here
      return Object.values(result.members);
    }
  }

  /**
   * [Runs a message action](https://getstream.io/chat/docs/rest/#messages-runmessageaction) in the current channel. Updates the message list based on the action result (if no message is returned, the message will be removed from the message list).
   * @param messageId
   * @param formData
   * @param parentMessageId
   */
  async sendAction(
    messageId: string,
    formData: Record<string, string>,
    parentMessageId?: string
  ) {
    const channel = this.activeChannelSubject.getValue()!;
    const response = await channel.sendAction(messageId, formData);
    if (response?.message) {
      channel.state.addMessageSorted({
        ...response.message,
        status: 'received',
      });
      const isThreadReply = !!response.message.parent_id;
      isThreadReply
        ? this.activeThreadMessagesSubject.next([
            ...channel.state.threads[response.message.parent_id!],
          ])
        : this.activeChannelMessagesSubject.next([...channel.state.messages]);
    } else {
      channel.state.removeMessage({
        id: messageId,
        parent_id: parentMessageId,
      });
      if (parentMessageId) {
        this.activeThreadMessagesSubject.next(
          channel.state.threads[this.activeParentMessageIdSubject.getValue()!]
        );
      } else {
        this.activeChannelMessagesSubject.next([...channel.state.messages]);
      }
    }
  }

  /**
   * Selects or deselects the current message to quote reply to
   * @param message The message to select, if called with `undefined`, it deselects the message
   */
  selectMessageToQuote(message: StreamMessage | undefined) {
    this.messageToQuoteSubject.next(message);
  }

  /**
   * Add a new channel to the channel list
   * The channel will be added to the beginning of the channel list
   * @param channel
   */
  addChannel(channel: Channel<T>) {
    if (!this.channels.find((c) => c.cid === channel.cid)) {
      this.channelsSubject.next([channel, ...this.channels]);
      this.watchForChannelEvents(channel);
    }
  }

  private async sendMessageRequest(
    preview: MessageResponse<T> | StreamMessage<T>,
    customData?: Partial<T['messageType']>,
    isResend = false
  ) {
    const channel = this.activeChannelSubject.getValue()!;
    const isThreadReply = !!preview.parent_id;
    isThreadReply
      ? this.activeThreadMessagesSubject.next([
          ...channel.state.threads[preview.parent_id!],
        ])
      : this.activeChannelMessagesSubject.next([...channel.state.messages]);
    try {
      const response = await channel.sendMessage({
        id: preview.id,
        text: preview.text,
        attachments: preview.attachments,
        mentioned_users: preview.mentioned_users?.map((u) => u.id),
        parent_id: preview.parent_id,
        quoted_message_id: preview.quoted_message_id,
        ...customData,
      } as Message<T>); // TODO: find out why we need typecast here
      channel.state.addMessageSorted(
        {
          ...response.message,
          status: 'received',
        },
        true
      );
      isThreadReply
        ? this.activeThreadMessagesSubject.next([
            ...channel.state.threads[preview.parent_id!],
          ])
        : this.activeChannelMessagesSubject.next([...channel.state.messages]);
      let messages!: StreamMessage<T>[];
      (isThreadReply ? this.activeThreadMessages$ : this.activeChannelMessages$)
        .pipe(take(1))
        .subscribe((m) => (messages = m));
      const newMessage = messages[messages.length - 1]!;
      return newMessage;
    } catch (error: any) {
      const stringError = JSON.stringify(error);
      const parsedError: {
        status?: number;
        code?: number;
        response?: { data?: { message?: string } };
      } = stringError ? (JSON.parse(stringError) as { status?: number }) : {};

      let isAlreadyExists = false;
      if (isResend) {
        if (
          parsedError.status === 400 &&
          parsedError.code === 4 &&
          parsedError?.response?.data?.message?.includes('already exists')
        ) {
          isAlreadyExists = true;
        }
      }

      channel.state.addMessageSorted(
        {
          ...(preview as MessageResponse<T>),
          errorStatusCode: isAlreadyExists
            ? undefined
            : parsedError.status || undefined,
          status: isAlreadyExists ? 'received' : 'failed',
        },
        true
      );
      isThreadReply
        ? this.activeThreadMessagesSubject.next([
            ...channel.state.threads[preview.parent_id!],
          ])
        : this.activeChannelMessagesSubject.next([...channel.state.messages]);
      let messages!: StreamMessage<T>[];
      (isThreadReply ? this.activeThreadMessages$ : this.activeChannelMessages$)
        .pipe(take(1))
        .subscribe((m) => (messages = m));
      const newMessage = messages[messages.length - 1]!;
      return newMessage;
    }
  }

  /**
   * Jumps to the selected message inside the message list, if the message is not yet loaded, it'll load the message (and it's surroundings) from the API.
   * @param messageId The ID of the message to be loaded, 'latest' means jump to the latest messages
   * @param parentMessageId The ID of the parent message if we want to load a thread message
   */
  async jumpToMessage(messageId: string, parentMessageId?: string) {
    const activeChannel = this.activeChannelSubject.getValue();
    try {
      await activeChannel?.state.loadMessageIntoState(
        messageId,
        parentMessageId
      );
      const messages = activeChannel?.state.messages || [];
      this.activeChannelMessagesSubject.next([...messages]);
      if (parentMessageId) {
        const parentMessage = messages.find((m) => m.id === parentMessageId);
        void this.setAsActiveParentMessage(parentMessage, 'state');
      }
      this.jumpToMessageSubject.next({
        id: messageId,
        parentId: parentMessageId,
      });
    } catch (error) {
      this.notificationService.addTemporaryNotification(
        'streamChat.Message not found'
      );
      throw error;
    }
  }

  /**
   * Pins the given message in the channel
   * @param message
   */
  async pinMessage(message: StreamMessage<DefaultStreamChatGenerics>) {
    try {
      await this.chatClientService.chatClient?.pinMessage(message);
      this.notificationService.addTemporaryNotification(
        'streamChat.Message pinned',
        'success'
      );
    } catch (error) {
      this.notificationService.addTemporaryNotification(
        'streamChat.Error pinning message'
      );
      throw error;
    }
  }

  /**
   * Removes the given message from pinned messages
   * @param message
   */
  async unpinMessage(message: StreamMessage<DefaultStreamChatGenerics>) {
    try {
      await this.chatClientService.chatClient?.unpinMessage(message);
      this.notificationService.addTemporaryNotification(
        'streamChat.Message unpinned',
        'success'
      );
    } catch (error) {
      this.notificationService.addTemporaryNotification(
        'streamChat.Error removing message pin'
      );
      throw error;
    }
  }

  private handleNotification(clientEvent: ClientEvent<T>) {
    switch (clientEvent.eventType) {
      case 'connection.recovered': {
        void this.ngZone.run(async () => {
          if (this.isStateRecoveryInProgress) {
            return;
          }
          this.isStateRecoveryInProgress = true;
          try {
            this.nextPageConfiguration = undefined;
            // If channel list is not inited, we set the active channel
            const shoulSetActiveChannel =
              this.shouldSetActiveChannel &&
              !this.activeChannelSubject.getValue();
            await this.queryChannels(shoulSetActiveChannel || false, true);
            if (this.activeChannelSubject.getValue()) {
              // Thread messages are not refetched so active thread gets deselected to avoid displaying stale messages
              void this.setAsActiveParentMessage(undefined);
              // Update and reselect message to quote
              const messageToQuote = this.messageToQuoteSubject.getValue();
              this.setChannelState(this.activeChannelSubject.getValue()!);
              let messages!: StreamMessage<T>[];
              this.activeChannelMessages$
                .pipe(take(1))
                .subscribe((m) => (messages = m));
              const updatedMessageToQuote = messages.find(
                (m) => m.id === messageToQuote?.id
              );
              if (updatedMessageToQuote) {
                this.selectMessageToQuote(updatedMessageToQuote);
              }
            }
            this.isStateRecoveryInProgress = false;
          } catch {
            this.isStateRecoveryInProgress = false;
          }
        });
        break;
      }
      case 'notification.message_new': {
        this.ngZone.run(() => {
          if (this.customNewMessageNotificationHandler) {
            this.customNewMessageNotificationHandler(
              clientEvent,
              this.channelListSetter
            );
          } else {
            this.handleNewMessageNotification(clientEvent);
          }
        });
        break;
      }
      case 'notification.added_to_channel': {
        this.ngZone.run(() => {
          if (this.customAddedToChannelNotificationHandler) {
            this.customAddedToChannelNotificationHandler(
              clientEvent,
              this.channelListSetter
            );
          } else {
            this.handleAddedToChannelNotification(clientEvent);
          }
        });
        break;
      }
      case 'notification.removed_from_channel': {
        this.ngZone.run(() => {
          if (this.customRemovedFromChannelNotificationHandler) {
            this.customRemovedFromChannelNotificationHandler(
              clientEvent,
              this.channelListSetter
            );
          } else {
            this.handleRemovedFromChannelNotification(clientEvent);
          }
        });
        break;
      }
      case 'user.updated': {
        this.ngZone.run(() => {
          const updatedChannels = this.channelsSubject.getValue()?.map((c) => {
            if (this.chatClientService.chatClient.activeChannels[c.cid]) {
              return this.chatClientService.chatClient.activeChannels[c.cid];
            } else {
              return c;
            }
          });
          this.channelsSubject.next(updatedChannels);
          const activeChannel = this.activeChannelSubject.getValue();
          if (activeChannel) {
            this.activeChannelSubject.next(
              this.chatClientService.chatClient.activeChannels[
                activeChannel.cid
              ] || activeChannel
            );
            this.activeChannelMessagesSubject.next(
              activeChannel.state.messages.map((m) => {
                m.readBy = getReadBy(m, activeChannel);
                return { ...m };
              })
            );
            const activeParentMessage =
              this.activeParentMessageIdSubject.getValue();
            if (activeParentMessage) {
              const messages = activeChannel.state.threads[activeParentMessage];
              this.activeThreadMessagesSubject.next([...messages]);
            }
            this.activeChannelPinnedMessagesSubject.next([
              ...activeChannel.state.pinnedMessages,
            ]);
          }
        });
        break;
      }
    }
  }

  private handleRemovedFromChannelNotification(clientEvent: ClientEvent<T>) {
    const channelIdToBeRemoved = clientEvent.event.channel!.cid;
    this.removeChannelsFromChannelList([channelIdToBeRemoved], true);
  }

  private handleNewMessageNotification(clientEvent: ClientEvent<T>) {
    if (clientEvent.event.channel) {
      void this.addChannelsFromNotification([clientEvent.event.channel]);
    }
  }

  private handleAddedToChannelNotification(clientEvent: ClientEvent<T>) {
    if (clientEvent.event.channel) {
      void this.addChannelsFromNotification([clientEvent.event.channel]);
    }
  }

  private async addChannelsFromNotification(
    channelResponses: ChannelResponse<T>[]
  ) {
    let newChannels: Channel<T>[] = [];
    const watchRequests: Promise<any>[] = [];
    channelResponses.forEach((channelResponse) => {
      const channel = this.chatClientService.chatClient.channel(
        channelResponse.type,
        channelResponse.id
      );
      watchRequests.push(channel.watch());
      newChannels.push(channel);
    });
    await Promise.all(watchRequests);
    const currentChannels = this.channelsSubject.getValue() || [];
    newChannels = newChannels.filter(
      (newChannel) => !currentChannels.find((c) => c.cid === newChannel.cid)
    );
    if (newChannels.length > 0) {
      newChannels.forEach((c) => this.watchForChannelEvents(c));
      this.channelsSubject.next([...newChannels, ...currentChannels]);
    }
  }

  private removeChannelsFromChannelList(
    cids: string[],
    shouldStopWatching: boolean
  ) {
    const channels = this.channels.filter((c) => !cids.includes(c.cid || ''));
    if (shouldStopWatching) {
      cids.forEach((cid) => {
        if (this.channelSubscriptions[cid]) {
          this.channelSubscriptions[cid]();
          delete this.channelSubscriptions.cid;
        }
        void this.chatClientService.chatClient.activeChannels[
          cid
        ]?.stopWatching();
      });
    }
    if (channels.length < this.channels.length) {
      this.channelsSubject.next(channels);
      if (cids.includes(this.activeChannelSubject.getValue()?.cid || '')) {
        if (channels.length > 0) {
          this.setAsActiveChannel(channels[0]);
        } else {
          this.activeChannelSubject.next(undefined);
        }
      }
    }
  }

  private watchForActiveChannelEvents(channel: Channel<T>) {
    this.activeChannelSubscriptions.push(
      channel.on('message.new', (event) => {
        this.ngZone.run(() => {
          event.message && event.message.parent_id
            ? event.message.parent_id ===
              this.activeParentMessageIdSubject.getValue()
              ? this.activeThreadMessagesSubject.next([
                  ...channel.state.threads[event.message.parent_id],
                ])
              : null
            : this.activeChannelMessagesSubject.next([
                ...channel.state.messages,
              ]);
          this.activeChannel$.pipe(first()).subscribe((c) => {
            if (c) {
              this.markRead(c);
            }
          });
          this.updateLatestMessages(event);
        });
      })
    );
    this.activeChannelSubscriptions.push(
      channel.on('message.updated', (event) => this.messageUpdated(event))
    );
    this.activeChannelSubscriptions.push(
      channel.on('message.deleted', (event) => this.messageUpdated(event))
    );
    this.activeChannelSubscriptions.push(
      channel.on('reaction.new', (e) => this.messageReactionEventReceived(e))
    );
    this.activeChannelSubscriptions.push(
      channel.on('reaction.deleted', (e) =>
        this.messageReactionEventReceived(e)
      )
    );
    this.activeChannelSubscriptions.push(
      channel.on('reaction.updated', (e) =>
        this.messageReactionEventReceived(e)
      )
    );
    this.activeChannelSubscriptions.push(
      channel.on('message.read', (e) => {
        this.ngZone.run(() => {
          let latestMessage!: StreamMessage;
          let messages!: StreamMessage[];
          this.activeChannelMessages$.pipe(first()).subscribe((m) => {
            messages = m;
            latestMessage = messages[messages.length - 1];
          });
          if (!latestMessage || !e.user) {
            return;
          }
          if (latestMessage.readBy) {
            latestMessage.readBy.splice(0, latestMessage.readBy.length);
          } else {
            latestMessage.readBy = [];
          }
          latestMessage.readBy.push(...getReadBy(latestMessage, channel));
          messages[messages.length - 1] = { ...latestMessage };

          this.activeChannelMessagesSubject.next([...messages]);
        });
      })
    );
    this.activeChannelSubscriptions.push(
      this.chatClientService.events$
        .pipe(
          filter(
            (e) =>
              e.eventType === 'notification.mark_unread' &&
              e.event.channel_id === channel.id
          ),
          map((e) => e.event)
        )
        .subscribe((e) => {
          this.ngZone.run(() => {
            this.activeChannelLastReadMessageId = e.last_read_message_id;
            this.activeChannelUnreadCount = e.unread_messages;
            this.activeChannelSubject.next(this.activeChannel);
          });
        })
    );
    this.activeChannelSubscriptions.push(
      channel.on('typing.start', (e) =>
        this.ngZone.run(() => this.handleTypingStartEvent(e))
      )
    );
    this.activeChannelSubscriptions.push(
      channel.on('typing.stop', (e) =>
        this.ngZone.run(() => this.handleTypingStopEvent(e))
      )
    );
  }

  /**
   * Call this method if user started typing in the active channel
   * @param parentId The id of the parent message, if user is typing in a thread
   */
  async typingStarted(parentId?: string) {
    const activeChannel = this.activeChannelSubject.getValue();
    await activeChannel?.keystroke(parentId);
  }

  /**
   * Call this method if user stopped typing in the active channel
   * @param parentId The id of the parent message, if user were typing in a thread
   */
  async typingStopped(parentId?: string) {
    const activeChannel = this.activeChannelSubject.getValue();
    await activeChannel?.stopTyping(parentId);
  }

  /**
   * The current list of channels
   */
  get channels() {
    return this.channelsSubject.getValue() || [];
  }

  /**
   * The current active channel
   */
  get activeChannel() {
    return this.activeChannelSubject.getValue() || undefined;
  }

  /**
   * The current active channel messages
   */
  get activeChannelMessages() {
    return this.activeChannelMessagesSubject.getValue() || [];
  }

  /**
   * Get the last 1200 reactions of a message in the current active channel. If you need to fetch more reactions please use the [following endpoint](https://getstream.io/chat/docs/javascript/send_reaction/?language=javascript#paginating-reactions).
   * @param messageId
   * @returns all reactions of a message
   */
  async getMessageReactions(messageId: string) {
    const reactions: ReactionResponse<T>[] = [];
    const limit = 300;
    let offset = 0;
    const reactionsLimit = ChannelService.MAX_MESSAGE_REACTIONS_TO_FETCH;
    let lastPageSize = limit;

    while (lastPageSize === limit && reactions.length < reactionsLimit) {
      try {
        const response = await this.activeChannel?.getReactions(messageId, {
          offset,
          limit,
        });
        lastPageSize = response?.reactions?.length || 0;
        if (lastPageSize > 0) {
          reactions.push(...response!.reactions);
        }
        offset += lastPageSize;
      } catch (e) {
        this.notificationService.addTemporaryNotification(
          'streamChat.Error loading reactions'
        );
        throw e;
      }
    }
    return reactions;
  }

  /**
   * Marks the channel from the given message as unread
   * @param messageId
   * @returns the result of the request
   */
  async markMessageUnread(messageId: string) {
    if (!this.activeChannel) {
      return;
    }

    try {
      const response = await this.activeChannel.markUnread({
        message_id: messageId,
      });
      this.areReadEventsPaused = true;
      return response;
    } catch (e: any) {
      const error: {
        response?: {
          data?: { code?: number; message?: string; StatusCode?: number };
        };
      } = JSON.parse(JSON.stringify(e)) as {
        response?: {
          data?: { code?: number; message?: string; StatusCode?: number };
        };
      };
      const data = error?.response?.data;
      if (
        data &&
        data.code === 4 &&
        data.StatusCode === 400 &&
        data.message?.includes('it is older than last')
      ) {
        const count = /\d+ channel messages/
          .exec(data.message)?.[0]
          .match(/\d+/)?.[0];
        if (count) {
          this.notificationService.addTemporaryNotification(
            'streamChat.Error, only the first {{count}} message can be marked as unread',
            undefined,
            undefined,
            { count }
          );
          throw e;
        }
      }
      this.notificationService.addTemporaryNotification(
        'streamChat.Error marking message as unread'
      );
      throw e;
    }
  }

  private messageUpdated(event: Event<T>) {
    this.ngZone.run(() => {
      const isThreadReply = event.message && event.message.parent_id;
      const channel = this.activeChannelSubject.getValue();
      if (!channel) {
        return;
      }
      // Get messages from state as message order could change, and message could've been deleted
      const messages: FormatMessageResponse<T>[] = isThreadReply
        ? channel.state.threads[event?.message?.parent_id || '']
        : channel.state.messages;
      if (!messages) {
        return;
      }
      const messageIndex = messages.findIndex(
        (m) => m.id === event?.message?.id
      );
      if (messageIndex !== -1) {
        isThreadReply
          ? this.activeThreadMessagesSubject.next([...messages])
          : this.activeChannelMessagesSubject.next([...messages]);
        this.activeChannelPinnedMessagesSubject.next([
          ...channel.state.pinnedMessages,
        ]);
      }
    });
  }

  private messageReactionEventReceived(e: Event<T>) {
    this.ngZone.run(() => {
      const isThreadMessage = e.message && e.message.parent_id;
      let messages!: StreamMessage[];
      (isThreadMessage
        ? this.activeThreadMessages$
        : this.activeChannelMessages$
      )
        .pipe(first())
        .subscribe((m) => (messages = m));
      const messageIndex = messages.findIndex((m) => m.id === e?.message?.id);
      if (messageIndex === -1) {
        return;
      }
      const message = messages[messageIndex];
      message.reaction_counts = { ...e.message?.reaction_counts };
      message.reaction_scores = { ...e.message?.reaction_scores };
      message.latest_reactions = [...(e.message?.latest_reactions || [])];
      message.own_reactions = [...(e.message?.own_reactions || [])];

      messages[messageIndex] = { ...message };
      isThreadMessage
        ? this.activeThreadMessagesSubject.next([...messages])
        : this.activeChannelMessagesSubject.next([...messages]);
    });
  }

  private formatMessage(message: MessageResponse<T>) {
    const m = message as any as FormatMessageResponse<T>;
    m.pinned_at = message.pinned_at ? new Date(message.pinned_at) : null;
    m.created_at = message.created_at
      ? new Date(message.created_at)
      : new Date();
    m.updated_at = message.updated_at
      ? new Date(message.updated_at)
      : new Date();
    message.status = message.status || 'received';

    return m;
  }

  private isStreamMessage(
    message: StreamMessage | FormatMessageResponse | MessageResponse
  ): message is StreamMessage {
    return !!message.readBy;
  }

  private isFormatMessageResponse(
    message: StreamMessage | FormatMessageResponse | MessageResponse
  ): message is FormatMessageResponse {
    return message.created_at instanceof Date;
  }

  private stopWatchForActiveChannelEvents(channel: Channel<T> | undefined) {
    if (!channel) {
      return;
    }
    this.activeChannelSubscriptions.forEach((s) => s.unsubscribe());
    this.activeChannelSubscriptions = [];
  }

  private async queryChannels(
    shouldSetActiveChannel: boolean,
    recoverState = false
  ) {
    try {
      this.channelQueryStateSubject.next({ state: 'in-progress' });
      let filters: ChannelFilters<T>;
      let options: ChannelOptions;
      if (this.nextPageConfiguration) {
        if (this.nextPageConfiguration.type === 'filter') {
          filters = {
            ...this.filters!,
            ...this.nextPageConfiguration.paginationFilter,
          };
          options = this.options as ChannelOptions;
        } else {
          options = {
            ...this.options,
            offset: this.nextPageConfiguration.offset,
          };
          filters = this.filters!;
        }
      } else {
        filters = this.filters!;
        options = this.options as ChannelOptions;
      }
      const channels = await this.chatClientService.chatClient.queryChannels(
        filters,
        this.sort || {},
        options
      );
      this.setNextPageConfiguration(channels);
      channels.forEach((c) => this.watchForChannelEvents(c));
      const prevChannels = recoverState
        ? []
        : this.channelsSubject.getValue() || [];
      const filteredChannels = channels.filter(
        (channel) =>
          !prevChannels.find(
            (existingChannel) => existingChannel.cid === channel.cid
          )
      );
      let currentActiveChannel = this.activeChannelSubject.getValue();
      let isCurrentActiveChannelDeselected = false;
      const nextChannels = [...prevChannels, ...filteredChannels];
      if (
        recoverState &&
        currentActiveChannel &&
        !filteredChannels.find((c) => c.cid === currentActiveChannel?.cid)
      ) {
        try {
          await currentActiveChannel.watch();
          nextChannels.unshift(currentActiveChannel);
        } catch (e) {
          isCurrentActiveChannelDeselected = true;
        }
      }
      this.channelsSubject.next(nextChannels);
      if (isCurrentActiveChannelDeselected) {
        this.deselectActiveChannel();
      }
      if (
        filteredChannels.length > 0 &&
        !currentActiveChannel &&
        shouldSetActiveChannel
      ) {
        this.setAsActiveChannel(filteredChannels[0]);
        currentActiveChannel = this.activeChannelSubject.getValue();
      }
      this.hasMoreChannelsSubject.next(channels.length >= this.options!.limit!);
      this.channelQueryStateSubject.next({ state: 'success' });
      if (
        this.options?.keepAliveChannels$OnError &&
        this.dismissErrorNotification
      ) {
        this.dismissErrorNotification();
      }
      return channels;
    } catch (error) {
      if (!this.options?.keepAliveChannels$OnError) {
        this.channelsSubject.error(error);
      }
      this.channelQueryStateSubject.next({
        state: 'error',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        error,
      });
      throw error;
    }
  }

  private watchForChannelEvents(channel: Channel<T>) {
    const unsubscribe = channel.on((event: Event<T>) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const type = event.type as EventTypes | 'capabilities.changed';
      switch (type) {
        case 'message.new': {
          this.ngZone.run(() => {
            if (this.customNewMessageHandler) {
              this.customNewMessageHandler(
                event,
                channel,
                this.channelListSetter,
                this.messageListSetter,
                this.threadListSetter,
                this.parentMessageSetter
              );
            } else {
              this.handleNewMessage(event, channel);
            }
          });
          break;
        }
        case 'channel.hidden': {
          this.ngZone.run(() => {
            if (this.customChannelHiddenHandler) {
              this.customChannelHiddenHandler(
                event,
                channel,
                this.channelListSetter,
                this.messageListSetter,
                this.threadListSetter,
                this.parentMessageSetter
              );
            } else {
              this.handleChannelHidden(event);
            }
          });
          break;
        }
        case 'channel.deleted': {
          this.ngZone.run(() => {
            if (this.customChannelDeletedHandler) {
              this.customChannelDeletedHandler(
                event,
                channel,
                this.channelListSetter,
                this.messageListSetter,
                this.threadListSetter,
                this.parentMessageSetter
              );
            } else {
              this.handleChannelDeleted(event);
            }
          });
          break;
        }
        case 'channel.visible': {
          this.ngZone.run(() => {
            if (this.customChannelVisibleHandler) {
              this.customChannelVisibleHandler(
                event,
                channel,
                this.channelListSetter,
                this.messageListSetter,
                this.threadListSetter,
                this.parentMessageSetter
              );
            } else {
              this.handleChannelVisible(event, channel);
            }
          });
          break;
        }
        case 'channel.updated': {
          this.ngZone.run(() => {
            if (this.customChannelUpdatedHandler) {
              this.customChannelUpdatedHandler(
                event,
                channel,
                this.channelListSetter,
                this.messageListSetter,
                this.threadListSetter,
                this.parentMessageSetter
              );
            } else {
              this.handleChannelUpdate(event);
            }
          });
          break;
        }
        case 'channel.truncated': {
          this.ngZone.run(() => {
            if (this.customChannelTruncatedHandler) {
              this.customChannelTruncatedHandler(
                event,
                channel,
                this.channelListSetter,
                this.messageListSetter,
                this.threadListSetter,
                this.parentMessageSetter
              );
            } else {
              this.handleChannelTruncate(event);
            }
          });
          break;
        }
        case 'capabilities.changed': {
          this.ngZone.run(() => {
            const cid = event.cid;
            if (cid) {
              const currentChannels = this.channelsSubject.getValue();
              const index = currentChannels?.findIndex((c) => c.cid === cid);
              if (index !== -1 && index !== undefined) {
                this.channelsSubject.next([...currentChannels!]);
                if (cid === this.activeChannelSubject.getValue()?.cid) {
                  this.activeChannelSubject.next(
                    this.activeChannelSubject.getValue()
                  );
                }
              }
            }
          });
          break;
        }
      }
    });
    this.channelSubscriptions[channel.cid] = unsubscribe.unsubscribe;
  }

  private handleNewMessage(_: Event, channel: Channel<T>) {
    const channelIndex = this.channels.findIndex((c) => c.cid === channel.cid);
    this.channels.splice(channelIndex, 1);
    this.channelsSubject.next([channel, ...this.channels]);
  }

  private handleChannelHidden(event: Event) {
    this.removeChannelsFromChannelList([event.channel!.cid], false);
  }

  private handleChannelDeleted(event: Event) {
    this.removeChannelsFromChannelList([event.channel!.cid], false);
  }

  private handleChannelVisible(event: Event, channel: Channel<T>) {
    if (!this.channels.find((c) => c.cid === event.cid)) {
      this.ngZone.run(() =>
        this.channelsSubject.next([...this.channels, channel])
      );
    }
  }

  private handleChannelUpdate(event: Event<T>) {
    const channelIndex = this.channels.findIndex(
      (c) => c.cid === event.channel!.cid
    );
    if (channelIndex !== -1) {
      const channel = this.channels[channelIndex];
      const notIncludedProperies = {
        hidden: channel.data?.hidden || false,
        own_capabilities: channel.data?.own_capabilities || [],
      };
      channel.data = {
        ...event.channel!,
        ...notIncludedProperies,
      };
      this.channelsSubject.next([...this.channels]);
      if (event.channel?.cid === this.activeChannelSubject.getValue()?.cid) {
        this.activeChannelSubject.next(channel);
      }
    }
  }

  private handleChannelTruncate(event: Event) {
    const channelIndex = this.channels.findIndex(
      (c) => c.cid === event.channel!.cid
    );
    if (channelIndex !== -1) {
      this.channels[channelIndex].state.messages = [];
      this.channelsSubject.next([...this.channels]);
      if (event.channel?.cid === this.activeChannelSubject.getValue()?.cid) {
        const channel = this.activeChannelSubject.getValue()!;
        channel.state.messages = [];
        this.activeChannelSubject.next(channel);
        this.activeChannelMessagesSubject.next([]);
        this.activeParentMessageIdSubject.next(undefined);
        this.activeThreadMessagesSubject.next([]);
      }
    }
  }

  private get canSendReadEvents() {
    const channel = this.activeChannelSubject.getValue();
    if (!channel) {
      return false;
    }
    const capabilites = channel.data?.own_capabilities as string[];
    return capabilites.indexOf('read-events') !== -1;
  }

  private transformToStreamMessage(
    message: StreamMessage<T> | MessageResponse<T> | FormatMessageResponse<T>,
    channel?: Channel<T>
  ) {
    const isThreadMessage = !!message.parent_id;
    if (
      this.isStreamMessage(message) &&
      this.isFormatMessageResponse(message)
    ) {
      if (message.quoted_message) {
        message.quoted_message.translation = getMessageTranslation(
          message.quoted_message,
          channel,
          this.chatClientService.chatClient.user
        );
      }
      message.translation = getMessageTranslation(
        message,
        channel,
        this.chatClientService.chatClient.user
      );
      return message;
    } else {
      if (message.quoted_message) {
        message.quoted_message.translation = getMessageTranslation(
          message.quoted_message,
          channel,
          this.chatClientService.chatClient.user
        );
      }
      if (this.isFormatMessageResponse(message)) {
        message.readBy = isThreadMessage
          ? []
          : channel
          ? getReadBy(message, channel)
          : [];
        message.translation = getMessageTranslation(
          message,
          channel,
          this.chatClientService.chatClient.user
        );

        return message;
      } else {
        message = this.formatMessage(message);
        message.readBy = isThreadMessage
          ? []
          : channel
          ? getReadBy(message, channel)
          : [];
        message.translation = getMessageTranslation(
          message,
          channel,
          this.chatClientService.chatClient.user
        );
        return message;
      }
    }
  }

  private handleTypingStartEvent(event: Event) {
    if (event.user?.id === this.chatClientService.chatClient.user?.id) {
      return;
    }
    const isTypingInThread = !!event.parent_id;
    if (
      isTypingInThread &&
      event.parent_id !== this.activeParentMessageIdSubject.getValue()
    ) {
      return;
    }
    const subject = isTypingInThread
      ? this.usersTypingInThreadSubject
      : this.usersTypingInChannelSubject;
    const users: UserResponse[] = subject.getValue();
    const user = event.user;
    if (user && !users.find((u) => u.id === user.id)) {
      users.push(user);
      subject.next([...users]);
    }
  }

  private handleTypingStopEvent(event: Event) {
    const usersTypingInChannel = this.usersTypingInChannelSubject.getValue();
    const usersTypingInThread = this.usersTypingInThreadSubject.getValue();
    const user = event.user;
    if (user && usersTypingInChannel.find((u) => u.id === user.id)) {
      usersTypingInChannel.splice(
        usersTypingInChannel.findIndex((u) => u.id === user.id),
        1
      );
      this.usersTypingInChannelSubject.next([...usersTypingInChannel]);
      return;
    }
    if (user && usersTypingInThread.find((u) => u.id === user.id)) {
      usersTypingInThread.splice(
        usersTypingInThread.findIndex((u) => u.id === user.id),
        1
      );
      this.usersTypingInThreadSubject.next([...usersTypingInThread]);
      return;
    }
  }

  private updateLatestMessages(event: Event) {
    if (
      event.message?.user?.id !== this.chatClientService?.chatClient.user?.id
    ) {
      return;
    }
    const latestMessages =
      this.latestMessageDateByUserByChannelsSubject.getValue();
    if (!event.message?.created_at) {
      return;
    }
    const channelId = event?.message?.cid;
    if (!channelId) {
      return;
    }
    const messageDate = new Date(event.message.created_at);
    if (
      !latestMessages[channelId] ||
      latestMessages[channelId]?.getTime() < messageDate.getTime()
    ) {
      latestMessages[channelId] = messageDate;
      this.latestMessageDateByUserByChannelsSubject.next({
        ...latestMessages,
      });
    }
  }

  private setChannelState(channel: Channel<T>) {
    channel.state.messages.forEach((m) => {
      m.readBy = getReadBy(m, channel);
      m.translation = getMessageTranslation(
        m,
        channel,
        this.chatClientService.chatClient.user
      );
      if (m.quoted_message) {
        m.quoted_message.translation = getMessageTranslation(
          m.quoted_message,
          channel,
          this.chatClientService.chatClient.user
        );
      }
    });
    this.markRead(channel);
    this.activeChannelMessagesSubject.next([...channel.state.messages]);
    this.activeChannelPinnedMessagesSubject.next([
      ...channel.state.pinnedMessages,
    ]);
    this.activeParentMessageIdSubject.next(undefined);
    this.activeThreadMessagesSubject.next([]);
    this.messageToQuoteSubject.next(undefined);
    this.usersTypingInChannelSubject.next([]);
    this.usersTypingInThreadSubject.next([]);
  }

  private markRead(channel: Channel<T>) {
    if (
      this.canSendReadEvents &&
      this.shouldMarkActiveChannelAsRead &&
      !this.areReadEventsPaused
    ) {
      void channel.markRead();
    }
  }

  private setNextPageConfiguration(channelQueryResult: Channel<T>[]) {
    if (this.customPaginator) {
      this.nextPageConfiguration = this.customPaginator(channelQueryResult);
    } else {
      this.nextPageConfiguration = {
        type: 'offset',
        offset:
          (this.nextPageConfiguration?.type === 'offset'
            ? this.nextPageConfiguration.offset
            : 0) + channelQueryResult.length,
      };
    }
  }
}
