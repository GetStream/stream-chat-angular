import { ApplicationRef, Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import { first, map } from 'rxjs/operators';
import {
  Attachment,
  Channel,
  ChannelFilters,
  ChannelOptions,
  ChannelSort,
  Event,
  FormatMessageResponse,
  MessageResponse,
} from 'stream-chat';
import { ChatClientService, Notification } from './chat-client.service';
import { createMessagePreview } from './message-preview';
import { MessageReactionType } from './message-reactions/message-reactions.component';
import { getReadBy } from './read-by';
import { AttachmentUpload, StreamMessage } from './types';

@Injectable({
  providedIn: 'root',
})
export class ChannelService {
  hasMoreChannels$: Observable<boolean>;
  channels$: Observable<Channel[] | undefined>;
  activeChannel$: Observable<Channel | undefined>;
  activeChannelMessages$: Observable<StreamMessage[]>;
  customNewMessageNotificationHandler?: (
    notification: Notification,
    channelListSetter: (channels: Channel[]) => void
  ) => void;
  customAddedToChannelNotificationHandler?: (
    notification: Notification,
    channelListSetter: (channels: Channel[]) => void
  ) => void;
  customRemovedFromChannelNotificationHandler?: (
    notification: Notification,
    channelListSetter: (channels: Channel[]) => void
  ) => void;
  customChannelDeletedHandler?: (
    event: Event,
    channel: Channel,
    channelListSetter: (channels: Channel[]) => void,
    messageListSetter: (messages: StreamMessage[]) => void
  ) => void;
  customChannelUpdatedHandler?: (
    event: Event,
    channel: Channel,
    channelListSetter: (channels: Channel[]) => void,
    messageListSetter: (messages: StreamMessage[]) => void
  ) => void;
  customChannelTruncatedHandler?: (
    event: Event,
    channel: Channel,
    channelListSetter: (channels: Channel[]) => void,
    messageListSetter: (messages: StreamMessage[]) => void
  ) => void;
  customChannelHiddenHandler?: (
    event: Event,
    channel: Channel,
    channelListSetter: (channels: Channel[]) => void,
    messageListSetter: (messages: StreamMessage[]) => void
  ) => void;
  customChannelVisibleHandler?: (
    event: Event,
    channel: Channel,
    channelListSetter: (channels: Channel[]) => void,
    messageListSetter: (messages: StreamMessage[]) => void
  ) => void;
  customNewMessageHandler?: (
    event: Event,
    channel: Channel,
    channelListSetter: (channels: Channel[]) => void,
    messageListSetter: (messages: StreamMessage[]) => void
  ) => void;
  private channelsSubject = new BehaviorSubject<Channel[] | undefined>(
    undefined
  );
  private activeChannelSubject = new BehaviorSubject<Channel | undefined>(
    undefined
  );
  private activeChannelMessagesSubject = new BehaviorSubject<
    (StreamMessage | MessageResponse | FormatMessageResponse)[]
  >([]);
  private hasMoreChannelsSubject = new ReplaySubject<boolean>(1);
  private activeChannelSubscriptions: { unsubscribe: () => void }[] = [];
  private filters: ChannelFilters | undefined;
  private sort: ChannelSort | undefined;
  private options: ChannelOptions | undefined;

  private channelListSetter = (channels: Channel[]) => {
    this.channelsSubject.next(channels);
  };

  private messageListSetter = (messages: StreamMessage[]) => {
    this.activeChannelMessagesSubject.next(messages);
  };

  constructor(
    private chatClientService: ChatClientService,
    private appRef: ApplicationRef,
    private ngZone: NgZone
  ) {
    this.channels$ = this.channelsSubject.asObservable();
    this.activeChannel$ = this.activeChannelSubject.asObservable();
    this.activeChannelMessages$ = this.activeChannelMessagesSubject.pipe(
      map((messages) => {
        const channel = this.activeChannelSubject.getValue()!;
        return messages.map((message) => {
          if (this.isStreamMessage(message)) {
            return message;
          } else if (this.isFormatMessageResponse(message)) {
            return { ...message, readBy: getReadBy(message, channel) };
          } else {
            const formatMessage = this.formatMessage(message);
            return {
              ...formatMessage,
              readBy: getReadBy(formatMessage, channel),
            };
          }
        });
      })
    );
    this.hasMoreChannels$ = this.hasMoreChannelsSubject.asObservable();
  }

  setAsActiveChannel(channel: Channel) {
    const prevActiveChannel = this.activeChannelSubject.getValue();
    this.stopWatchForActiveChannelEvents(prevActiveChannel);
    this.watchForActiveChannelEvents(channel);
    this.activeChannelSubject.next(channel);
    channel.state.messages.forEach((m) => {
      m.readBy = getReadBy(m, channel);
    });
    void channel.markRead();
    this.activeChannelMessagesSubject.next([...channel.state.messages]);
  }

  async loadMoreMessages() {
    const activeChnannel = this.activeChannelSubject.getValue();
    const lastMessageId = this.activeChannelMessagesSubject.getValue()[0]?.id;
    await activeChnannel?.query({
      messages: { limit: 25, id_lt: lastMessageId },
      members: { limit: 0 },
      watchers: { limit: 0 },
    });
    if (
      activeChnannel?.data?.id ===
      this.activeChannelSubject.getValue()?.data?.id
    ) {
      this.activeChannelMessagesSubject.next([
        ...activeChnannel!.state.messages,
      ]);
    }
  }

  async init(
    filters: ChannelFilters,
    sort?: ChannelSort,
    options?: ChannelOptions
  ) {
    this.filters = filters;
    this.options = options || {
      offset: 0,
      limit: 25,
      state: true,
      presence: true,
      watch: true,
      message_limit: 25,
    };
    this.sort = sort || { last_message_at: -1, updated_at: -1 };
    await this.queryChannels();
    this.chatClientService.notification$.subscribe(
      (notification) => void this.handleNotification(notification)
    );
  }

  async loadMoreChannels() {
    this.options!.offset = this.channels.length!;
    await this.queryChannels();
  }

  async addReaction(messageId: string, reactionType: MessageReactionType) {
    await this.activeChannelSubject.getValue()?.sendReaction(messageId, {
      type: reactionType,
    });
  }

  async removeReaction(messageId: string, reactionType: MessageReactionType) {
    await this.activeChannelSubject
      .getValue()
      ?.deleteReaction(messageId, reactionType);
  }

  async sendMessage(text: string, attachments: Attachment[] = []) {
    const preview = createMessagePreview(
      this.chatClientService.chatClient.user!,
      text,
      attachments
    );
    const channel = this.activeChannelSubject.getValue()!;
    preview.readBy = [];
    channel.state.addMessageSorted(preview, true);
    await this.sendMessageRequest(preview);
  }

  async resendMessage(message: StreamMessage) {
    const channel = this.activeChannelSubject.getValue()!;
    channel.state.addMessageSorted(
      {
        ...(message as any as MessageResponse),
        errorStatusCode: undefined,
        status: 'sending',
      },
      true
    );
    await this.sendMessageRequest(message);
  }

  async uploadAttachments(
    uploads: AttachmentUpload[]
  ): Promise<AttachmentUpload[]> {
    const result: AttachmentUpload[] = [];
    const channel = this.activeChannelSubject.getValue()!;
    const uploadResults = await Promise.allSettled(
      uploads.map((upload) =>
        upload.type === 'image'
          ? channel.sendImage(upload.file)
          : channel.sendFile(upload.file)
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
        });
      } else {
        result.push({ file, type, state: 'error' });
      }
    });

    return result;
  }

  async deleteAttachment(attachmentUpload: AttachmentUpload) {
    const channel = this.activeChannelSubject.getValue()!;
    await (attachmentUpload.type === 'image'
      ? channel.deleteImage(attachmentUpload.url!)
      : channel.deleteFile(attachmentUpload.url!));
  }

  private async sendMessageRequest(preview: MessageResponse | StreamMessage) {
    const channel = this.activeChannelSubject.getValue()!;
    this.activeChannelMessagesSubject.next([...channel.state.messages]);
    try {
      await channel.sendMessage({
        text: preview.text,
        attachments: preview.attachments,
        id: preview.id,
      });
    } catch (error) {
      const stringError = JSON.stringify(error);
      const parsedError: { status?: number } = stringError
        ? (JSON.parse(stringError) as { status?: number })
        : {};

      channel.state.addMessageSorted(
        {
          ...(preview as MessageResponse),
          errorStatusCode: parsedError.status || undefined,
          status: 'failed',
        },
        true
      );
      this.activeChannelMessagesSubject.next([...channel.state.messages]);
    }
  }

  private async handleNotification(notification: Notification) {
    switch (notification.eventType) {
      case 'notification.message_new': {
        if (this.customNewMessageNotificationHandler) {
          this.customNewMessageNotificationHandler(
            notification,
            this.channelListSetter
          );
        } else {
          await this.handleNewMessageNotification(notification);
        }
        break;
      }
      case 'notification.added_to_channel': {
        if (this.customAddedToChannelNotificationHandler) {
          this.customAddedToChannelNotificationHandler(
            notification,
            this.channelListSetter
          );
        } else {
          await this.handleAddedToChannelNotification(notification);
        }
        break;
      }
      case 'notification.removed_from_channel': {
        if (this.customRemovedFromChannelNotificationHandler) {
          this.customRemovedFromChannelNotificationHandler(
            notification,
            this.channelListSetter
          );
        } else {
          this.handleRemovedFromChannelNotification(notification);
        }
      }
    }
  }

  private handleRemovedFromChannelNotification(notification: Notification) {
    this.ngZone.run(() => {
      const channelIdToBeRemoved = notification.event.channel!.cid;
      this.removeFromChannelList(channelIdToBeRemoved);
    });
  }

  private async handleNewMessageNotification(notification: Notification) {
    await this.addChannelFromNotification(notification);
  }

  private async handleAddedToChannelNotification(notification: Notification) {
    await this.addChannelFromNotification(notification);
  }

  private async addChannelFromNotification(notification: Notification) {
    const channel = this.chatClientService.chatClient.channel(
      notification.event.channel?.type!,
      notification.event.channel?.id
    );
    await channel.watch();
    this.watchForChannelEvents(channel);
    this.ngZone.run(() => {
      this.channelsSubject.next([
        channel,
        ...(this.channelsSubject.getValue() || []),
      ]);
    });
  }

  private removeFromChannelList(cid: string) {
    const channels = this.channels.filter((c) => c.cid !== cid);
    if (channels.length < this.channels.length) {
      this.channelsSubject.next(channels);
      if (this.activeChannelSubject.getValue()!.cid === cid) {
        this.setAsActiveChannel(channels[0]);
      }
    }
  }

  private watchForActiveChannelEvents(channel: Channel) {
    this.activeChannelSubscriptions.push(
      channel.on('message.new', () => {
        this.ngZone.run(() => {
          this.activeChannelMessagesSubject.next([...channel.state.messages]);
          this.activeChannel$
            .pipe(first())
            .subscribe((c) => void c?.markRead());
        });
      })
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
        let latestMessage!: StreamMessage;
        this.activeChannelMessages$.pipe(first()).subscribe((messages) => {
          latestMessage = messages[messages.length - 1];
        });
        if (!latestMessage || !e.user) {
          return;
        }
        latestMessage.readBy = getReadBy(latestMessage, channel);

        this.activeChannelMessagesSubject.next(
          this.activeChannelMessagesSubject.getValue()
        );
      })
    );
  }

  private messageReactionEventReceived(e: Event) {
    this.ngZone.run(() => {
      let messages!: StreamMessage[];
      this.activeChannelMessages$
        .pipe(first())
        .subscribe((m) => (messages = m));
      const message = messages.find((m) => m.id === e?.message?.id);
      if (!message) {
        return;
      }
      message.reaction_counts = { ...e.message?.reaction_counts };
      message.reaction_scores = { ...e.message?.reaction_scores };
      message.latest_reactions = [...(e.message?.latest_reactions || [])];
      message.own_reactions = [...(e.message?.own_reactions || [])];
      this.activeChannelMessagesSubject.next([...messages]);
    });
  }

  private formatMessage(message: MessageResponse) {
    return {
      ...message,
      // parse the date..
      pinned_at: message.pinned_at ? new Date(message.pinned_at) : null,
      created_at: message.created_at
        ? new Date(message.created_at)
        : new Date(),
      updated_at: message.updated_at
        ? new Date(message.updated_at)
        : new Date(),
      status: message.status || 'received',
    };
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

  private stopWatchForActiveChannelEvents(channel: Channel | undefined) {
    if (!channel) {
      return;
    }
    this.activeChannelSubscriptions.forEach((s) => s.unsubscribe());
    this.activeChannelSubscriptions = [];
  }

  private async queryChannels() {
    try {
      const channels = await this.chatClientService.chatClient.queryChannels(
        this.filters!,
        this.sort,
        this.options
      );
      channels.forEach((c) => this.watchForChannelEvents(c));
      const prevChannels = this.channelsSubject.getValue() || [];
      this.channelsSubject.next([...prevChannels, ...channels]);
      if (channels.length > 0 && !this.activeChannelSubject.getValue()) {
        this.setAsActiveChannel(channels[0]);
      }
      this.hasMoreChannelsSubject.next(channels.length >= this.options!.limit!);
    } catch (error) {
      this.channelsSubject.error(error);
    }
  }

  private watchForChannelEvents(channel: Channel) {
    channel.on((event: Event) => {
      switch (event.type) {
        case 'message.new': {
          if (this.customNewMessageHandler) {
            this.customNewMessageHandler(
              event,
              channel,
              this.channelListSetter,
              this.messageListSetter
            );
          } else {
            this.handleNewMessage(event, channel);
          }
          break;
        }
        case 'channel.hidden': {
          if (this.customChannelHiddenHandler) {
            this.customChannelHiddenHandler(
              event,
              channel,
              this.channelListSetter,
              this.messageListSetter
            );
          } else {
            this.handleChannelHidden(event);
          }
          this.appRef.tick();
          break;
        }
        case 'channel.deleted': {
          if (this.customChannelDeletedHandler) {
            this.customChannelDeletedHandler(
              event,
              channel,
              this.channelListSetter,
              this.messageListSetter
            );
          } else {
            this.handleChannelDeleted(event);
          }
          this.appRef.tick();
          break;
        }
        case 'channel.visible': {
          if (this.customChannelVisibleHandler) {
            this.customChannelVisibleHandler(
              event,
              channel,
              this.channelListSetter,
              this.messageListSetter
            );
          } else {
            this.handleChannelVisible(event, channel);
          }
          this.appRef.tick();
          break;
        }
        case 'channel.updated': {
          if (this.customChannelUpdatedHandler) {
            this.customChannelUpdatedHandler(
              event,
              channel,
              this.channelListSetter,
              this.messageListSetter
            );
          } else {
            this.handleChannelUpdate(event);
          }
          this.appRef.tick();
          break;
        }
        case 'channel.truncated': {
          if (this.customChannelTruncatedHandler) {
            this.customChannelTruncatedHandler(
              event,
              channel,
              this.channelListSetter,
              this.messageListSetter
            );
          } else {
            this.handleChannelTruncate(event);
          }
          this.appRef.tick();
          break;
        }
      }
      setTimeout(() => this.appRef.tick(), 0);
    });
  }

  private handleNewMessage(_: Event, channel: Channel) {
    const channelIndex = this.channels.findIndex((c) => c.cid === channel.cid);
    this.channels.splice(channelIndex, 1);
    this.channelsSubject.next([channel, ...this.channels]);
  }

  private handleChannelHidden(event: Event) {
    this.removeFromChannelList(event.channel!.cid);
  }

  private handleChannelDeleted(event: Event) {
    this.removeFromChannelList(event.channel!.cid);
  }

  private handleChannelVisible(event: Event, channel: Channel) {
    if (!this.channels.find((c) => c.cid === event.cid)) {
      this.ngZone.run(() =>
        this.channelsSubject.next([...this.channels, channel])
      );
    }
  }

  private handleChannelUpdate(event: Event) {
    const channelIndex = this.channels.findIndex(
      (c) => c.cid === event.channel!.cid
    );
    if (channelIndex !== -1) {
      this.channels[channelIndex].data = event.channel;
      this.channelsSubject.next([...this.channels]);
      if (event.channel?.cid === this.activeChannelSubject.getValue()?.cid) {
        const channel = this.activeChannelSubject.getValue()!;
        channel.data = event.channel;
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
      }
    }
  }

  private get channels() {
    return this.channelsSubject.getValue() || [];
  }
}
