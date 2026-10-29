import { Component, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Channel, LocalMessage, nsToDate } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { getChannelDisplayText } from '../get-channel-display-text';
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
  @Input() channel: Channel | undefined;
  isActive = false;
  isUnreadMessageWasCalled = false;
  isUnread = false;
  unreadCount: number | undefined;
  latestMessageText: string = 'streamChat.Nothing yet...';
  latestMessageStatus?: 'delivered' | 'read';
  latestMessageTime?: string;
  latestMessage?: LocalMessage;
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
    const capabilities = this.channel?.data?.own_capabilities || [];
    this.canSendReadEvents = capabilities.indexOf('read-events') !== -1;
    // The latest message is tracked by stream-chat (new, updated, deleted messages, truncate)
    const unsubscribeFromLatestMessage =
      this.channel!.messagePaginator.aggregateState.subscribeWithSelector(
        (state) => ({ latestMessage: state.latestMessage }),
        ({ latestMessage }) => {
          this.ngZone.run(() => {
            this.setLatestMessage(latestMessage ?? undefined);
            this.updateUnreadState();
          });
        }
      );
    this.subscriptions.push({ unsubscribe: unsubscribeFromLatestMessage });
    // stream-chat updates the unread count after the latest message (message.new), so the latest message subscription reads the previous count
    const ownUserId = this.chatClientService.chatClient.user?.id;
    const unsubscribeFromUnreadCount =
      this.channel!.state.subscribeWithSelector(
        (state) => ({
          unreadCount: ownUserId
            ? state.read[ownUserId]?.unread_messages
            : undefined,
        }),
        () => {
          this.ngZone.run(() => this.updateUnreadState());
        }
      );
    this.subscriptions.push({ unsubscribe: unsubscribeFromUnreadCount });
    this.subscriptions.push(
      this.channel!.on('message.read', (event) =>
        this.ngZone.run(() => {
          // Other members reading the channel only change the latest message status, the channel stays unread for the current user
          if (event.user?.id === this.chatClientService.chatClient.user?.id) {
            this.isUnreadMessageWasCalled = false;
          }
          this.updateUnreadState();
        })
      )
    );
    this.subscriptions.push(
      this.chatClientService.events$
        .pipe(
          filter(
            (e) =>
              e.event.type === 'notification.mark_unread' &&
              this.channel!.id === e.event.channel_id
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
    return this.channel?.data?.custom?.image;
  }

  get avatarName() {
    return this.channel?.data?.custom?.name;
  }

  get title() {
    if (!this.channel) {
      return '';
    }
    return getChannelDisplayText(
      this.channel,
      this.chatClientService.chatClient.user
    );
  }

  setAsActiveChannel(): void {
    void this.channelService.setAsActiveChannel(this.channel!);
  }

  private setLatestMessage(localMessage?: LocalMessage) {
    const message = localMessage;
    this.latestMessage = message;
    if (!message) {
      this.latestMessageText = 'streamChat.Nothing yet...';
    } else if (message?.deleted_at) {
      this.latestMessageText = 'streamChat.Message deleted';
    } else if (message?.text) {
      this.latestMessageText =
        getMessageTranslation(
          localMessage,
          this.channel,
          this.chatClientService.chatClient.user
        ) || message.text;
    } else if (message?.attachments && message.attachments.length) {
      this.latestMessageText = 'streamChat.🏙 Attachment...';
    } else if (message?.poll_id) {
      this.latestMessageText = `📊 ${message.poll?.name}`;
    }
    if (this.latestMessage && this.latestMessage.type === 'regular') {
      const createdAt = nsToDate(this.latestMessage.created_at);
      this.latestMessageTime = isOnSeparateDate(new Date(), createdAt)
        ? this.dateParser.parseDate(createdAt)
        : this.dateParser.parseTime(createdAt);
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
