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
  CustomMessageData,
  CustomReactionData,
  Event,
  EventPayload,
  EventType,
  formatMessage,
  nsToDate,
  LocalMessage,
  MemberFilters,
  MessageIntervalPaginator,
  MessageRequest,
  MessageResponse,
  ReactionResponse,
  Thread,
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
  ChannelQueryResult,
  ChannelQueryState,
  ChannelQueryType,
  MessageInput,
  MessageReactionType,
  NextPageConfiguration,
  ChannelSort,
  MessageListPaginationState,
  StreamMessage,
} from './types';
import { ChannelQuery } from './channel-query';
import {
  convertMessageDatesToDate,
  convertStreamMessageToLocalMessage,
} from './message-dates';

/**
 * The `ChannelService` provides data and interaction for the channel list and message list.
 */
@Injectable({
  providedIn: 'root',
})
export class ChannelService {
  /**
   * Emits `false` if there are no more pages of channels that can be loaded.
   */
  hasMoreChannels$: Observable<boolean>;
  /**
   * Emits the currently loaded and [watched](/chat/docs/javascript/creating-channels/) channel list.
   *
   * :::important
   * If you want to subscribe to channel events, you need to manually reenter Angular's change detection zone, our [Change detection guide](/chat/docs/sdk/angular/concepts/change-detection/) explains this in detail.
   * :::
   */
  channels$: Observable<Channel[] | undefined>;
  /**
   * The result of the latest channel query request.
   */
  channelQueryState$: Observable<ChannelQueryState | undefined>;
  /**
   * Emits the currently active channel.
   *
   * :::important
   * If you want to subscribe to channel events, you need to manually reenter Angular's change detection zone, our [Change detection guide](/chat/docs/sdk/angular/concepts/change-detection/) explains this in detail.
   * :::
   *
   * The active channel will always be marked as read when a new message is received
   */
  activeChannel$: Observable<Channel | undefined>;
  /**
   * Emits the list of currently loaded messages of the active channel.
   */
  activeChannelMessages$: Observable<StreamMessage[]>;
  /**
   * Emits the pagination state (loading, has more older/newer messages, last error) of the active channel's message list.
   */
  activeChannelMessagesPaginationState$: Observable<MessageListPaginationState>;
  /**
   * Emits the pagination state (loading, has more older/newer replies, last error) of the active thread's message list.
   */
  activeThreadMessagesPaginationState$: Observable<MessageListPaginationState>;
  /**
   * Emits the list of pinned messages of the active channel.
   */
  activeChannelPinnedMessages$: Observable<StreamMessage[]>;
  /**
   * Emits the id of the currently selected parent message. If no message is selected, it emits undefined.
   */
  activeParentMessageId$: Observable<string | undefined>;
  /**
   * Emits the list of currently loaded thread replies belonging to the selected parent message. If there is no currently active thread it emits an empty array.
   */
  activeThreadMessages$: Observable<StreamMessage[]>;
  /**
   * Emits the currently selected parent message. If no message is selected, it emits undefined.
   */
  activeParentMessage$: Observable<StreamMessage | undefined>;
  /**
   * Emits the currently selected message to quote
   */
  messageToQuote$: Observable<StreamMessage | undefined>;
  /**
   * Emits the ID of the message the message list should jump to (can be a channel message or thread message)
   */
  jumpToMessage$: Observable<{ id?: string; parentId?: string }>;
  /**
   * Emits the list of users that are currently typing in the channel (current user is not included)
   */
  usersTypingInChannel$: Observable<UserResponse[]>;
  /**
   * Emits the list of users that are currently typing in the active thread (current user is not included)
   */
  usersTypingInThread$: Observable<UserResponse[]>;
  /**
   * Emits a map that contains the date of the latest message sent by the current user by channels (this is used to detect if slow mode countdown should be started)
   */
  latestMessageDateByUserByChannels$: Observable<{ [key: string]: Date }>;
  /**
   * If you're using [semantic filters for moderation](/moderation/docs/node/) you can set up rules for bouncing messages.
   *
   * If a message is bounced, it will be emitted via this `Observable`. The built-in [`MessageBouncePrompt` component](/chat/docs/sdk/angular/components/MessageBouncePromptComponent/) will display the bounce option to the user if a bounced message is clicked.
   */
  bouncedMessage$: BehaviorSubject<StreamMessage | undefined>;
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
   * Custom event handler to call if a new message received from a channel that is not being watched, provide an event handler if you want to override the [default channel list ordering](/chat/docs/sdk/angular/services/ChannelService/#channels)
   *
   * If you're adding a new channel, make sure that it's a [watched](/chat/docs/javascript/creating-channels/) channel.
   */
  customNewMessageNotificationHandler?: (
    clientEvent: ClientEvent,
    channelListSetter: (
      channels: Channel[],
      shouldStopWatchingRemovedChannels?: boolean
    ) => void
  ) => void;
  /**
   * Custom event handler to call when the user is added to a channel, provide an event handler if you want to override the [default channel list ordering](/chat/docs/sdk/angular/services/ChannelService/#channels).
   *
   * If you're adding a new channel, make sure that it's a [watched](/chat/docs/javascript/creating-channels/) channel.
   */
  customAddedToChannelNotificationHandler?: (
    clientEvent: ClientEvent,
    channelListSetter: (
      channels: Channel[],
      shouldStopWatchingRemovedChannels?: boolean
    ) => void
  ) => void;
  /**
   * Custom event handler to call when the user is removed from a channel, provide an event handler if you want to override the [default channel list ordering](/chat/docs/sdk/angular/services/ChannelService/#channels).
   *
   * If you're adding a new channel, make sure that it's a [watched](/chat/docs/javascript/creating-channels/) channel.
   */
  customRemovedFromChannelNotificationHandler?: (
    clientEvent: ClientEvent,
    channelListSetter: (
      channels: Channel[],
      shouldStopWatchingRemovedChannels?: boolean
    ) => void
  ) => void;
  /**
   * Custom event handler to call when a channel is deleted, provide an event handler if you want to override the [default channel list ordering](/chat/docs/sdk/angular/services/ChannelService/#channels).
   *
   * If you're adding a new channel, make sure that it's a [watched](/chat/docs/javascript/creating-channels/) channel.
   */
  customChannelDeletedHandler?: (
    event: Event,
    channel: Channel,
    channelListSetter: (
      channels: Channel[],
      shouldStopWatchingRemovedChannels?: boolean
    ) => void,
    messageListSetter: (messages: StreamMessage[]) => void,
    threadListSetter: (messages: StreamMessage[]) => void,
    parentMessageSetter: (message: StreamMessage | undefined) => void
  ) => void;
  /**
   * Custom event handler to call when a channel is updated, provide an event handler if you want to override the [default channel list ordering](/chat/docs/sdk/angular/services/ChannelService/#channels).
   *
   * If you're adding a new channel, make sure that it's a [watched](/chat/docs/javascript/creating-channels/) channel.
   */
  customChannelUpdatedHandler?: (
    event: Event,
    channel: Channel,
    channelListSetter: (
      channels: Channel[],
      shouldStopWatchingRemovedChannels?: boolean
    ) => void,
    messageListSetter: (messages: StreamMessage[]) => void,
    threadListSetter: (messages: StreamMessage[]) => void,
    parentMessageSetter: (message: StreamMessage | undefined) => void
  ) => void;
  /**
   * Custom event handler to call when a channel is truncated, provide an event handler if you want to override the [default channel list ordering](/chat/docs/sdk/angular/services/ChannelService/#channels).
   *
   * If you're adding a new channel, make sure that it's a [watched](/chat/docs/javascript/creating-channels/) channel.
   */
  customChannelTruncatedHandler?: (
    event: Event,
    channel: Channel,
    channelListSetter: (
      channels: Channel[],
      shouldStopWatchingRemovedChannels?: boolean
    ) => void,
    messageListSetter: (messages: StreamMessage[]) => void,
    threadListSetter: (messages: StreamMessage[]) => void,
    parentMessageSetter: (message: StreamMessage | undefined) => void
  ) => void;
  /**
   * Custom event handler to call when a channel becomes hidden, provide an event handler if you want to override the [default channel list ordering](/chat/docs/sdk/angular/services/ChannelService/#channels).
   *
   * If you're adding a new channel, make sure that it's a [watched](/chat/docs/javascript/creating-channels/) channel.
   */
  customChannelHiddenHandler?: (
    event: Event,
    channel: Channel,
    channelListSetter: (
      channels: Channel[],
      shouldStopWatchingRemovedChannels?: boolean
    ) => void,
    messageListSetter: (messages: StreamMessage[]) => void,
    threadListSetter: (messages: StreamMessage[]) => void,
    parentMessageSetter: (message: StreamMessage | undefined) => void
  ) => void;
  /**
   * Custom event handler to call when a channel becomes visible, provide an event handler if you want to override the [default channel list ordering](/chat/docs/sdk/angular/services/ChannelService/#channels).
   *
   * If you're adding a new channel, make sure that it's a [watched](/chat/docs/javascript/creating-channels/) channel.
   */
  customChannelVisibleHandler?: (
    event: Event,
    channel: Channel,
    channelListSetter: (
      channels: Channel[],
      shouldStopWatchingRemovedChannels?: boolean
    ) => void,
    messageListSetter: (messages: StreamMessage[]) => void,
    threadListSetter: (messages: StreamMessage[]) => void,
    parentMessageSetter: (message: StreamMessage | undefined) => void
  ) => void;
  /**
   * Custom event handler to call if a new message received from a channel that is being watched, provide an event handler if you want to override the [default channel list ordering](/chat/docs/sdk/angular/services/ChannelService/#channels).
   *
   * If you're adding a new channel, make sure that it's a [watched](/chat/docs/javascript/creating-channels/) channel.
   */
  customNewMessageHandler?: (
    event: Event,
    channel: Channel,
    channelListSetter: (
      channels: Channel[],
      shouldStopWatchingRemovedChannels?: boolean
    ) => void,
    messageListSetter: (messages: StreamMessage[]) => void,
    threadListSetter: (messages: StreamMessage[]) => void,
    parentMessageSetter: (message: StreamMessage | undefined) => void
  ) => void;
  /**
   * You can override the default file upload request - you can use this to upload files to your own CDN
   */
  customFileUploadRequest?: (
    file: File,
    channel: Channel
  ) => Promise<{ file: string }>;
  /**
   * You can override the default image upload request - you can use this to upload images to your own CDN
   */
  customImageUploadRequest?: (
    file: File,
    channel: Channel
  ) => Promise<{ file: string }>;
  /**
   * You can override the default file delete request - override this if you use your own CDN
   */
  customFileDeleteRequest?: (url: string, channel: Channel) => Promise<void>;
  /**
   * You can override the default image delete request - override this if you use your own CDN
   */
  customImageDeleteRequest?: (url: string, channel: Channel) => Promise<void>;
  /**
   * The provided method will be called before deleting a message. If the returned Promise resolves to `true` to deletion will go ahead. If `false` is returned, the message won't be deleted.
   */
  messageDeleteConfirmationHandler?: (
    message: StreamMessage
  ) => Promise<boolean>;
  /**
   * The provided method will be called before a new message is sent to Stream's API. You can use this hook to tranfrom or enrich the message being sent.
   */
  beforeSendMessage?: (
    input: MessageInput
  ) => MessageInput | Promise<MessageInput>;
  /**
   * The provided method will be called before a message is sent to Stream's API for update. You can use this hook to tranfrom or enrich the message being updated.
   */
  beforeUpdateMessage?: (
    message: StreamMessage
  ) => StreamMessage | Promise<StreamMessage>;
  /**
   * Since switching channels changes the state of multiple obserables, this observable can be used to check if all observables are updated.
   * - `end` means all observables are in stable state
   * - `start` means all observables are in unstable state
   */
  channelSwitchState$: Observable<'start' | 'end'>;
  /**
   * @internal
   */
  static readonly MAX_MESSAGE_REACTIONS_TO_FETCH = 1200;
  private static readonly initialPaginationState: MessageListPaginationState = {
    hasMoreOlder: true,
    hasMoreNewer: false,
    isLoading: false,
    error: undefined,
  };
  /**
   * @internal
   */
  isMessageLoadingInProgress = false;
  messagePageSize = 25;
  private channelsSubject = new BehaviorSubject<Channel[] | undefined>(
    undefined
  );
  private activeChannelSubject = new BehaviorSubject<Channel | undefined>(
    undefined
  );
  private activeChannelMessagesSubject = new BehaviorSubject<
    (StreamMessage | MessageResponse | LocalMessage)[]
  >([]);
  private activeChannelMessagesPaginationStateSubject =
    new BehaviorSubject<MessageListPaginationState>(
      ChannelService.initialPaginationState
    );
  private activeThreadMessagesPaginationStateSubject =
    new BehaviorSubject<MessageListPaginationState>(
      ChannelService.initialPaginationState
    );
  private activeChannelPaginatorSubscriptions: (() => void)[] = [];
  private activeThreadPaginatorSubscriptions: (() => void)[] = [];
  private releaseActiveChannel?: () => void;
  private releaseActiveThread?: () => void;
  private activeThread?: Thread;
  private errorStatusCodes = new Map<string, number | undefined>();
  private latestStreamMessageById = new Map<string, StreamMessage>();
  private streamMessageCache = new WeakMap<
    object,
    { errorStatusCode?: number; message: StreamMessage }
  >();
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
    (StreamMessage | MessageResponse | LocalMessage)[]
  >([]);
  private jumpToMessageSubject = new BehaviorSubject<{
    id?: string;
    parentId?: string;
  }>({ id: undefined, parentId: undefined });
  private latestMessageDateByUserByChannelsSubject = new BehaviorSubject<{
    [key: string]: Date;
  }>({});
  private readonly attachmentMaxSizeFallbackInMB = 100;
  private messageToQuoteSubject = new BehaviorSubject<
    StreamMessage | undefined
  >(undefined);
  private usersTypingInChannelSubject = new BehaviorSubject<UserResponse[]>([]);
  private usersTypingInThreadSubject = new BehaviorSubject<UserResponse[]>([]);
  private _shouldMarkActiveChannelAsRead = true;
  private shouldSetActiveChannel: boolean | undefined;
  private clientEventsSubscription: Subscription | undefined;
  private isStateRecoveryInProgress = false;
  private channelQueryStateSubject = new BehaviorSubject<
    ChannelQueryState | undefined
  >(undefined);
  private channelSwitchStateSubject = new BehaviorSubject<'start' | 'end'>(
    'end'
  );
  private channelQuery?:
    | ChannelQuery
    | ((queryType: ChannelQueryType) => Promise<ChannelQueryResult>);
  private _customPaginator:
    | ((channelQueryResult: Channel[]) => NextPageConfiguration)
    | undefined;

  private channelListSetter = (
    channels: Channel[],
    shouldStopWatchingRemovedChannels = true
  ) => {
    const currentChannels = this.channelsSubject.getValue() || [];
    const deletedChannels = currentChannels.filter(
      (c) => !channels?.find((channel) => channel.cid === c.cid)
    );

    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      if (!this.channelSubscriptions[channel.cid]) {
        this.watchForChannelEvents(channel);
      }
      if (deletedChannels.includes(channel)) {
        if (shouldStopWatchingRemovedChannels) {
          if (this.channelSubscriptions[channel.cid]) {
            this.channelSubscriptions[channel.cid]();
            delete this.channelSubscriptions.cid;
          }
          void this.chatClientService.chatClient.channelManager
            .get(channel.cid)
            ?.stopWatching()
            .catch((error) =>
              this.chatClientService.logger.warn('Failed to unwatch channel', {
                error: error as Error,
              })
            );
        }
      }
    }
    const nextChannels = channels;
    this.channelsSubject.next(nextChannels);
    if (
      !nextChannels.find(
        (c) => c.cid === this.activeChannelSubject.getValue()?.cid
      )
    ) {
      if (nextChannels.length > 0) {
        this.setAsActiveChannel(nextChannels[0]);
      } else {
        this.activeChannelSubject.next(undefined);
      }
    }
  };

  private messageListSetter = (messages: StreamMessage[]) => {
    this.activeChannelMessagesSubject.next(messages);
  };

  private threadListSetter = (messages: StreamMessage[]) => {
    this.activeThreadMessagesSubject.next(messages);
  };

  private parentMessageSetter = (message: StreamMessage | undefined) => {
    this.activeParentMessageIdSubject.next(message?.id);
  };
  private dismissErrorNotification?: () => void;
  private areReadEventsPaused = false;
  private markReadThrottleTime = 1050;
  private markReadTimeout?: ReturnType<typeof setTimeout>;
  private scheduledMarkReadRequest?: () => void;

  constructor(
    private chatClientService: ChatClientService,
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
    this.bouncedMessage$ = new BehaviorSubject<StreamMessage | undefined>(
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
            if (message) {
              return message;
            }
            // The parent message might not be in the currently loaded message list window (for example after a jump)
            const parentMessageFromThread =
              this.activeThread?.id === parentMessageId
                ? this.activeThread.state.getLatestValue().parentMessage
                : undefined;
            if (parentMessageFromThread) {
              return this.transformToStreamMessage(
                parentMessageFromThread,
                this.activeChannelSubject.getValue()
              );
            }
            void this.setAsActiveParentMessage(undefined);
            return undefined;
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
    this.activeChannelMessagesPaginationState$ =
      this.activeChannelMessagesPaginationStateSubject
        .asObservable()
        .pipe(shareReplay(1));
    this.activeThreadMessagesPaginationState$ =
      this.activeThreadMessagesPaginationStateSubject
        .asObservable()
        .pipe(shareReplay(1));
    this.channelQueryState$ = this.channelQueryStateSubject
      .asObservable()
      .pipe(shareReplay(1));
    this.channelSwitchState$ = this.channelSwitchStateSubject
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
        void this.sendMarkReadRequest(activeChannel);
      }
    }
    this._shouldMarkActiveChannelAsRead = shouldMarkActiveChannelAsRead;
  }

  /**
   * By default the SDK uses an offset based pagination, you can change/extend this by providing your own custom paginator method.
   *
   * The method will be called with the result of the latest channel query.
   *
   * You can return either an offset, or a filter using the [`$lte`/`$gte` operator](/docs/platform/query-syntax-operators/). If you return a filter, it will be merged with the filter provided for the `init` method.
   */
  set customPaginator(
    paginator:
      | ((channelQueryResult: Channel[]) => NextPageConfiguration)
      | undefined
  ) {
    this._customPaginator = paginator;
    if (this.channelQuery && 'customPaginator' in this.channelQuery) {
      this.channelQuery.customPaginator = this._customPaginator;
    }
  }

  /**
   * Sets the given `channel` as active and marks it as read.
   * If the channel wasn't previously part of the channel, it will be added to the beginning of the list.
   * @param channel
   */
  setAsActiveChannel(channel: Channel) {
    this.channelSwitchStateSubject.next('start');
    const prevActiveChannel = this.activeChannelSubject.getValue();
    if (prevActiveChannel?.cid === channel.cid) {
      return;
    }
    this.stopWatchForActiveChannelEvents(prevActiveChannel);
    this.releaseThread();
    this.flushMarkReadQueue();
    this.areReadEventsPaused = false;
    this.isMessageLoadingInProgress = false;
    const readState =
      channel.state.read[this.chatClientService.chatClient.user?.id || ''];
    this.activeChannelLastReadMessageId = readState?.last_read_message_id;
    if (
      channel.messagePaginator.anchoredHeadItem?.id ===
      this.activeChannelLastReadMessageId
    ) {
      this.activeChannelLastReadMessageId = undefined;
    }
    this.activeChannelUnreadCount = readState?.unread_messages || 0;
    this.addChannel(channel);
    this.activeChannelSubject.next(channel);
    this.watchForActiveChannelEvents(channel);
    // Activated channels are reloaded by stream-chat after a reconnect
    this.releaseActiveChannel = channel.activate();
    this.setChannelState(channel);
    this.channelSwitchStateSubject.next('end');
    if (!channel.initialized || channel.messagePaginator.items === undefined) {
      void this.loadInitialMessages(channel);
    }
  }

  /**
   * Deselects the currently active (if any) channel
   */
  deselectActiveChannel() {
    this.channelSwitchStateSubject.next('start');
    const activeChannel = this.activeChannelSubject.getValue();
    if (!activeChannel) {
      return;
    }
    this.stopWatchForActiveChannelEvents(activeChannel);
    this.releaseThread();
    this.flushMarkReadQueue();
    this.activeChannelMessagesSubject.next([]);
    this.activeChannelMessagesPaginationStateSubject.next(
      ChannelService.initialPaginationState
    );
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
    this.isMessageLoadingInProgress = false;
    this.channelSwitchStateSubject.next('end');
  }

  /**
   * Sets the given `message` as an active parent message. If `undefined` is provided, it will deleselect the current parent message.
   * @param message
   * @param _loadMessagesForm deprecated, thread replies are always loaded through the thread's message paginator
   */
  async setAsActiveParentMessage(
    message: StreamMessage | undefined,
    _loadMessagesForm: 'request' | 'state' = 'request'
  ) {
    const messageToQuote = this.messageToQuoteSubject.getValue();
    if (messageToQuote && !!messageToQuote.parent_id) {
      this.messageToQuoteSubject.next(undefined);
    }
    if (!message) {
      this.releaseThread();
      this.activeParentMessageIdSubject.next(undefined);
      this.activeThreadMessagesSubject.next([]);
      const messageToJumpTo = this.jumpToMessageSubject.getValue();
      if (messageToJumpTo && !!messageToJumpTo.parentId) {
        this.jumpToMessageSubject.next({ id: undefined, parentId: undefined });
      }
    } else {
      const activeChannel = this.activeChannelSubject.getValue();
      if (!activeChannel) {
        return;
      }
      if (this.activeThread?.id === message.id) {
        return;
      }
      this.releaseThread();
      const client = this.chatClientService.chatClient;
      const parentMessage =
        activeChannel.messagePaginator.getItem(message.id) ??
        convertStreamMessageToLocalMessage(message);
      const thread =
        client.threads.get(message.id) ??
        client.threads.ensure({ channel: activeChannel, parentMessage });
      this.activeThread = thread;
      this.activeParentMessageIdSubject.next(message.id);
      this.activeThreadPaginatorSubscriptions = this.bindMessagePaginator(
        thread.messagePaginator,
        this.activeThreadMessagesSubject,
        this.activeThreadMessagesPaginationStateSubject,
        () => this.activeThread === thread
      );
      if (thread.hasStaleState) {
        // Load before activation: activating a stale thread also triggers a reload in stream-chat, but without error handling (that reload is skipped while this one is in progress)
        this.activeThreadMessagesPaginationStateSubject.next({
          ...this.activeThreadMessagesPaginationStateSubject.getValue(),
          isLoading: true,
        });
        try {
          await thread.reload();
        } catch (error) {
          if (this.activeThread === thread) {
            this.activeThreadMessagesPaginationStateSubject.next({
              ...this.activeThreadMessagesPaginationStateSubject.getValue(),
              isLoading: false,
              error: error as Error,
            });
            this.notificationService.addTemporaryNotification(
              'streamChat.Error loading messages'
            );
          }
        }
      }
      if (
        !thread.hasStaleState &&
        thread.messagePaginator.items === undefined &&
        thread.state.getLatestValue().replyCount === 0
      ) {
        // stream-chat doesn't load threads without replies, so the reply list keeps the paginator defaults (has more older and newer replies). Mark it complete, otherwise the first reply makes the message list think it shows an older reply window and jump to the latest replies.
        // `items` stays `undefined`: stream-chat only places the replies of a reload (for example after a reconnect) as a first page when nothing is loaded, an empty list would make it drop them.
        thread.messagePaginator.state.partialNext({
          hasMoreHead: false,
          hasMoreTail: false,
        });
      }
      if (this.activeThread === thread && !this.releaseActiveThread) {
        this.releaseActiveThread = thread.activate();
      }
    }
  }

  /**
   * Loads the next page of messages of the active channel.
   * @param direction
   * @returns `false` if there are no more messages to load in the given direction, otherwise a `Promise` that resolves when the page is loaded
   */
  loadMoreMessages(direction: 'older' | 'newer' = 'older') {
    const activeChannel = this.activeChannelSubject.getValue();
    if (!activeChannel) {
      return false;
    }
    return this.loadMore(activeChannel.messagePaginator, direction);
  }

  /**
   * Loads the next page of messages of the active thread.
   * @param direction
   * @returns `false` if there are no more replies to load in the given direction, otherwise a `Promise` that resolves when the page is loaded
   */
  loadMoreThreadReplies(direction: 'older' | 'newer' = 'older') {
    if (!this.activeThread) {
      return false;
    }
    return this.loadMore(this.activeThread.messagePaginator, direction);
  }

  private loadMore(
    paginator: MessageIntervalPaginator,
    direction: 'older' | 'newer'
  ) {
    const hasMore =
      direction === 'older' ? paginator.hasMoreTail : paginator.hasMoreHead;
    if (!hasMore || paginator.isLoading) {
      return false;
    }
    // There is no loaded message to paginate from (for example the channel/thread is empty), no need for a request
    if (!paginator.items?.length) {
      return false;
    }
    return (direction === 'older' ? paginator.toTail() : paginator.toHead())
      .then(() => {
        const error = paginator.lastQueryError;
        if (error) {
          throw error;
        }
      })
      .catch((error: Error) => {
        this.chatClientService.logger.warn(
          `Failed to load ${direction} messages`,
          { error }
        );
        throw error;
      });
  }

  /**
   * Queries the channels with the given filters, sorts and options. More info about [channel querying](/chat/docs/javascript/query-channels/) can be found in the platform documentation. By default the first channel in the list will be set as active channel and will be marked as read.
   * @param filters
   * @param sort
   * @param options
   * @param shouldSetActiveChannel Decides if the first channel in the result should be made as an active channel or not.
   * @returns the list of channels found by the query
   */
  init(
    filters: ChannelFilters,
    sort?: ChannelSort,
    options?: ChannelOptions,
    shouldSetActiveChannel: boolean = true
  ) {
    this.channelQuery = new ChannelQuery(
      this.chatClientService,
      this,
      filters,
      sort || [{ field: 'last_message_at', direction: -1 }],
      {
        limit: 25,
        state: true,
        presence: true,
        watch: true,
        message_limit: this.messagePageSize,
        ...options,
      }
    );
    this.channelQuery.customPaginator = this._customPaginator;

    return this._init({
      shouldSetActiveChannel,
      messagePageSize: options?.message_limit ?? this.messagePageSize,
    });
  }

  /**
   * Queries the channels with the given query function. More info about [channel querying](/chat/docs/javascript/query-channels/) can be found in the platform documentation.
   * @param query
   * @param options
   * @param options.shouldSetActiveChannel The `shouldSetActiveChannel` specifies if the first channel in the result should be selected as the active channel or not. Default is `true`.
   * @param options.messagePageSize How many messages should we load? The default is 25
   * @returns the channels that were loaded
   */
  initWithCustomQuery(
    query: (queryType: ChannelQueryType) => Promise<ChannelQueryResult>,
    options: { shouldSetActiveChannel: boolean; messagePageSize: number } = {
      shouldSetActiveChannel: true,
      messagePageSize: this.messagePageSize,
    }
  ) {
    this.channelQuery = query;
    return this._init(options);
  }

  /**
   * Resets the `activeChannel$`, `channels$` and `activeChannelMessages$` Observables. Useful when disconnecting a chat user, use in combination with [`disconnectUser`](/chat/docs/sdk/angular/services/ChatClientService/#disconnectuser).
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
  }

  /**
   * Loads the next page of channels. The page size can be set in the [query option](/chat/docs/javascript/query-channels/#query-options) object.
   */
  async loadMoreChannels() {
    await this.queryChannels(false, 'next-page');
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
    customData?: CustomReactionData
  ) {
    await this.activeChannelSubject.getValue()?.sendReaction(
      { id: messageId },
      {
        reaction: {
          type: reactionType,
          custom: customData,
        },
      }
    );
  }

  /**
   * Removes a reaction from a message.
   * @param messageId The id of the message to remove the reaction from
   * @param reactionType Thr type of reaction to remove
   */
  async removeReaction(messageId: string, reactionType: MessageReactionType) {
    await this.activeChannelSubject
      .getValue()
      ?.deleteReaction({ id: messageId, type: reactionType });
  }

  /**
   * Sends a message to the active channel. The message is immediately added to the message list, if an error occurs and the message can't be sent, the error is indicated in `state` of the message.
   * @param text The text of the message
   * @param attachments The attachments
   * @param mentionedUsers Mentioned users
   * @param parentId Id of the parent message (if sending a thread reply)
   * @param quotedMessageId Id of the message to quote (if sending a quote reply)
   * @param customData
   * @param pollId Id of the poll (if sending a poll message)
   */
  async sendMessage(
    text: string,
    attachments: Attachment[] = [],
    mentionedUsers: UserResponse[] = [],
    parentId: string | undefined = undefined,
    quotedMessageId: string | undefined = undefined,
    customData: undefined | CustomMessageData = undefined,
    pollId: string | undefined = undefined
  ) {
    let input: MessageInput = {
      text,
      attachments,
      mentionedUsers,
      parentId,
      quotedMessageId,
      customData,
      pollId,
    };
    if (this.beforeSendMessage) {
      input = await this.beforeSendMessage(input);
    }
    const preview = createMessagePreview(
      this.chatClientService.chatClient.user as UserResponse,
      input.text,
      input.attachments,
      input.mentionedUsers,
      input.parentId,
      input.quotedMessageId,
      input.customData,
      input.pollId
    );
    // stream-chat's message paginator only accepts messages of its own channel (filtered by cid)
    preview.cid = this.activeChannelSubject.getValue()!.cid;
    this.getMessagePaginator(preview.parent_id)?.ingestItem(preview);
    const response = await this.sendMessageRequest(preview, input.customData);
    return response;
  }

  /**
   * Resends the given message to the active channel
   * @param message The message to resend
   */
  async resendMessage(message: StreamMessage) {
    this.errorStatusCodes.delete(message.id);
    // Use the given message, not the stored one: editing a bounced message resends it with the new content
    const localMessage = convertStreamMessageToLocalMessage(message);
    this.getMessagePaginator(message.parent_id)?.ingestItem({
      ...localMessage,
      status: 'sending',
    });
    return this.sendMessageRequest(localMessage, undefined, true);
  }

  /**
   * Updates the message in the active channel
   * @param message Mesage to be updated
   */
  async updateMessage(message: StreamMessage) {
    let messageToUpdate: StreamMessage = {
      ...message,
    };
    const originalMessage = message;
    if (messageToUpdate.quoted_message) {
      messageToUpdate.quoted_message = {
        ...messageToUpdate.quoted_message,
      };
    }
    delete messageToUpdate.i18n;
    if (this.beforeUpdateMessage) {
      messageToUpdate = await this.beforeUpdateMessage(messageToUpdate);
    }
    if (messageToUpdate.readBy) {
      // @ts-expect-error this is only a run time proparty for the SDK
      delete messageToUpdate.readBy;
    }
    if (messageToUpdate.translation) {
      delete messageToUpdate.translation;
    }
    if (messageToUpdate.quoted_message?.translation) {
      delete messageToUpdate.quoted_message.translation;
    }
    if (
      originalMessage.type === 'error' &&
      originalMessage.moderation?.action === 'bounce'
    ) {
      return this.resendMessage(messageToUpdate);
    }
    const response = await this.chatClientService.chatClient.updateMessage(
      { id: messageToUpdate.id },
      { message: this.toMessageRequest(messageToUpdate) }
    );

    const channel = this.channelsSubject
      .getValue()
      ?.find((c) => c.cid === message.cid);

    if (response.message.type === 'error' && response.message.moderation) {
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
      this.getMessagePaginator(message.parent_id)?.removeItem({
        id: message.id,
      });
      this.errorStatusCodes.delete(message.id);
      return;
    }
    if (this.messageDeleteConfirmationHandler) {
      const result = await this.messageDeleteConfirmationHandler(message);
      if (result) {
        await this.chatClientService.chatClient.deleteMessage({
          id: message.id,
        });
      }
    } else {
      await this.chatClientService.chatClient.deleteMessage({ id: message.id });
    }
  }

  /**
   * Uploads files to the channel. If you want to know more about [file uploads](/chat/docs/javascript/file-uploads/) check out the platform documentation.
   * @param uploads the attachments to upload (output of the [`AttachmentService`](/chat/docs/sdk/angular/services/AttachmentService/))
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
            : channel.uploadImage({ file: upload.file })
          : this.customFileUploadRequest
          ? this.customFileUploadRequest(upload.file, channel)
          : channel.uploadFile({ file: upload.file })
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
          url: uploadResult.value.file!,
          /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
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
        if (
          code === 22 ||
          (code === 4 && message?.toLowerCase()?.includes('bytes'))
        ) {
          reason = 'file-size';
          extraData = {
            param:
              /\d+MB|\d+\s?bytes/.exec(message || '')?.[0] ||
              `${this.attachmentMaxSizeFallbackInMB}MB`,
          };
          if (extraData.param.includes('bytes')) {
            const limitInBytes = +(
              /\d+/.exec(extraData.param)?.[0] ||
              this.attachmentMaxSizeFallbackInMB * 1024 * 1024
            );
            extraData.param = `${limitInBytes / (1024 * 1024)}MB`;
          }
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
   * Deletes an uploaded file by URL. If you want to know more about [file uploads](/chat/docs/javascript/file-uploads/) check out the platform documentation
   * @param attachmentUpload Attachment to be deleted (output of the [`AttachmentService`](/chat/docs/sdk/angular/services/AttachmentService/))
   */
  async deleteAttachment(attachmentUpload: AttachmentUpload) {
    const channel = this.activeChannelSubject.getValue()!;
    await (attachmentUpload.type === 'image'
      ? this.customImageDeleteRequest
        ? this.customImageDeleteRequest(attachmentUpload.url!, channel)
        : channel.deleteImage({ url: attachmentUpload.url! })
      : this.customFileDeleteRequest
      ? this.customFileDeleteRequest(attachmentUpload.url!, channel)
      : channel.deleteFile({ url: attachmentUpload.url! }));
  }

  /**
   * Returns the autocomplete options for current channel members. If member_count is equal to the number of members in the channel, it returns the channel members, otherwise sends a [search request](/chat/docs/javascript/query-members/#paginating-channel-members) with the given search term.
   * @param searchTerm Text to search for in the names of members
   * @returns The list of members matching the search filter
   */
  async autocompleteMembers(searchTerm: string) {
    const activeChannel = this.activeChannelSubject.getValue();
    if (!activeChannel) {
      return [];
    }
    if (
      Object.keys(activeChannel.state.members).length ===
      (activeChannel.data?.member_count ?? 0)
    ) {
      return Object.values(activeChannel.state.members).filter(
        (m) => m.user?.id !== this.chatClientService.chatClient.userID!
      );
    } else {
      if (!searchTerm) {
        return [];
      }
      const result = await activeChannel.queryMembers({
        payload: {
          filter_conditions: {
            name: { $autocomplete: searchTerm },
          } as MemberFilters,
        },
      });

      return result.members.filter(
        (m) => m.user_id !== this.chatClientService.chatClient?.user?.id
      );
    }
  }

  /**
   * [Runs a message action](https://getstream.github.io/protocol/?urls.primaryName=Chat#/product%3Achat/RunMessageAction) in the current channel. Updates the message list based on the action result (if no message is returned, the message will be removed from the message list).
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
    const paginator = this.getMessagePaginator(parentMessageId);
    if (response?.message) {
      paginator?.ingestItem(
        formatMessage({
          ...response.message,
          status: 'received',
        } as LocalMessage)
      );
    } else {
      paginator?.removeItem({ id: messageId });
    }
  }

  /**
   * Selects or deselects the current message to quote reply to
   * @param message The message to select, if called with `undefined`, it deselects the message
   */
  selectMessageToQuote(
    message: StreamMessage | undefined | MessageResponse | LocalMessage
  ) {
    this.messageToQuoteSubject.next(
      message
        ? this.transformToStreamMessage(message, this.activeChannel)
        : undefined
    );
  }

  /**
   * Add a new channel to the channel list
   * The channel will be added to the beginning of the channel list
   * @param channel
   */
  addChannel(channel: Channel) {
    if (!this.channels.find((c) => c.cid === channel.cid)) {
      this.channelsSubject.next([channel, ...this.channels]);
      this.watchForChannelEvents(channel);
    }
  }

  /**
   *
   * @param cid
   * @param shouldStopWatching
   */
  removeChannel(cid: string, shouldStopWatching = true) {
    const remainingChannels = this.channels.filter((c) => c.cid !== cid);

    if (shouldStopWatching) {
      if (this.channelSubscriptions[cid]) {
        this.channelSubscriptions[cid]();
        delete this.channelSubscriptions.cid;
      }
      void this.chatClientService.chatClient.channelManager
        .get(cid)
        ?.stopWatching()
        .catch((error) =>
          this.chatClientService.logger.warn('Failed to unwatch channel', {
            error: error as Error,
          })
        );
    }

    if (remainingChannels.length < this.channels.length) {
      this.channelsSubject.next(remainingChannels);
      if (cid === this.activeChannelSubject.getValue()?.cid) {
        if (remainingChannels.length > 0) {
          this.setAsActiveChannel(remainingChannels[0]);
        } else {
          this.activeChannelSubject.next(undefined);
        }
      }
    }
  }

  private async sendMessageRequest(
    preview: LocalMessage,
    customData?: CustomMessageData,
    isResend = false
  ) {
    const channel = this.activeChannelSubject.getValue()!;
    const paginator = this.getMessagePaginator(preview.parent_id);
    try {
      const response = await channel.sendMessage({
        message: {
          id: preview.id,
          text: preview.text,
          attachments: preview.attachments,
          mentioned_users: preview.mentioned_users?.map((u) => u.id),
          parent_id: preview.parent_id,
          quoted_message_id: preview.quoted_message_id,
          poll_id: preview.poll_id,
          custom: customData ?? preview.custom,
        },
      });
      paginator?.ingestItem(
        formatMessage({
          ...response.message,
          status: 'received',
        } as LocalMessage)
      );
      return this.getSentMessage(preview);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      this.errorStatusCodes.set(
        preview.id,
        isAlreadyExists ? undefined : parsedError.status || undefined
      );
      paginator?.ingestItem({
        ...(paginator.getItem(preview.id) ?? preview),
        status: isAlreadyExists ? 'received' : 'failed',
      });
      return this.getSentMessage(preview);
    }
  }

  private getSentMessage(preview: LocalMessage) {
    const paginator = this.getMessagePaginator(preview.parent_id);
    const message = paginator?.getItem(preview.id) ?? preview;
    return this.transformToStreamMessage(
      message,
      this.activeChannelSubject.getValue()
    );
  }

  /**
   * Jumps to the selected message inside the message list, if the message is not yet loaded, it'll load the message (and it's surroundings) from the API.
   * @param messageId The ID of the message to be loaded, 'latest' means jump to the latest messages
   * @param parentMessageId The ID of the parent message if we want to load a thread message
   */
  async jumpToMessage(messageId: string, parentMessageId?: string) {
    this.isMessageLoadingInProgress = true;
    const activeChannel = this.activeChannelSubject.getValue();
    try {
      if (!activeChannel) {
        throw new Error('No active channel');
      }
      if (parentMessageId) {
        // The parent message is displayed in the main message list as well (and activeParentMessage$ reads it from there)
        const isParentLoaded = !!activeChannel.messagePaginator.items?.find(
          (m) => m.id === parentMessageId
        );
        if (!isParentLoaded) {
          await activeChannel.messagePaginator.jumpToMessage(parentMessageId, {
            pageSize: this.messagePageSize,
            suppressFocusSignal: true,
          });
          activeChannel.messagePaginator.flushState();
        }
        if (this.activeThread?.id !== parentMessageId) {
          const parentMessage = await this.getMessage(
            activeChannel,
            parentMessageId
          );
          await this.setAsActiveParentMessage(
            this.transformToStreamMessage(parentMessage, activeChannel)
          );
        }
      }
      const paginator = parentMessageId
        ? this.activeThread?.messagePaginator
        : activeChannel.messagePaginator;
      if (!paginator) {
        throw new Error('Message paginator not found');
      }
      const isSuccess =
        messageId === 'latest'
          ? await paginator.jumpToTheLatestMessage({
              suppressFocusSignal: true,
            })
          : await paginator.jumpToMessage(messageId, {
              pageSize: this.messagePageSize,
              suppressFocusSignal: true,
            });
      if (!isSuccess) {
        throw new Error(`Unable to jump to message ${messageId}`);
      }
      // Make sure activeChannelMessages$ and activeThreadMessages$ are updated before the message list receives the jump instruction
      paginator.flushState();
      this.jumpToMessageSubject.next({
        id: messageId,
        parentId: parentMessageId,
      });
    } catch (error) {
      this.notificationService.addTemporaryNotification(
        'streamChat.Message not found'
      );
      throw error;
    } finally {
      this.isMessageLoadingInProgress = false;
    }
  }

  /**
   * Jumps to the first unread message of the active channel, if the message is not yet loaded, it'll load the message (and it's surroundings) from the API.
   * @returns `true` if the jump was successful
   */
  async jumpToFirstUnreadMessage() {
    const activeChannel = this.activeChannelSubject.getValue();
    if (!activeChannel) {
      return false;
    }
    this.isMessageLoadingInProgress = true;
    try {
      const paginator = activeChannel.messagePaginator;
      const isSuccess = await paginator.jumpToTheFirstUnreadMessage({
        pageSize: this.messagePageSize,
      });
      if (!isSuccess) {
        return false;
      }
      paginator.flushState();
      // The SDK has its own scroll/highlight logic, the focus signal is only used to know the jump target
      const messageId =
        paginator.messageFocusSignal.getLatestValue().signal?.messageId;
      if (messageId) {
        this.jumpToMessageSubject.next({ id: messageId });
      }
      return true;
    } catch (error) {
      this.notificationService.addTemporaryNotification(
        'streamChat.Message not found'
      );
      throw error;
    } finally {
      this.isMessageLoadingInProgress = false;
    }
  }

  /**
   * Clears the currently selected message to jump
   */
  clearMessageJump() {
    this.jumpToMessageSubject.next({ id: undefined, parentId: undefined });
  }

  /**
   * Pins the given message in the channel
   * @param message
   */
  async pinMessage(message: StreamMessage) {
    try {
      await this.chatClientService.chatClient?.pinMessage({ id: message.id });
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
  async unpinMessage(message: StreamMessage) {
    try {
      await this.chatClientService.chatClient?.unpinMessage({ id: message.id });
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

  private handleNotification(clientEvent: ClientEvent) {
    switch (clientEvent.eventType) {
      case 'connection.recovered': {
        void this.ngZone.run(async () => {
          if (this.isStateRecoveryInProgress) {
            return;
          }
          this.isStateRecoveryInProgress = true;
          try {
            // If channel list is not inited, we set the active channel
            const shoulSetActiveChannel =
              this.shouldSetActiveChannel &&
              !this.activeChannelSubject.getValue();
            await this.queryChannels(
              shoulSetActiveChannel || false,
              'recover-state'
            );
            const activeChannel = this.activeChannelSubject.getValue();
            if (activeChannel) {
              // The active channel and thread are activated, so stream-chat reloads them after reconnect, the message lists are updated by the paginator subscriptions, the active thread can stay open
              this.markRead(activeChannel);
              // Update and reselect message to quote
              const messageToQuote = this.messageToQuoteSubject.getValue();
              let messages!: StreamMessage[];
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
          // stream-chat updates the user objects in the messages, message lists are updated via the paginators
          const channels = this.channelsSubject.getValue();
          if (channels) {
            this.channelsSubject.next([...channels]);
          }
          const activeChannel = this.activeChannelSubject.getValue();
          if (activeChannel) {
            this.activeChannelSubject.next(activeChannel);
            // Refresh the users of the readBy lists (same as before stream-chat v10)
            this.refreshReadBy(activeChannel, 'all');
          }
        });
        break;
      }
    }
  }

  private getEventChannel(event: Event) {
    return 'channel' in event
      ? (event.channel as ChannelResponse | undefined)
      : undefined;
  }

  private handleRemovedFromChannelNotification(clientEvent: ClientEvent) {
    const channel = this.getEventChannel(clientEvent.event);
    if (channel) {
      this.removeChannel(channel.cid, true);
    }
  }

  private handleNewMessageNotification(clientEvent: ClientEvent) {
    const channel = this.getEventChannel(clientEvent.event);
    if (channel) {
      void this.addChannelFromNotification(channel);
    }
  }

  private handleAddedToChannelNotification(clientEvent: ClientEvent) {
    const channel = this.getEventChannel(clientEvent.event);
    if (channel) {
      void this.addChannelFromNotification(channel);
    }
  }

  private async addChannelFromNotification(channelResponse: ChannelResponse) {
    const newChannel = this.chatClientService.chatClient.channel(
      channelResponse.type,
      channelResponse.id
    );
    let currentChannels = this.channelsSubject.getValue() || [];
    if (currentChannels.find((c) => c.cid === newChannel.cid)) {
      return;
    }
    try {
      await newChannel.watch();
    } catch (error) {
      this.chatClientService.logger.error(
        'Failed to add channel to channel list because watch request failed',
        { error: error as Error }
      );
    }
    currentChannels = this.channelsSubject.getValue() || [];
    if (currentChannels.find((c) => c.cid === newChannel.cid)) {
      return;
    }
    this.watchForChannelEvents(newChannel);
    this.channelsSubject.next([newChannel, ...currentChannels]);
  }

  private watchForActiveChannelEvents(channel: Channel) {
    this.activeChannelPaginatorSubscriptions = [
      ...this.bindMessagePaginator(
        channel.messagePaginator,
        this.activeChannelMessagesSubject,
        this.activeChannelMessagesPaginationStateSubject,
        () => this.activeChannelSubject.getValue() === channel
      ),
      channel.pinnedMessagesPaginator.state.subscribeWithSelector(
        (state) => ({ items: state.items }),
        ({ items }) => {
          this.ngZone.run(() => {
            if (this.activeChannelSubject.getValue() !== channel) {
              return;
            }
            this.activeChannelPinnedMessagesSubject.next(
              (items ?? []).map((m) =>
                this.transformToStreamMessage(m, channel)
              )
            );
          });
        }
      ),
      // read state changes (for example message.read events): update the readBy property of the latest message (same as before stream-chat v10)
      channel.state.subscribeWithSelector(
        (state) => ({ read: state.read }),
        (_, prev) => {
          if (!prev) {
            return;
          }
          this.ngZone.run(() => {
            if (this.activeChannelSubject.getValue() !== channel) {
              return;
            }
            this.refreshReadBy(channel, 'latest');
          });
        }
      ),
    ];
    this.activeChannelSubscriptions.push(
      channel.on('message.new', (event) => {
        this.ngZone.run(() => {
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
      this.chatClientService.events$
        .pipe(
          filter(
            (e) =>
              e.eventType === 'notification.mark_unread' &&
              e.event.type === 'notification.mark_unread' &&
              e.event.channel_id === channel.id
          ),
          map(
            (e) =>
              e.event as Extract<Event, { type: 'notification.mark_unread' }>
          )
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
   * Subscribes to the given message paginator, and emits the message list and pagination state via the provided subjects
   * @param paginator
   * @param messagesSubject
   * @param paginationStateSubject
   * @param isActive
   */
  private bindMessagePaginator(
    paginator: MessageIntervalPaginator,
    messagesSubject: BehaviorSubject<
      (StreamMessage | MessageResponse | LocalMessage)[]
    >,
    paginationStateSubject: BehaviorSubject<MessageListPaginationState>,
    isActive: () => boolean
  ) {
    return [
      paginator.state.subscribeWithSelector(
        (state) => ({
          items: state.items,
          hasMoreTail: state.hasMoreTail,
          hasMoreHead: state.hasMoreHead,
          isLoading: state.isLoading,
          lastQueryError: state.lastQueryError,
        }),
        (state, prev) => {
          this.ngZone.run(() => {
            if (!isActive()) {
              return;
            }
            // hasMoreHead is also used to decide if the latest message is in the list
            if (
              !prev ||
              state.items !== prev.items ||
              state.hasMoreHead !== prev.hasMoreHead
            ) {
              messagesSubject.next(state.items ?? []);
            }
            paginationStateSubject.next({
              hasMoreOlder: state.hasMoreTail,
              hasMoreNewer: state.hasMoreHead,
              isLoading: state.isLoading,
              error: state.lastQueryError,
            });
          });
        }
      ),
    ];
  }

  private getMessagePaginator(parentId?: string) {
    if (parentId) {
      return this.activeThread?.id === parentId
        ? this.activeThread.messagePaginator
        : this.chatClientService.chatClient.threads.get(parentId)
            ?.messagePaginator;
    }
    return this.activeChannelSubject.getValue()?.messagePaginator;
  }

  private async getMessage(channel: Channel, messageId: string) {
    const message = channel.messagePaginator.getItem(messageId);
    if (message) {
      return message;
    }
    const response = await channel.getMessagesById([messageId]);
    const result = response.messages?.[0];
    if (!result) {
      throw new Error(`Message ${messageId} not found`);
    }
    return formatMessage(result);
  }

  private toMessageRequest(message: StreamMessage): MessageRequest {
    const localMessage = convertStreamMessageToLocalMessage(message);
    return {
      id: localMessage.id,
      text: localMessage.text,
      attachments: localMessage.attachments,
      mentioned_users: localMessage.mentioned_users?.map((u) => u.id),
      parent_id: localMessage.parent_id,
      show_in_channel: localMessage.show_in_channel,
      quoted_message_id: localMessage.quoted_message_id,
      poll_id: localMessage.poll_id,
      pinned: localMessage.pinned,
      silent: localMessage.silent,
      custom: localMessage.custom,
    };
  }

  private releaseThread() {
    this.activeThreadPaginatorSubscriptions.forEach((unsubscribe) =>
      unsubscribe()
    );
    this.activeThreadPaginatorSubscriptions = [];
    this.releaseActiveThread?.();
    this.releaseActiveThread = undefined;
    this.activeThread = undefined;
    this.activeThreadMessagesPaginationStateSubject.next(
      ChannelService.initialPaginationState
    );
  }

  private async loadInitialMessages(channel: Channel) {
    this.activeChannelMessagesPaginationStateSubject.next({
      ...this.activeChannelMessagesPaginationStateSubject.getValue(),
      isLoading: true,
      error: undefined,
    });
    try {
      await channel.watch();
    } catch (error) {
      if (this.activeChannelSubject.getValue() === channel) {
        this.activeChannelMessagesPaginationStateSubject.next({
          ...this.activeChannelMessagesPaginationStateSubject.getValue(),
          isLoading: false,
          error: error as Error,
        });
        this.notificationService.addTemporaryNotification(
          'streamChat.Error loading messages'
        );
      }
    }
  }

  /**
   * Retries loading the messages of the active channel (for example after a failed request)
   */
  async reloadActiveChannelMessages() {
    const channel = this.activeChannelSubject.getValue();
    if (!channel) {
      return;
    }
    if (!channel.initialized) {
      await this.loadInitialMessages(channel);
    } else {
      await channel.messagePaginator.reload();
    }
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
   * The current thread replies
   */
  get activeChannelThreadReplies() {
    return this.activeThreadMessagesSubject.getValue() || [];
  }

  /**
   * Get the last 1200 reactions of a message in the current active channel. If you need to fetch more reactions please use the [following endpoint](/chat/docs/javascript/send-reaction/#paginating-reactions).
   * @deprecated use [`messageReactionsService.queryReactions()`](/chat/docs/sdk/angular/services/MessageReactionsService/#queryreactions) instead
   * @param messageId
   * @returns all reactions of a message
   */
  async getMessageReactions(messageId: string) {
    const reactions: ReactionResponse[] = [];
    const limit = 300;
    let offset = 0;
    const reactionsLimit = ChannelService.MAX_MESSAGE_REACTIONS_TO_FETCH;
    let lastPageSize = limit;

    while (lastPageSize === limit && reactions.length < reactionsLimit) {
      try {
        const response = await this.chatClientService.chatClient.getReactions(
          { id: messageId },
          {
            offset,
            limit,
          }
        );
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  private stopWatchForActiveChannelEvents(channel: Channel | undefined) {
    if (!channel) {
      return;
    }
    this.activeChannelSubscriptions.forEach((s) => s.unsubscribe());
    this.activeChannelSubscriptions = [];
    this.activeChannelPaginatorSubscriptions.forEach((unsubscribe) =>
      unsubscribe()
    );
    this.activeChannelPaginatorSubscriptions = [];
    channel.messagePaginator.setViewingLive(false);
    this.latestStreamMessageById.clear();
    this.releaseActiveChannel?.();
    this.releaseActiveChannel = undefined;
  }

  private async queryChannels(
    shouldSetActiveChannel: boolean,
    queryType: ChannelQueryType
  ) {
    if (!this.channelQuery) {
      throw new Error(
        'Query channels called before initializing ChannelQuery instance'
      );
    }
    try {
      this.channelQueryStateSubject.next({ state: 'in-progress' });

      const { channels, hasMorePage } = await ('query' in this.channelQuery
        ? this.channelQuery.query(queryType)
        : this.channelQuery(queryType));
      const filteredChannels = channels.filter(
        (channel, index) =>
          !channels.slice(0, index).find((c) => c.cid === channel.cid)
      );
      filteredChannels.forEach((c) => {
        if (!this.channelSubscriptions[c.cid]) {
          this.watchForChannelEvents(c);
        }
      });

      this.channelsSubject.next(filteredChannels);
      const currentActiveChannel = this.activeChannelSubject.getValue();
      if (
        currentActiveChannel &&
        !filteredChannels.find((c) => c.cid === currentActiveChannel?.cid)
      ) {
        this.deselectActiveChannel();
      } else if (
        filteredChannels.length > 0 &&
        !currentActiveChannel &&
        shouldSetActiveChannel
      ) {
        this.setAsActiveChannel(filteredChannels[0]);
      }
      this.hasMoreChannelsSubject.next(hasMorePage);
      this.channelQueryStateSubject.next({ state: 'success' });
      this.dismissErrorNotification?.();
      return channels;
    } catch (error) {
      this.channelQueryStateSubject.next({
        state: 'error',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        error,
      });
      throw error;
    }
  }

  private watchForChannelEvents(channel: Channel) {
    if (this.channelSubscriptions[channel.cid]) {
      this.channelSubscriptions[channel.cid]();
    }
    const unsubscribe = channel.on((event: Event) => {
      const type: EventType = event.type;
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
            const cid = 'cid' in event ? event.cid : undefined;
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

  private handleNewMessage(_: Event, channel: Channel) {
    const channelIndex = this.channels.findIndex((c) => c.cid === channel.cid);
    this.channels.splice(channelIndex, 1);
    this.channelsSubject.next([channel, ...this.channels]);
  }

  private handleChannelHidden(event: Event) {
    const cid = 'cid' in event ? event.cid : undefined;
    if (cid) {
      this.removeChannel(cid, false);
    }
  }

  private handleChannelDeleted(event: Event) {
    const cid = 'cid' in event ? event.cid : undefined;
    if (cid) {
      this.removeChannel(cid, false);
    }
  }

  private handleChannelVisible(_: Event, channel: Channel) {
    if (!this.channels.find((c) => c.cid === channel.cid)) {
      this.ngZone.run(() =>
        this.channelsSubject.next([...this.channels, channel])
      );
    }
  }

  private handleChannelUpdate(event: Event) {
    const cid = 'cid' in event ? event.cid : undefined;
    const channelIndex = this.channels.findIndex((c) => c.cid === cid);
    if (channelIndex !== -1) {
      // stream-chat updates channel.data (and keeps hidden, own_capabilities and member_count)
      const channel = this.channels[channelIndex];
      this.channelsSubject.next([...this.channels]);
      if (cid === this.activeChannelSubject.getValue()?.cid) {
        this.activeChannelSubject.next(channel);
      }
    }
  }

  private handleChannelTruncate(event: Event) {
    const cid = 'cid' in event ? event.cid : undefined;
    const channelIndex = this.channels.findIndex((c) => c.cid === cid);
    if (channelIndex !== -1) {
      // stream-chat truncates the message paginator, message list is updated via the paginator
      this.channelsSubject.next([...this.channels]);
      if (cid === this.activeChannelSubject.getValue()?.cid) {
        const channel = this.activeChannelSubject.getValue()!;
        this.activeChannelSubject.next(channel);
        void this.setAsActiveParentMessage(undefined);
      }
    }
  }

  private get canSendReadEvents() {
    const channel = this.activeChannelSubject.getValue();
    if (!channel) {
      return false;
    }
    const capabilites = channel.data?.own_capabilities ?? [];
    return (
      capabilites.indexOf('read-events') !== -1 &&
      channel.config.readEvents.enabled
    );
  }

  private transformToStreamMessage(
    message: StreamMessage | MessageResponse | LocalMessage,
    channel?: Channel
  ): StreamMessage {
    const isThreadMessage = !!message.parent_id;
    const user = this.chatClientService.chatClient.user;
    if (message.created_at instanceof Date) {
      // Already a StreamMessage (for example set via a custom handler)
      const streamMessage = message as StreamMessage;
      return {
        ...streamMessage,
        translation: getMessageTranslation(streamMessage, channel, user),
        quoted_message: streamMessage.quoted_message
          ? {
              ...streamMessage.quoted_message,
              translation: getMessageTranslation(
                streamMessage.quoted_message,
                channel,
                user
              ),
            }
          : undefined,
      };
    }
    const localMessage = message as LocalMessage | MessageResponse;
    const errorStatusCode = this.errorStatusCodes.get(localMessage.id);
    const cached = this.streamMessageCache.get(localMessage);
    // readBy is calculated when the message object is created, after that it's only updated by refreshReadBy (same as before stream-chat v10)
    if (cached && cached.errorStatusCode === errorStatusCode) {
      return cached.message;
    }
    // Messages are stored by stream-chat, they shouldn't be mutated, we create a new object instead
    const converted = convertMessageDatesToDate(localMessage);
    const streamMessage: StreamMessage = {
      ...converted,
      status: (localMessage as LocalMessage).status || 'received',
      readBy: isThreadMessage
        ? []
        : channel
        ? getReadBy(converted, channel)
        : [],
      translation: getMessageTranslation(localMessage, channel, user),
      errorStatusCode,
      quoted_message: converted.quoted_message
        ? {
            ...converted.quoted_message,
            translation: getMessageTranslation(
              localMessage.quoted_message,
              channel,
              user
            ),
          }
        : undefined,
    };
    // Every API response/WS event contains newly signed attachment URLs (only the query string changes), reusing the previous attachments avoids reloading images/videos (for example when a reaction is added)
    const previousMessage = this.latestStreamMessageById.get(localMessage.id);
    if (
      previousMessage &&
      this.areAttachmentsEquivalent(
        previousMessage.attachments,
        streamMessage.attachments
      )
    ) {
      streamMessage.attachments = previousMessage.attachments;
    }
    this.latestStreamMessageById.set(localMessage.id, streamMessage);
    this.streamMessageCache.set(localMessage, {
      errorStatusCode,
      message: streamMessage,
    });
    return streamMessage;
  }

  /**
   * Recalculates the readBy property of the latest (or all) messages of the active channel, and emits the message list if anything changed
   * @param channel
   * @param scope
   */
  private refreshReadBy(channel: Channel, scope: 'latest' | 'all') {
    const messages = this.activeChannelMessagesSubject.getValue();
    const messagesToRefresh =
      scope === 'latest' ? messages.slice(-1) : messages;
    let isChanged = false;
    messagesToRefresh.forEach((message) => {
      const cached = this.streamMessageCache.get(message);
      if (!cached || cached.message.parent_id) {
        return;
      }
      const readBy = getReadBy(cached.message, channel);
      if (!this.isSameUserList(readBy, cached.message.readBy)) {
        cached.message = { ...cached.message, readBy };
        this.latestStreamMessageById.set(cached.message.id, cached.message);
        isChanged = true;
      }
    });
    if (isChanged) {
      this.activeChannelMessagesSubject.next([...messages]);
    }
  }

  private isSameUserList(users1: UserResponse[], users2: UserResponse[]) {
    return (
      users1.length === users2.length &&
      users1.every(
        (u, i) =>
          u.id === users2[i]?.id &&
          u.name === users2[i]?.name &&
          u.image === users2[i]?.image
      )
    );
  }

  private areAttachmentsEquivalent(
    attachments1: Attachment[] | undefined,
    attachments2: Attachment[] | undefined
  ) {
    if (attachments1 === attachments2) {
      return true;
    }
    if (
      !attachments1 ||
      !attachments2 ||
      attachments1.length !== attachments2.length
    ) {
      return false;
    }
    const ignoreUrlQueryString = (_: string, value: unknown) =>
      typeof value === 'string' && /^https?:\/\//.test(value)
        ? value.split('?')[0]
        : value;
    return (
      JSON.stringify(attachments1, ignoreUrlQueryString) ===
      JSON.stringify(attachments2, ignoreUrlQueryString)
    );
  }

  private handleTypingStartEvent(event: EventPayload<'typing.start'>) {
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

  private handleTypingStopEvent(event: EventPayload<'typing.stop'>) {
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

  private updateLatestMessages(event: EventPayload<'message.new'>) {
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
    const messageDate = nsToDate(event.message.created_at);
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

  private setChannelState(channel: Channel) {
    this.markRead(channel);
    // Messages and pinned messages are emitted by the paginator subscriptions (see watchForActiveChannelEvents)
    this.activeParentMessageIdSubject.next(undefined);
    this.activeThreadMessagesSubject.next([]);
    this.messageToQuoteSubject.next(undefined);
    this.usersTypingInChannelSubject.next([]);
    this.usersTypingInThreadSubject.next([]);
  }

  private markRead(channel: Channel, isThrottled = true) {
    if (
      this.canSendReadEvents &&
      this.shouldMarkActiveChannelAsRead &&
      !this.areReadEventsPaused
    ) {
      if (isThrottled) {
        this.markReadThrottled(channel);
      } else {
        void this.sendMarkReadRequest(channel);
      }
    }
  }

  private markReadThrottled(channel: Channel) {
    if (!this.markReadTimeout) {
      this.markRead(channel, false);
      this.markReadTimeout = setTimeout(() => {
        this.flushMarkReadQueue();
      }, this.markReadThrottleTime);
    } else {
      clearTimeout(this.markReadTimeout);
      this.scheduledMarkReadRequest = () => this.markRead(channel, false);
      this.markReadTimeout = setTimeout(() => {
        this.flushMarkReadQueue();
      }, this.markReadThrottleTime);
    }
  }

  private async sendMarkReadRequest(channel: Channel) {
    try {
      await channel.markReadViaReporter();
    } catch (error) {
      this.chatClientService.logger.warn('Failed to mark channel as read', {
        error: error as Error,
      });
    }
  }

  private flushMarkReadQueue() {
    this.scheduledMarkReadRequest?.();
    this.scheduledMarkReadRequest = undefined;
    clearTimeout(this.markReadTimeout);
    this.markReadTimeout = undefined;
  }

  private async _init(settings: {
    shouldSetActiveChannel: boolean;
    messagePageSize: number;
  }) {
    this.shouldSetActiveChannel = settings.shouldSetActiveChannel;
    this.messagePageSize = settings.messagePageSize;
    const client = this.chatClientService.chatClient;
    // Use the same page size for message list pagination, as for the initial message list (queryChannels message_limit)
    client.config.setConfig('channel', {
      messagePaginator: { pageSize: this.messagePageSize },
    });
    client.config.setConfig('thread', {
      messagePaginator: { pageSize: this.messagePageSize },
    });
    this.clientEventsSubscription = this.chatClientService.events$.subscribe(
      (notification) => void this.handleNotification(notification)
    );
    // Thread events are only delivered to threads if thread manager subscriptions are active (this is a no-op if already registered)
    // We don't unregister on reset: unregistering disposes the message paginators of threads, which are reused by stream-chat
    client.threads.registerSubscriptions();
    try {
      const result = await this.queryChannels(
        this.shouldSetActiveChannel,
        'first-page'
      );
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
}
