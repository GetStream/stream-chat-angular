import { ApplicationRef, Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import {
  Channel,
  ChannelFilters,
  ChannelOptions,
  ChannelSort,
  Event,
  FormatMessageResponse,
  MessageResponse,
} from 'stream-chat';
import { ChatClientService, Notification } from './chat-client.service';
import { MessageReactionType } from './message-reactions/message-reactions.component';
import { getReadBy } from './read-by';
import { StreamMessage } from './types';

@Injectable({
  providedIn: 'root',
})
export class ChannelService {
  hasMoreChannels$: Observable<boolean>;
  channels$: Observable<Channel[] | undefined>;
  activeChannel$: Observable<Channel | undefined>;
  activeChannelMessages$: Observable<StreamMessage[]>;
  private channelsSubject = new BehaviorSubject<Channel[] | undefined>(
    undefined
  );
  private activeChannelSubject = new BehaviorSubject<Channel | undefined>(
    undefined
  );
  private activeChannelMessagesSubject = new BehaviorSubject<StreamMessage[]>(
    []
  );
  private hasMoreChannelsSubject = new ReplaySubject<boolean>(1);
  private channelSubscriptions: { unsubscribe: () => void }[] = [];
  private filters: ChannelFilters | undefined;
  private sort: ChannelSort | undefined;
  private options: ChannelOptions | undefined;

  constructor(
    private chatClientService: ChatClientService,
    private appRef: ApplicationRef,
    private ngZone: NgZone
  ) {
    this.channels$ = this.channelsSubject.asObservable();
    this.activeChannel$ = this.activeChannelSubject.asObservable();
    this.activeChannelMessages$ =
      this.activeChannelMessagesSubject.asObservable();
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
    this.activeChannelMessagesSubject.next([
      ...channel.state.messages,
    ] as StreamMessage[]);
  }

  async loadMoreMessages() {
    const activeChnannel = this.activeChannelSubject.getValue();
    const lastMessageId = this.activeChannelMessagesSubject.getValue()[0]?.id;
    const result = await activeChnannel?.query({
      messages: { limit: 25, id_lt: lastMessageId },
      members: { limit: 0 },
      watchers: { limit: 0 },
    });
    if (
      activeChnannel?.data?.id ===
      this.activeChannelSubject.getValue()?.data?.id
    ) {
      const loadedMessages: FormatMessageResponse[] = result!.messages.map(
        (m) => this.formatMessage(m)
      );
      loadedMessages.forEach((m) => (m.readBy = getReadBy(m, activeChnannel!)));
      const messages = [
        ...result!.messages.map((m) => this.formatMessage(m)),
        ...this.activeChannelMessagesSubject.getValue(),
      ];
      this.activeChannelMessagesSubject.next(messages as StreamMessage[]);
    }
  }

  async init() {
    this.filters = { type: 'messaging' };
    this.options = {
      offset: 0,
      limit: 25,
      state: true,
      presence: true,
      watch: true,
      message_limit: 25,
    };
    this.sort = { last_message_at: -1, updated_at: -1 };
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

  private async handleNotification(notification: Notification) {
    switch (notification.eventType) {
      case 'notification.message_new':
      case 'notification.added_to_channel': {
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
        break;
      }
      case 'notification.removed_from_channel': {
        this.ngZone.run(() => {
          const channelIdToBeRemoved = notification.event.channel!.cid;
          this.removeFromChannelList(channelIdToBeRemoved);
        });
      }
    }
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
    this.channelSubscriptions.push(
      channel.on('message.new', (e) => {
        const newMessage = e.message!;
        const messages = [
          ...this.activeChannelMessagesSubject.getValue(),
          this.formatMessage(newMessage),
        ];
        this.activeChannelMessagesSubject.next(messages as StreamMessage[]);
        const channelIndex = this.channels.findIndex(
          (c) => c.cid === channel.cid
        );
        this.channels.splice(channelIndex, 1);
        this.channelsSubject.next([channel, ...this.channels]);
        this.appRef.tick();
      })
    );
    channel.on('reaction.new', (e) => this.messageReactionEventReceived(e));
    channel.on('reaction.deleted', (e) => this.messageReactionEventReceived(e));
    channel.on('reaction.updated', (e) => this.messageReactionEventReceived(e));
  }

  private messageReactionEventReceived(e: Event) {
    const message = this.activeChannelMessagesSubject
      .getValue()
      .find((m) => m.id === e.message?.id);
    if (!message) {
      return;
    }
    message.reaction_counts = { ...e.message?.reaction_counts };
    message.reaction_scores = { ...e.message?.reaction_scores };
    message.latest_reactions = [...(e.message?.latest_reactions || [])];
    message.own_reactions = [...(e.message?.own_reactions || [])];
    this.activeChannelMessagesSubject.next(
      this.activeChannelMessagesSubject.getValue()
    );
    this.appRef.tick();
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

  private stopWatchForActiveChannelEvents(channel: Channel | undefined) {
    if (!channel) {
      return;
    }
    this.channelSubscriptions.forEach((s) => s.unsubscribe());
    this.channelSubscriptions = [];
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
        case 'channel.hidden': {
          this.handleChannelHidden(event);
          this.appRef.tick();
          break;
        }
        case 'channel.deleted': {
          this.handleChannelDeleted(event);
          this.appRef.tick();
          break;
        }
        case 'channel.visible': {
          this.handleChannelVisible(event, channel);
          this.appRef.tick();
          break;
        }
        case 'channel.updated': {
          this.handleChannelUpdate(event);
          this.appRef.tick();
          break;
        }
        case 'channel.truncated': {
          this.handleChannelTruncate(event);
          this.appRef.tick();
          break;
        }
      }
      setTimeout(() => this.appRef.tick(), 0);
    });
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
