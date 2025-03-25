import { Injectable, NgZone } from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  Observable,
  ReplaySubject,
  Subscription,
} from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  first,
  map,
  shareReplay,
  take,
} from 'rxjs/operators';
import {
  Attachment,
  Channel,
  ChannelManager,
  ChannelManagerEventHandlerOverrides,
  CustomMessageData,
  CustomReactionData,
  Event,
  FormatMessageResponse,
  MemberFilters,
  Message,
  MessageResponse,
  promoteChannel,
  ReactionResponse,
  Unsubscribe,
  UpdatedMessage,
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
  ChannelQueryConfig,
  ChannelQueryConfigInput,
  ChannelQueryResult,
  ChannelQueryState,
  ChannelQueryType,
  ChannelServiceOptions,
  MessageInput,
  MessageReactionType,
  StreamMessage,
} from './types';

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
   * Emits the currently loaded and [watched](/chat/docs/javascript/watch_channel/) channel list.
   */
  channels$: Observable<Channel[] | undefined>;
  /**
   * The result of the latest channel query request.
   */
  channelQueryState$: Observable<ChannelQueryState | undefined>;
  /**
   * Emits `true` when the state needs to be recovered after an error
   *
   * You can recover it by calling the `recoverState` method
   */
  shouldRecoverState$: Observable<boolean>;
  /**
   * Emits the currently active channel.
   *
   * The active channel will always be marked as read when a new message is received
   */
  activeChannel$: Observable<Channel | undefined>;
  /**
   * Emits the list of currently loaded messages of the active channel.
   */
  activeChannelMessages$: Observable<StreamMessage[]>;
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
   * If you're using [semantic filters for moderation](/moderation/docs/) you can set up rules for bouncing messages.
   *
   * If a message is bounced, it will be emitted via this `Observable`. The built-in [`MessageBouncePrompt` component](/chat/docs/sdk/angular/v6-rc/components/MessageBouncePromptComponent/) will display the bounce option to the user if a bounced message is clicked.
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
   * You can override the default file upload request - you can use this to upload files to your own CDN
   */
  customFileUploadRequest?: (
    file: File,
    channel: Channel,
  ) => Promise<{ file: string }>;
  /**
   * You can override the default image upload request - you can use this to upload images to your own CDN
   */
  customImageUploadRequest?: (
    file: File,
    channel: Channel,
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
    message: StreamMessage,
  ) => Promise<boolean>;
  /**
   * The provided method will be called before a new message is sent to Stream's API. You can use this hook to tranfrom or enrich the message being sent.
   */
  beforeSendMessage?: (
    input: MessageInput,
  ) => MessageInput | Promise<MessageInput>;
  /**
   * The provided method will be called before a message is sent to Stream's API for update. You can use this hook to tranfrom or enrich the message being updated.
   */
  beforeUpdateMessage?: (
    message: StreamMessage,
  ) => StreamMessage | Promise<StreamMessage>;
  /**
   * @internal
   */
  static readonly MAX_MESSAGE_REACTIONS_TO_FETCH = 1200;
  /**
   * @internal
   */
  isMessageLoadingInProgress = false;
  /**
   * @internal
   */
  messagePageSize = 25;
  private channelsSubject = new BehaviorSubject<Channel[] | undefined>(
    undefined,
  );
  private activeChannelSubject = new BehaviorSubject<Channel | undefined>(
    undefined,
  );
  private activeChannelMessagesSubject = new BehaviorSubject<
    (StreamMessage | MessageResponse | FormatMessageResponse)[]
  >([]);
  private activeChannelPinnedMessagesSubject = new BehaviorSubject<
    StreamMessage[]
  >([]);
  private hasMoreChannelsSubject = new ReplaySubject<boolean>(1);
  private activeChannelSubscriptions: { unsubscribe: () => void }[] = [];
  private activeParentMessageIdSubject = new BehaviorSubject<
    string | undefined
  >(undefined);
  private activeThreadMessagesSubject = new BehaviorSubject<
    (StreamMessage | MessageResponse | FormatMessageResponse)[]
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
  private shouldSetActiveChannel = true;
  private clientEventsSubscription: Subscription | undefined;
  private isStateRecoveryInProgress$ = new BehaviorSubject(false);
  private channelQueryStateSubject = new BehaviorSubject<
    ChannelQueryState | undefined
  >(undefined);
  private customChannelQuery?: (
    queryType: ChannelQueryType,
  ) => Promise<ChannelQueryResult>;
  private channelManager?: ChannelManager;
  private channelQueryConfig?: ChannelQueryConfig;
  private dismissErrorNotification?: () => void;
  private areReadEventsPaused = false;
  private markReadThrottleTime = 1050;
  private markReadTimeout?: ReturnType<typeof setTimeout>;
  private scheduledMarkReadRequest?: () => void;
  private channelManagerSubscriptions: Unsubscribe[] = [];

  constructor(
    private chatClientService: ChatClientService,
    private ngZone: NgZone,
    private notificationService: NotificationService,
  ) {
    this.channels$ = this.channelsSubject.asObservable().pipe(shareReplay(1));
    this.activeChannel$ = this.activeChannelSubject
      .asObservable()
      .pipe(shareReplay(1));
    this.activeChannelMessages$ = this.activeChannelMessagesSubject.pipe(
      map((messages) => {
        const channel = this.activeChannelSubject.getValue()!;
        return messages.map((message) =>
          this.transformToStreamMessage(message, channel),
        );
      }),
      shareReplay(1),
    );
    this.bouncedMessage$ = new BehaviorSubject<StreamMessage | undefined>(
      undefined,
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
          this.transformToStreamMessage(message, channel),
        );
      }),
      shareReplay(1),
    );
    this.activeParentMessage$ = combineLatest([
      this.activeChannelMessages$,
      this.activeParentMessageId$,
    ]).pipe(
      map(
        ([messages, parentMessageId]: [
          StreamMessage[],
          string | undefined,
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
        },
      ),
      shareReplay(1),
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
    this.shouldRecoverState$ = combineLatest([
      this.channels$,
      this.channelQueryState$,
      this.isStateRecoveryInProgress$,
    ]).pipe(
      map(([channels, queryState, isStateRecoveryInProgress]) => {
        return (
          (!channels || channels.length === 0) &&
          queryState?.state === 'error' &&
          !isStateRecoveryInProgress
        );
      }),
      distinctUntilChanged(),
    );
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
   * @param channel
   */
  setAsActiveChannel(channel: Channel) {
    const prevActiveChannel = this.activeChannelSubject.getValue();
    if (prevActiveChannel?.cid === channel.cid) {
      return;
    }
    this.stopWatchForActiveChannelEvents(prevActiveChannel);
    this.flushMarkReadQueue();
    this.areReadEventsPaused = false;
    this.isMessageLoadingInProgress = false;
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
        channelStateLength - 2 * this.messagePageSize,
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
    this.flushMarkReadQueue();
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
    this.isMessageLoadingInProgress = false;
  }

  /**
   * Sets the given `message` as an active parent message. If `undefined` is provided, it will deleselect the current parent message.
   * @param message
   * @param loadMessagesForm
   */
  async setAsActiveParentMessage(
    message: StreamMessage | undefined,
    loadMessagesForm: 'request' | 'state' = 'request',
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
          limit: this.messagePageSize,
        });
        this.activeThreadMessagesSubject.next(result?.messages || []);
      } else {
        this.activeThreadMessagesSubject.next(
          activeChannel?.state.threads[message.id] || [],
        );
      }
    }
  }

  /**
   * Loads the next page of messages of the active channel. The page size can be set in the [query option](/chat/docs/javascript/query_channels/#query-options) object.
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
          limit: this.messagePageSize,
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
   * Loads the next page of messages of the active thread. The page size can be set in the [query option](/chat/docs/javascript/query_channels/#query-options) object.
   * @param direction
   */
  loadMoreThreadReplies(direction: 'older' | 'newer' = 'older') {
    if (direction === 'newer') {
      // Thread replies aren't broke into different message sets, activeThreadMessages$ will be refreshed by WS events, no need for a request
      return false;
    }
    const activeChnannel = this.activeChannelSubject.getValue();
    const parentMessageId = this.activeParentMessageIdSubject.getValue();
    if (!parentMessageId || !activeChnannel) {
      return false;
    }
    const threadMessages = this.activeThreadMessagesSubject.getValue();
    const lastMessageId =
      threadMessages[direction === 'older' ? 0 : threadMessages.length - 1]?.id;
    return activeChnannel
      .getReplies(parentMessageId, {
        limit: this.messagePageSize,
        [direction === 'older' ? 'id_lt' : 'id_gt']: lastMessageId,
      })
      .then(() => {
        this.activeThreadMessagesSubject.next(
          activeChnannel?.state.threads[parentMessageId] || [],
        );
      });
  }

  /**
   * Queries the channels with the given filters, sorts and options. More info about [channel querying](/chat/docs/javascript/query_channels/) can be found in the platform documentation. By default the first channel in the list will be set as active channel and will be marked as read.
   * @param queryConfig the filter, sort and options for the query
   * @param options behavior customization for the channel list and WebSocket event handling
   * @returns the list of channels found by the query
   */
  init(queryConfig: ChannelQueryConfigInput, options?: ChannelServiceOptions) {
    this.channelQueryConfig = {
      filters: queryConfig.filters,
      sort: queryConfig.sort ?? { last_message_at: -1 },
      options: {
        limit: 25,
        state: true,
        presence: true,
        watch: true,
        message_limit: this.messagePageSize,
        ...queryConfig.options,
      },
    };

    return this._init({
      ...options,
      messagePageSize:
        queryConfig.options?.message_limit ?? this.messagePageSize,
    });
  }
  /**
   * Queries the channels with the given query function. More info about [channel querying](/chat/docs/javascript/query_channels/) can be found in the platform documentation.
   * @param query
   * @param options behavior customization for the channel list and WebSocket event handling
   * @param options.messagePageSize How many messages should we load? The default is 25
   * @returns the channels that were loaded
   */
  initWithCustomQuery(
    query: (queryType: ChannelQueryType) => Promise<ChannelQueryResult>,
    options: ChannelServiceOptions & { messagePageSize: number } = {
      shouldSetActiveChannel: true,
      messagePageSize: this.messagePageSize,
    },
  ) {
    this.messagePageSize = options?.messagePageSize ?? this.messagePageSize;

    this.shouldSetActiveChannel =
      options?.shouldSetActiveChannel ?? this.shouldSetActiveChannel;
    const eventHandlerOverrides = options?.eventHandlerOverrides;
    const managerOptions = { ...options };
    delete managerOptions?.eventHandlerOverrides;
    delete managerOptions?.shouldSetActiveChannel;

    this.customChannelQuery = query;
    this.createChannelManager({
      eventHandlerOverrides,
    });

    return this._init(options);
  }

  /**
   * Resets the `activeChannel$`, `channels$` and `activeChannelMessages$` Observables. Useful when disconnecting a chat user, use in combination with [`disconnectUser`](/chat/docs/sdk/angular/v6-rc/services/ChatClientService/#disconnectuser/).
   */
  reset() {
    this.deselectActiveChannel();
    this.channelQueryStateSubject.next(undefined);
    this.clientEventsSubscription?.unsubscribe();
    this.dismissErrorNotification?.();
    this.dismissErrorNotification = undefined;
    this.channelQueryConfig = undefined;
    this.destroyChannelManager();
    this.isStateRecoveryInProgress$.next(false);
  }

  /**
   * Loads the next page of channels. The page size can be set in the [query option](/chat/docs/javascript/query_channels/#query-options) object.
   */
  async loadMoreChannels() {
    await this.queryChannels('next-page');
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
    customData?: CustomReactionData,
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
    attachments: Attachment[] = [],
    mentionedUsers: UserResponse[] = [],
    parentId: string | undefined = undefined,
    quotedMessageId: string | undefined = undefined,
    customData: undefined | CustomMessageData = undefined,
  ) {
    let input: MessageInput = {
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
      input.customData,
    );
    const channel = this.activeChannelSubject.getValue()!;
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
        ...(message as unknown as MessageResponse),
        // @ts-expect-error stream-chat doesn't know about this property
        errorStatusCode: undefined,
        status: 'sending',
      },
      true,
    );
    return this.sendMessageRequest(message, undefined, true);
  }

  /**
   * Updates the message in the active channel
   * @param message Mesage to be updated
   */
  async updateMessage(message: StreamMessage) {
    let messageToUpdate: StreamMessage = {
      ...message,
    };
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
    if (message.moderation_details) {
      return this.resendMessage(message);
    }
    const response = await this.chatClientService.chatClient.updateMessage(
      messageToUpdate as unknown as UpdatedMessage,
    );

    const channel = this.channelsSubject
      .getValue()
      ?.find((c) => c.cid === message.cid);

    if (
      response.message.type === 'error' &&
      response.message.moderation_details
    ) {
      this.notificationService.addTemporaryNotification(
        'streamChat.This message did not meet our content guidelines',
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
              this.activeChannel.state.threads[message.parent_id],
            )
          : this.activeChannelMessagesSubject.next(
              this.activeChannel.state.messages,
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
   * Uploads files to the channel. If you want to know more about [file uploads](/chat/docs/javascript/file_uploads/) check out the platform documentation.
   * @param uploads the attachments to upload (output of the [`AttachmentService`](/chat/docs/sdk/angular/v6-rc/services/AttachmentService/))
   * @returns the result of file upload requests
   */
  async uploadAttachments(
    uploads: AttachmentUpload[],
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
            : channel.sendFile(upload.file, upload.file.name, upload.file.type),
      ),
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
   * Deletes an uploaded file by URL. If you want to know more about [file uploads](/chat/docs/javascript/file_uploads/) check out the platform documentation
   * @param attachmentUpload Attachment to be deleted (output of the [`AttachmentService`](/chat/docs/sdk/angular/v6-rc/services/AttachmentService/))
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
   * Returns the autocomplete options for current channel members. If the channel has less than 100 members, it returns the channel members, otherwise sends a [search request](/chat/docs/javascript/query_members/#pagination-and-ordering) with the given search term.
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
        (m) => m.user?.id !== this.chatClientService.chatClient.userID!,
      );
    } else {
      if (!searchTerm) {
        return [];
      }
      const result = await activeChannel.queryMembers({
        name: { $autocomplete: searchTerm },
      } as MemberFilters); // TODO: find out why we need typecast here

      return result.members.filter(
        (m) => m.user_id !== this.chatClientService.chatClient?.user?.id,
      );
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
    parentMessageId?: string,
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
          channel.state.threads[this.activeParentMessageIdSubject.getValue()!],
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
  addChannel(channel: Channel) {
    if (!this.channelManager) {
      this.createChannelManager({ eventHandlerOverrides: undefined });
    }
    if (!this.channels.find((c) => c.cid === channel.cid)) {
      this.channelManager?.setChannels(
        promoteChannel({
          channels: this.channels,
          channelToMove: channel,
          sort: this.channelQueryConfig?.sort ?? [],
        }),
      );
    }
  }

  /**
   *
   * @param cid
   */
  removeChannel(cid: string) {
    if (!this.channelManager) {
      this.createChannelManager({ eventHandlerOverrides: undefined });
    }
    const remainingChannels = this.channels.filter((c) => c.cid !== cid);

    this.channelManager?.setChannels(remainingChannels);
  }

  private async sendMessageRequest(
    preview: MessageResponse | StreamMessage,
    customData?: CustomMessageData,
    isResend = false,
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
      } as Message); // TODO: find out why we need typecast here
      channel.state.addMessageSorted(
        {
          ...response.message,
          status: 'received',
        },
        true,
      );
      isThreadReply
        ? this.activeThreadMessagesSubject.next([
            ...channel.state.threads[preview.parent_id!],
          ])
        : this.activeChannelMessagesSubject.next([...channel.state.messages]);
      let messages!: StreamMessage[];
      (isThreadReply ? this.activeThreadMessages$ : this.activeChannelMessages$)
        .pipe(take(1))
        .subscribe((m) => (messages = m));
      const newMessage = messages[messages.length - 1];
      return newMessage;
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

      channel.state.addMessageSorted(
        {
          ...(preview as MessageResponse),
          // @ts-expect-error stream-chat doesn't know about this property
          errorStatusCode: isAlreadyExists
            ? undefined
            : parsedError.status || undefined,
          status: isAlreadyExists ? 'received' : 'failed',
        },
        true,
      );
      isThreadReply
        ? this.activeThreadMessagesSubject.next([
            ...channel.state.threads[preview.parent_id!],
          ])
        : this.activeChannelMessagesSubject.next([...channel.state.messages]);
      let messages!: StreamMessage[];
      (isThreadReply ? this.activeThreadMessages$ : this.activeChannelMessages$)
        .pipe(take(1))
        .subscribe((m) => (messages = m));
      const newMessage = messages[messages.length - 1];
      return newMessage;
    }
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
      await activeChannel?.state.loadMessageIntoState(
        messageId,
        parentMessageId,
      );
      const messages = activeChannel?.state.messages || [];
      this.activeChannelMessagesSubject.next([...messages]);
      if (parentMessageId) {
        const parentMessage = messages.find((m) => m.id === parentMessageId);
        void this.setAsActiveParentMessage(
          parentMessage as StreamMessage,
          'state',
        );
      }
      this.jumpToMessageSubject.next({
        id: messageId,
        parentId: parentMessageId,
      });
    } catch (error) {
      this.notificationService.addTemporaryNotification(
        'streamChat.Message not found',
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
      await this.chatClientService.chatClient?.pinMessage(message);
      this.notificationService.addTemporaryNotification(
        'streamChat.Message pinned',
        'success',
      );
    } catch (error) {
      this.notificationService.addTemporaryNotification(
        'streamChat.Error pinning message',
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
      await this.chatClientService.chatClient?.unpinMessage(message);
      this.notificationService.addTemporaryNotification(
        'streamChat.Message unpinned',
        'success',
      );
    } catch (error) {
      this.notificationService.addTemporaryNotification(
        'streamChat.Error removing message pin',
      );
      throw error;
    }
  }

  /**
   * Reloads all channels and messages. Useful if state is empty due to an error.
   *
   * The SDK will automatically call this after `connection.recovered` event. In other cases it's up to integrators to recover state.
   *
   * Use the `shouldRecoverState$` to know if state recover is necessary.
   * @returns when recovery is completed
   */
  async recoverState() {
    if (this.isStateRecoveryInProgress$.getValue()) {
      return;
    }
    this.isStateRecoveryInProgress$.next(true);
    try {
      await this.queryChannels('recover-state');
      if (this.activeChannelSubject.getValue()) {
        // Thread messages are not refetched so active thread gets deselected to avoid displaying stale messages
        void this.setAsActiveParentMessage(undefined);
        // Update and reselect message to quote
        const messageToQuote = this.messageToQuoteSubject.getValue();
        this.setChannelState(this.activeChannelSubject.getValue()!);
        let messages!: StreamMessage[];
        this.activeChannelMessages$
          .pipe(take(1))
          .subscribe((m) => (messages = m));
        const updatedMessageToQuote = messages.find(
          (m) => m.id === messageToQuote?.id,
        );
        if (updatedMessageToQuote) {
          this.selectMessageToQuote(updatedMessageToQuote);
        }
      }
    } finally {
      this.isStateRecoveryInProgress$.next(false);
    }
  }

  private handleNotification(clientEvent: ClientEvent) {
    switch (clientEvent.eventType) {
      case 'connection.recovered': {
        if (this.channelManager) {
          void this.recoverState().catch((error) =>
            this.chatClientService.chatClient.logger(
              'warn',
              `Failed to recover state after connection recovery: ${error}`,
            ),
          );
        } else {
          this.reset();
        }
        break;
      }
      case 'user.updated': {
        const activeChannel = this.activeChannelSubject.getValue();
        if (activeChannel) {
          this.activeChannelSubject.next(
            this.chatClientService.chatClient.activeChannels[
              activeChannel.cid
            ] || activeChannel,
          );
          this.activeChannelMessagesSubject.next(
            activeChannel.state.messages.map((m) => {
              (m as StreamMessage).readBy = getReadBy(m, activeChannel);
              return { ...m };
            }),
          );
          const activeParentMessage =
            this.activeParentMessageIdSubject.getValue();
          if (activeParentMessage) {
            const messages = activeChannel.state.threads[activeParentMessage];
            this.activeThreadMessagesSubject.next([...messages]);
          }
          this.activeChannelPinnedMessagesSubject.next([
            ...(activeChannel.state.pinnedMessages as StreamMessage[]),
          ]);
        }
        break;
      }
    }
  }

  private watchForActiveChannelEvents(channel: Channel) {
    this.activeChannelSubscriptions.push(
      channel.on('message.new', (event) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        event.message && event.message.parent_id
          ? event.message.parent_id ===
            this.activeParentMessageIdSubject.getValue()
            ? this.activeThreadMessagesSubject.next([
                ...channel.state.threads[event.message.parent_id],
              ])
            : null
          : this.activeChannelMessagesSubject.next([...channel.state.messages]);
        this.activeChannel$.pipe(first()).subscribe((c) => {
          if (c) {
            this.markRead(c);
          }
        });
        this.updateLatestMessages(event);
      }),
    );
    this.activeChannelSubscriptions.push(
      channel.on('message.updated', (event) => this.messageUpdated(event)),
    );
    this.activeChannelSubscriptions.push(
      channel.on('message.deleted', (event) => this.messageUpdated(event)),
    );
    this.activeChannelSubscriptions.push(
      channel.on('reaction.new', (e) => this.messageReactionEventReceived(e)),
    );
    this.activeChannelSubscriptions.push(
      channel.on('reaction.deleted', (e) =>
        this.messageReactionEventReceived(e),
      ),
    );
    this.activeChannelSubscriptions.push(
      channel.on('reaction.updated', (e) =>
        this.messageReactionEventReceived(e),
      ),
    );
    this.activeChannelSubscriptions.push(
      channel.on('message.read', (e) => {
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
      }),
    );
    this.activeChannelSubscriptions.push(
      this.chatClientService.events$
        .pipe(
          filter(
            (e) =>
              e.eventType === 'notification.mark_unread' &&
              e.event.channel_id === channel.id,
          ),
          map((e) => e.event),
        )
        .subscribe((e) => {
          this.activeChannelLastReadMessageId = e.last_read_message_id;
          this.activeChannelUnreadCount = e.unread_messages;
          this.activeChannelSubject.next(this.activeChannel);
        }),
    );
    this.activeChannelSubscriptions.push(
      channel.on('typing.start', (e) => this.handleTypingStartEvent(e)),
    );
    this.activeChannelSubscriptions.push(
      // client._startCleaning can emit typing.stop events
      // since client._startCleaning runs outside Angular, we need to reenter Angular here
      channel.on('typing.stop', (e) =>
        this.ngZone.run(() => this.handleTypingStopEvent(e)),
      ),
    );
    this.activeChannelSubscriptions.push(
      channel.on(() => {
        this.activeChannelSubject.next(this.activeChannelSubject.getValue());
      }),
    );
    this.activeChannelSubscriptions.push(
      channel.on('channel.truncated', (_) => {
        this.activeChannelSubject.next(this.activeChannelSubject.getValue());
        this.activeChannelMessagesSubject.next([]);
        void this.setAsActiveParentMessage(undefined);
      }),
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
   * The current thread replies
   */
  get activeChannelThreadReplies() {
    return this.activeThreadMessagesSubject.getValue() || [];
  }

  /**
   * Get the last 1200 reactions of a message in the current active channel. If you need to fetch more reactions please use the [following endpoint](/chat/docs/javascript/send_reaction/#paginating-reactions).
   * @deprecated use [`messageReactionsService.queryReactions()`](/chat/docs/sdk/angular/v6-rc/services/MessageReactionsService/#queryreactions) instead
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
          'streamChat.Error loading reactions',
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
            { count },
          );
          throw e;
        }
      }
      this.notificationService.addTemporaryNotification(
        'streamChat.Error marking message as unread',
      );
      throw e;
    }
  }

  private messageUpdated(event: Event) {
    const isThreadReply = event.message && event.message.parent_id;
    const channel = this.activeChannelSubject.getValue();
    if (!channel) {
      return;
    }
    // Get messages from state as message order could change, and message could've been deleted
    const messages: FormatMessageResponse[] = isThreadReply
      ? channel.state.threads[event?.message?.parent_id || '']
      : channel.state.messages;
    if (!messages) {
      return;
    }
    const messageIndex = messages.findIndex((m) => m.id === event?.message?.id);
    if (messageIndex !== -1 || event.type === 'message.deleted') {
      isThreadReply
        ? this.activeThreadMessagesSubject.next([...messages])
        : this.activeChannelMessagesSubject.next([...messages]);
      this.activeChannelPinnedMessagesSubject.next([
        ...(channel.state.pinnedMessages as StreamMessage[]),
      ]);
    }
  }

  private messageReactionEventReceived(e: Event) {
    const isThreadMessage = e.message && e.message.parent_id;
    let messages!: StreamMessage[];
    (isThreadMessage ? this.activeThreadMessages$ : this.activeChannelMessages$)
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
    message.reaction_groups = { ...e.message?.reaction_groups };

    messages[messageIndex] = { ...message };
    isThreadMessage
      ? this.activeThreadMessagesSubject.next([...messages])
      : this.activeChannelMessagesSubject.next([...messages]);
  }

  private formatMessage(message: MessageResponse) {
    const m = message as unknown as FormatMessageResponse;
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
    message: StreamMessage | FormatMessageResponse | MessageResponse,
  ): message is StreamMessage {
    return 'readBy' in message;
  }

  private isFormatMessageResponse(
    message: StreamMessage | FormatMessageResponse | MessageResponse,
  ): message is FormatMessageResponse {
    return message.created_at instanceof Date;
  }

  private stopWatchForActiveChannelEvents(channel: Channel | undefined) {
    if (!channel) {
      return;
    }
    this.activeChannelSubscriptions.forEach((s) => s.unsubscribe());
    this.activeChannelSubscriptions = [];
  }

  private async queryChannels(queryType: ChannelQueryType) {
    if (!this.channelManager) {
      throw new Error(
        'Query channels called before initializing ChannelService',
      );
    }
    try {
      this.channelQueryStateSubject.next({ state: 'in-progress' });

      if (this.customChannelQuery) {
        const result = await this.customChannelQuery(queryType);
        const cids = new Set<string>();
        const filteredChannels = result.channels.filter((c) => {
          if (cids.has(c.cid)) {
            return false;
          } else {
            cids.add(c.cid);
            return true;
          }
        });
        this.channelManager.setChannels(filteredChannels);
        this.hasMoreChannelsSubject.next(result.hasMorePage);
      } else {
        if (queryType === 'first-page' || queryType === 'recover-state') {
          if (!this.channelQueryConfig) {
            throw new Error('Channel query config not initialized');
          }
          await this.channelManager.queryChannels(
            { ...this.channelQueryConfig.filters },
            this.channelQueryConfig.sort,
            this.channelQueryConfig.options,
          );
        } else {
          await this.channelManager.loadNext();
        }
      }

      if (this.channelManagerSubscriptions.length === 0) {
        this.channelManagerSubscriptions.push(
          this.channelManager.state.subscribeWithSelector(
            (s) => ({ channels: s.channels }),
            ({ channels }) => {
              const activeChannel = this.activeChannel;
              if (
                !this.isStateRecoveryInProgress$.getValue() &&
                activeChannel &&
                !channels.find((c) => c.cid === activeChannel.cid)
              ) {
                this.deselectActiveChannel();
              }
              this.channelsSubject.next(channels);
            },
          ),
        );
        if (!this.customChannelQuery) {
          this.channelManagerSubscriptions.push(
            this.channelManager.state.subscribeWithSelector(
              (s) => ({ hasNext: s.pagination?.hasNext ?? true }),
              ({ hasNext }) => this.hasMoreChannelsSubject.next(hasNext),
            ),
          );
        }
      }

      if (queryType === 'recover-state') {
        await this.maybeRestoreActiveChannelAfterRecovery();
      }

      const activeChannel = this.activeChannelSubject.getValue();
      const shouldSetActiveChannel =
        queryType === 'next-page' ? false : this.shouldSetActiveChannel;
      if (
        this.channels.length > 0 &&
        !activeChannel &&
        shouldSetActiveChannel
      ) {
        this.setAsActiveChannel(this.channels[0]);
      }

      this.channelQueryStateSubject.next({ state: 'success' });
      this.dismissErrorNotification?.();
      return this.channels;
    } catch (error) {
      this.channelQueryStateSubject.next({
        state: 'error',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        error,
      });
      if (queryType === 'recover-state') {
        this.deselectActiveChannel();
        this.channelManager.setChannels([]);
      }
      if (queryType !== 'next-page') {
        this.dismissErrorNotification =
          this.notificationService.addPermanentNotification(
            'streamChat.Error loading channels',
            'error',
          );
      }
      throw error;
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
    message: StreamMessage | MessageResponse | FormatMessageResponse,
    channel?: Channel,
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
          this.chatClientService.chatClient.user,
        );
      }
      message.translation = getMessageTranslation(
        message,
        channel,
        this.chatClientService.chatClient.user,
      );
      return message;
    } else {
      if (message.quoted_message) {
        (message as StreamMessage).quoted_message!.translation =
          getMessageTranslation(
            message.quoted_message,
            channel,
            this.chatClientService.chatClient.user,
          );
      }
      if (this.isFormatMessageResponse(message)) {
        (message as StreamMessage).readBy = isThreadMessage
          ? []
          : channel
            ? getReadBy(message, channel)
            : [];
        (message as StreamMessage).translation = getMessageTranslation(
          message,
          channel,
          this.chatClientService.chatClient.user,
        );

        return message as StreamMessage;
      } else {
        message = this.formatMessage(message);
        (message as StreamMessage).readBy = isThreadMessage
          ? []
          : channel
            ? getReadBy(message, channel)
            : [];
        (message as StreamMessage).translation = getMessageTranslation(
          message,
          channel,
          this.chatClientService.chatClient.user,
        );
        return message as StreamMessage;
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
        1,
      );
      this.usersTypingInChannelSubject.next([...usersTypingInChannel]);
      return;
    }
    if (user && usersTypingInThread.find((u) => u.id === user.id)) {
      usersTypingInThread.splice(
        usersTypingInThread.findIndex((u) => u.id === user.id),
        1,
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

  private setChannelState(channel: Channel) {
    channel.state.messages.forEach((m) => {
      (m as StreamMessage).readBy = getReadBy(m, channel);
      (m as StreamMessage).translation = getMessageTranslation(
        m,
        channel,
        this.chatClientService.chatClient.user,
      );
      if (m.quoted_message) {
        (m as StreamMessage).quoted_message!.translation =
          getMessageTranslation(
            m.quoted_message,
            channel,
            this.chatClientService.chatClient.user,
          );
      }
    });
    this.markRead(channel);
    this.activeChannelMessagesSubject.next([...channel.state.messages]);
    this.activeChannelPinnedMessagesSubject.next([
      ...(channel.state.pinnedMessages as StreamMessage[]),
    ]);
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
        void channel.markRead();
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

  private flushMarkReadQueue() {
    this.scheduledMarkReadRequest?.();
    this.scheduledMarkReadRequest = undefined;
    clearTimeout(this.markReadTimeout);
    this.markReadTimeout = undefined;
  }

  private _init(options: ChannelServiceOptions & { messagePageSize: number }) {
    this.messagePageSize = options.messagePageSize;

    this.shouldSetActiveChannel =
      options?.shouldSetActiveChannel ?? this.shouldSetActiveChannel;
    const eventHandlerOverrides = options?.eventHandlerOverrides;
    const managerOptions = { ...options };
    delete managerOptions?.eventHandlerOverrides;
    delete managerOptions?.shouldSetActiveChannel;

    this.createChannelManager({
      eventHandlerOverrides,
    });

    this.clientEventsSubscription = this.chatClientService.events$.subscribe(
      (notification) => void this.handleNotification(notification),
    );
    return this.queryChannels('first-page');
  }

  private createChannelManager({
    eventHandlerOverrides,
  }: {
    eventHandlerOverrides?: ChannelManagerEventHandlerOverrides;
  }) {
    if (this.channelManager) {
      this.destroyChannelManager();
    }
    this.channelManager = new ChannelManager({
      client: this.chatClientService.chatClient,
      options: {
        allowNotLoadedChannelPromotionForEvent: {
          'message.new': false,
          'channel.visible': true,
          'notification.added_to_channel': true,
          'notification.message_new': true,
        },
      },
      eventHandlerOverrides,
    });
    this.channelManager.registerSubscriptions();
  }

  private destroyChannelManager() {
    this.channelManager?.unregisterSubscriptions();
    this.channelManager = undefined;
    this.channelManagerSubscriptions.forEach((unsubscribe) => unsubscribe());
    this.channelManagerSubscriptions = [];
    this.channelsSubject.next(undefined);
    this.hasMoreChannelsSubject.next(true);
  }

  private async maybeRestoreActiveChannelAfterRecovery() {
    const previousActiveChannel = this.activeChannelSubject.getValue();
    if (!previousActiveChannel) {
      return;
    }
    try {
      if (!this.channels.find((c) => c.cid === previousActiveChannel?.cid)) {
        await previousActiveChannel.watch();
        // Thread messages are not refetched so active thread gets deselected to avoid displaying stale messages
        void this.setAsActiveParentMessage(undefined);
        // Update and reselect message to quote
        const messageToQuote = this.messageToQuoteSubject.getValue();
        this.setChannelState(previousActiveChannel);
        let messages!: StreamMessage[];
        this.activeChannelMessages$
          .pipe(take(1))
          .subscribe((m) => (messages = m));
        const updatedMessageToQuote = messages.find(
          (m) => m.id === messageToQuote?.id,
        );
        if (updatedMessageToQuote) {
          this.selectMessageToQuote(updatedMessageToQuote);
        }
        this.channelManager?.setChannels(
          promoteChannel({
            channels: this.channels,
            channelToMove: previousActiveChannel,
            sort: this.channelQueryConfig?.sort ?? [],
          }),
        );
      }
    } catch (error) {
      this.chatClientService.chatClient.logger(
        'warn',
        'Unable to refetch active channel after state recover',
        error as Record<string, unknown>,
      );
      this.deselectActiveChannel();
    }
  }
}
