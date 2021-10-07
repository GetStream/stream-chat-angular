import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  Channel,
  Event,
  FormatMessageResponse,
  MessageResponse,
} from 'stream-chat';
import { ChannelService } from '../channel.service';

@Component({
  selector: 'stream-channel-preview',
  templateUrl: './channel-preview.component.html',
  styles: [],
})
export class ChannelPreviewComponent implements OnInit, OnDestroy {
  @Input() channel: Channel | undefined;
  isActive = false;
  isUnread = false;
  latestMessage: string = 'Nothing yet...';
  private subscriptions: (Subscription | { unsubscribe: () => void })[] = [];

  constructor(private channelService: ChannelService) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.channelService.activeChannel$.subscribe(
        (activeChannel) =>
          (this.isActive = activeChannel?.id === this.channel?.id)
      )
    );
    const messages = this.channel?.state?.messages;
    if (messages && messages.length > 0) {
      this.setLatestMessage(messages[messages.length - 1]);
    }
    this.isUnread = !!this.channel!.countUnread();
    this.subscriptions.push(
      this.channel!.on('message.new', this.handleMessageEvent.bind(this))
    );
    this.subscriptions.push(
      this.channel!.on('message.updated', this.handleMessageEvent.bind(this))
    );
    this.subscriptions.push(
      this.channel!.on('message.deleted', this.handleMessageEvent.bind(this))
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
    return this.channel?.data?.name;
  }

  setAsActiveChannel(): void {
    void this.channelService.setAsActiveChannel(this.channel!);
  }

  private handleMessageEvent(event: Event) {
    if (
      !event.message ||
      this.channel?.state.messages[this.channel?.state.messages.length - 1]
        .id !== event.message.id
    ) {
      return;
    }
    this.setLatestMessage(event.message);
    this.isUnread = !!this.channel.countUnread();
  }

  private setLatestMessage(message?: FormatMessageResponse | MessageResponse) {
    if (message?.deleted_at) {
      this.latestMessage = 'Message deleted';
    } else if (message?.text) {
      this.latestMessage = message.text;
    } else if (message?.attachments && message.attachments.length) {
      this.latestMessage = '🏙 Attachment...';
    }
  }
}
