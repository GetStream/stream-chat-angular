import { Component, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Channel, Event, FormatMessageResponse } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { getChannelDisplayText } from '../get-channel-display-text';
import { DefaultStreamChatGenerics } from '../types';
import { ChatClientService } from '../chat-client.service';
import { getMessageTranslation } from '../get-message-translation';
import { MessageService } from '../message.service';
import { CustomTemplatesService } from '../custom-templates.service';
import { getReadBy } from '../read-by';
import { isOnSeparateDate } from '../is-on-separate-date';
import { DateParserService } from '../date-parser.service';

/**
 * The `ChannelPreview` component displays a channel preview in the channel list, it consists of the image, name and latest message of the channel.
 */
@Component({
  selector: 'stream-channel-preview',
  templateUrl: './channel-preview.component.html',
  styles: [],
})
export class ChannelPreviewComponent implements OnInit, OnDestroy {
  /**
   * The channel to be displayed
   */
  @Input() channel: Channel<DefaultStreamChatGenerics> | undefined;
  isActive = false;
  isUnreadMessageWasCalled = false;
  isUnread = false;
  unreadCount: number | undefined;
  latestMessageText: string = 'streamChat.Nothing yet...';
  latestMessageStatus?: 'delivered' | 'read';
  latestMessageTime?: string;
  latestMessage?: FormatMessageResponse<DefaultStreamChatGenerics>;
  displayAs: 'text' | 'html';
  userId?: string;
  private subscriptions: (Subscription | { unsubscribe: () => void })[] = [];
  private canSendReadEvents = true;

  constructor(
    private channelService: ChannelService,
    private ngZone: NgZone,
    private chatClientService: ChatClientService,
    messageService: MessageService,
    public customTemplatesService: CustomTemplatesService,
    private dateParser: DateParserService
  ) {
    this.displayAs = messageService.displayAs;
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.chatClientService.user$.subscribe((user) => {
        if (user?.id !== this.userId) {
          this.userId = user?.id;
        }
      })
    );
    this.subscriptions.push(
      this.channelService.activeChannel$.subscribe(
        (activeChannel) =>
          (this.isActive = activeChannel?.id === this.channel?.id)
      )
    );
    const messages = this.channel?.state?.latestMessages;
    if (messages && messages.length > 0) {
      this.setLatestMessage(messages[messages.length - 1]);
    }
    this.updateUnreadState();
    const capabilities =
      (this.channel?.data?.own_capabilities as string[]) || [];
    this.canSendReadEvents = capabilities.indexOf('read-events') !== -1;
    this.subscriptions.push(
      this.channel!.on('message.new', this.handleMessageEvent.bind(this))
    );
    this.subscriptions.push(
      this.channel!.on('message.updated', this.handleMessageEvent.bind(this))
    );
    this.subscriptions.push(
      this.channel!.on('message.deleted', this.handleMessageEvent.bind(this))
    );
    this.subscriptions.push(
      this.channel!.on('channel.truncated', this.handleMessageEvent.bind(this))
    );
    this.subscriptions.push(
      this.channel!.on('message.read', () =>
        this.ngZone.run(() => {
          this.isUnreadMessageWasCalled = false;
          this.updateUnreadState();
        })
      )
    );
    this.subscriptions.push(
      this.chatClientService.events$
        .pipe(
          filter(
            (e) =>
              e.eventType === 'notification.mark_unread' &&
              this.channel!.id === e.event?.channel_id
          )
        )
        .subscribe(() => {
          this.ngZone.run(() => {
            this.isUnreadMessageWasCalled = true;
            this.updateUnreadState();
          });
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  get avatarImage() {
    return this.channel?.data?.image;
  }

  get avatarName() {
    return this.channel?.data?.name;
  }

  get title() {
    if (!this.channel) {
      return '';
    }
    return getChannelDisplayText(
      this.channel,
      this.chatClientService.chatClient.user!
    );
  }

  setAsActiveChannel(): void {
    void this.channelService.setAsActiveChannel(this.channel!);
  }

  private handleMessageEvent(event: Event) {
    this.ngZone.run(() => {
      if (this.channel?.state.latestMessages.length === 0) {
        this.latestMessage = undefined;
        this.latestMessageStatus = undefined;
        this.latestMessageText = 'streamChat.Nothing yet...';
        this.latestMessageTime = undefined;
        return;
      }
      const latestMessage =
        this.channel?.state.latestMessages[
          this.channel?.state.latestMessages.length - 1
        ];
      if (!event.message || latestMessage?.id !== event.message.id) {
        return;
      }
      this.setLatestMessage(latestMessage);
      this.updateUnreadState();
    });
  }

  private setLatestMessage(
    message?: FormatMessageResponse<DefaultStreamChatGenerics>
  ) {
    this.latestMessage = message;
    if (message?.deleted_at) {
      this.latestMessageText = 'streamChat.Message deleted';
    } else if (message?.text) {
      this.latestMessageText =
        getMessageTranslation(
          message,
          this.channel,
          this.chatClientService.chatClient.user
        ) || message.text;
    } else if (message?.attachments && message.attachments.length) {
      this.latestMessageText = 'streamChat.🏙 Attachment...';
    }
    if (this.latestMessage && this.latestMessage.type === 'regular') {
      this.latestMessageTime = isOnSeparateDate(
        new Date(),
        this.latestMessage.created_at
      )
        ? this.dateParser.parseDate(this.latestMessage.created_at)
        : this.dateParser.parseTime(this.latestMessage.created_at);
    } else {
      this.latestMessageTime = undefined;
    }
  }

  private updateUnreadState() {
    if (
      this.channel &&
      this.latestMessage &&
      this.latestMessage.user?.id === this.userId &&
      this.latestMessage.status === 'received' &&
      this.latestMessage.type === 'regular'
    ) {
      this.latestMessageStatus =
        getReadBy(this.latestMessage, this.channel).length > 0
          ? 'read'
          : 'delivered';
    } else {
      this.latestMessageStatus = undefined;
    }
    if (
      (this.isActive && !this.isUnreadMessageWasCalled) ||
      !this.canSendReadEvents
    ) {
      this.unreadCount = 0;
      this.isUnread = false;
      return;
    }
    this.unreadCount = this.channel!.countUnread();
    this.isUnread = !!this.unreadCount;
  }
}
