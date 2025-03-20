import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Channel, Event, FormatMessageResponse } from 'stream-chat';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelPreviewComponent
  implements OnInit, AfterViewInit, OnDestroy
{
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
  latestMessage?: FormatMessageResponse;
  displayAs: 'text' | 'html';
  userId?: string;
  avatarImage: string | undefined;
  avatarName: string | undefined;
  title: string | undefined = '';

  private subscriptions: (Subscription | { unsubscribe: () => void })[] = [];
  private canSendReadEvents = true;
  private isViewInitialized = false;

  constructor(
    private channelService: ChannelService,
    private chatClientService: ChatClientService,
    messageService: MessageService,
    public customTemplatesService: CustomTemplatesService,
    private dateParser: DateParserService,
    private cdRef: ChangeDetectorRef,
  ) {
    this.displayAs = messageService.displayAs;
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.chatClientService.user$.subscribe((user) => {
        if (user?.id !== this.userId) {
          this.userId = user?.id;
          if (this.isViewInitialized) {
            this.cdRef.markForCheck();
          }
        }
      }),
    );
    this.subscriptions.push(
      this.channelService.activeChannel$.subscribe((activeChannel) => {
        const isActive = activeChannel?.id === this.channel?.id;
        if (isActive !== this.isActive) {
          this.isActive = isActive;
          if (this.isViewInitialized) {
            this.cdRef.markForCheck();
          }
        }
      }),
    );
    const messages = this.channel?.state?.latestMessages;
    if (messages && messages.length > 0) {
      this.setLatestMessage(messages[messages.length - 1]);
    }
    this.updateUnreadState();
    const capabilities =
      (this.channel?.data?.own_capabilities as string[]) || [];
    this.canSendReadEvents = capabilities.indexOf('read-events') !== -1;

    this.updateChannelProperties();

    this.subscriptions.push(
      this.channel!.on('message.new', (event) => {
        this.handleMessageEvent(event);
      }),
    );
    this.subscriptions.push(
      this.channel!.on('message.updated', (event) => {
        this.handleMessageEvent(event);
      }),
    );
    this.subscriptions.push(
      this.channel!.on('message.deleted', (event) => {
        this.handleMessageEvent(event);
      }),
    );
    this.subscriptions.push(
      this.channel!.on('channel.truncated', (event) => {
        this.handleMessageEvent(event);
      }),
    );
    this.subscriptions.push(
      this.channel!.on('channel.updated', (event) => {
        this.handleChannelUpdatedEvent(event);
      }),
    );
    this.subscriptions.push(
      this.channel!.on('message.read', () => {
        if (this.isUnreadMessageWasCalled) {
          this.isUnreadMessageWasCalled = false;
          if (this.isViewInitialized) {
            this.cdRef.markForCheck();
          }
        }
        this.updateUnreadState();
      }),
    );
    this.subscriptions.push(
      this.chatClientService.events$
        .pipe(
          filter(
            (e) =>
              e.eventType === 'notification.mark_unread' &&
              this.channel!.id === e.event?.channel_id,
          ),
        )
        .subscribe(() => {
          if (!this.isUnreadMessageWasCalled) {
            this.isUnreadMessageWasCalled = true;
            if (this.isViewInitialized) {
              this.cdRef.markForCheck();
            }
          }
          this.updateUnreadState();
        }),
    );
  }

  ngAfterViewInit(): void {
    this.isViewInitialized = true;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  setAsActiveChannel(): void {
    void this.channelService.setAsActiveChannel(this.channel!);
  }

  private handleMessageEvent(event: Event) {
    if (this.channel?.state.latestMessages.length === 0) {
      this.latestMessage = undefined;
      this.latestMessageStatus = undefined;
      this.latestMessageText = 'streamChat.Nothing yet...';
      this.latestMessageTime = undefined;
      if (this.isViewInitialized) {
        this.cdRef.markForCheck();
      }
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
  }

  private setLatestMessage(message?: FormatMessageResponse) {
    let shouldUpdate = false;
    if (this.latestMessage?.id !== message?.id) {
      this.latestMessage = message;
      shouldUpdate = true;
    }
    let latestMessageText = this.latestMessageText;
    if (message?.deleted_at) {
      latestMessageText = 'streamChat.Message deleted';
    } else if (message?.text) {
      latestMessageText =
        getMessageTranslation(
          message,
          this.channel,
          this.chatClientService.chatClient.user,
        ) || message.text;
    } else if (message?.attachments && message.attachments.length) {
      latestMessageText = 'streamChat.🏙 Attachment...';
    }
    if (latestMessageText !== this.latestMessageText) {
      this.latestMessageText = latestMessageText;
      shouldUpdate = true;
    }
    let latestMessageTime = this.latestMessageTime;
    if (this.latestMessage && this.latestMessage.type === 'regular') {
      latestMessageTime = isOnSeparateDate(
        new Date(),
        this.latestMessage.created_at,
      )
        ? this.dateParser.parseDate(this.latestMessage.created_at)
        : this.dateParser.parseTime(this.latestMessage.created_at);
    } else {
      latestMessageTime = undefined;
    }
    if (latestMessageTime !== this.latestMessageTime) {
      this.latestMessageTime = latestMessageTime;
      shouldUpdate = true;
    }
    if (shouldUpdate) {
      if (this.isViewInitialized) {
        this.cdRef.markForCheck();
      }
    }
  }

  private updateUnreadState() {
    let shouldUpdate = false;
    let latestMessageStatus = this.latestMessageStatus;
    if (
      this.channel &&
      this.latestMessage &&
      this.latestMessage.user?.id === this.userId &&
      this.latestMessage.status === 'received' &&
      this.latestMessage.type === 'regular'
    ) {
      latestMessageStatus =
        getReadBy(this.latestMessage, this.channel).length > 0
          ? 'read'
          : 'delivered';
    } else {
      latestMessageStatus = undefined;
    }
    if (latestMessageStatus !== this.latestMessageStatus) {
      this.latestMessageStatus = latestMessageStatus;
      shouldUpdate = true;
    }
    let unreadCount = this.unreadCount;
    let isUnread = this.isUnread;
    if (
      (this.isActive && !this.isUnreadMessageWasCalled) ||
      !this.canSendReadEvents
    ) {
      unreadCount = 0;
      isUnread = false;
    } else {
      unreadCount = this.channel!.countUnread();
      isUnread = !!unreadCount;
    }

    if (unreadCount !== this.unreadCount) {
      this.unreadCount = unreadCount;
      shouldUpdate = true;
    }
    if (isUnread !== this.isUnread) {
      this.isUnread = isUnread;
      shouldUpdate = true;
    }
    if (shouldUpdate) {
      if (this.isViewInitialized) {
        this.cdRef.markForCheck();
      }
    }
  }

  private handleChannelUpdatedEvent(event: Event) {
    if (!this.channel || !event.channel) {
      return;
    }

    this.updateChannelProperties();
  }

  private updateChannelProperties() {
    let shouldUpdate = false;
    const avatarImage = this.channel?.data?.image;
    const avatarName = this.channel?.data?.name;

    if (avatarImage !== this.avatarImage) {
      this.avatarImage = avatarImage;
      shouldUpdate = true;
    }
    if (avatarName !== this.avatarName) {
      this.avatarName = avatarName;
      shouldUpdate = true;
    }

    let title = this.title;
    if (!this.channel) {
      title = '';
    } else {
      title = getChannelDisplayText(
        this.channel,
        this.chatClientService.chatClient.user!,
      );
    }
    if (title !== this.title) {
      this.title = title;
      shouldUpdate = true;
    }
    if (shouldUpdate) {
      if (this.isViewInitialized) {
        this.cdRef.markForCheck();
      }
    }
  }
}
