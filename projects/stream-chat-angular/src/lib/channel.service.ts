import { ApplicationRef, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  Channel,
  ChannelFilters,
  ChannelOptions,
  ChannelSort,
  Event,
  FormatMessageResponse,
  MessageResponse,
} from 'stream-chat';
import { ChatClientService } from './chat-client.service';
import { MessageReactionType } from './message-reactions/message-reactions.component';
import { getReadBy } from './read-by';
import { StreamMessage } from './types';

@Injectable({
  providedIn: 'root',
})
export class ChannelService {
  channels$: Observable<Channel[]>;
  activeChannel$: Observable<Channel | undefined>;
  activeChannelMessages$: Observable<StreamMessage[]>;
  private channelsSubject = new BehaviorSubject<Channel[]>([]);
  private activeChannelSubject = new BehaviorSubject<Channel | undefined>(
    undefined
  );
  private activeChannelMessagesSubject = new BehaviorSubject<StreamMessage[]>(
    []
  );
  private channelSubscriptions: { unsubscribe: () => void }[] = [];

  constructor(
    private chatClientService: ChatClientService,
    private appRef: ApplicationRef
  ) {
    this.channels$ = this.channelsSubject.asObservable();
    this.activeChannel$ = this.activeChannelSubject.asObservable();
    this.activeChannelMessages$ =
      this.activeChannelMessagesSubject.asObservable();
  }

  setAsActiveChannel(channel: Channel) {
    const prevActiveChannel = this.activeChannelSubject.getValue();
    this.stopWatchForChannelEvents(prevActiveChannel);
    this.watchForChannelEvents(channel);
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
    const lastMessageId = this.activeChannelMessagesSubject.getValue()[0].id;
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
    const filters: ChannelFilters = { type: 'messaging' };
    const options: ChannelOptions = {
      state: true,
      presence: true,
      watch: true,
      message_limit: 25,
    };
    const sort: ChannelSort = { last_message_at: -1, updated_at: -1 };
    const channels = await this.chatClientService.chatClient.queryChannels(
      filters,
      sort,
      options
    );
    this.channelsSubject.next(channels);
    if (channels.length > 0) {
      void this.setAsActiveChannel(channels[0]);
    }
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

  private watchForChannelEvents(channel: Channel) {
    this.channelSubscriptions.push(
      channel.on('message.new', (e) => {
        const newMessage = e.message!;
        const messages = [
          ...this.activeChannelMessagesSubject.getValue(),
          this.formatMessage(newMessage),
        ];
        this.activeChannelMessagesSubject.next(messages as StreamMessage[]);
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

  private stopWatchForChannelEvents(channel: Channel | undefined) {
    if (!channel) {
      return;
    }
    this.channelSubscriptions.forEach((s) => s.unsubscribe());
    this.channelSubscriptions = [];
  }
}
