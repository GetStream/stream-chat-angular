import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { UserResponse } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import { getDeviceWidth } from '../device-width';
import { MessageActions } from '../message-actions-box/message-actions-box.component';
import { DefaultUserType, StreamMessage } from '../types';
import { parseDate } from './parse-date';
import { getReadByText } from './read-by-text';

@Component({
  selector: 'stream-message',
  templateUrl: './message.component.html',
  styles: [],
})
export class MessageComponent {
  @Input() message: StreamMessage | undefined;
  @Input() enabledMessageActions: MessageActions[] = [
    'pin',
    'delete',
    'edit',
    'flag',
    'mute',
    'quote',
  ];
  @Input() areReactionsEnabled = true;
  @Input() isLastSentMessage: boolean | undefined;
  isActionBoxOpen = false;
  isReactionSelectorOpen = false;
  isPressedOnMobile = false;
  private user: UserResponse<DefaultUserType> | undefined;
  @ViewChild('container') private container:
    | ElementRef<HTMLElement>
    | undefined;

  constructor(
    private chatClientService: ChatClientService,
    private channelService: ChannelService
  ) {
    this.user = this.chatClientService.chatClient.user;
  }

  get isSentByCurrentUser() {
    return this.message?.user?.id === this.user?.id;
  }

  get readByText() {
    return getReadByText(this.message!.readBy);
  }

  get lastReadUser() {
    return this.message?.readBy.filter((u) => u.id !== this.user?.id)[0];
  }

  get isOnlyReadByMe() {
    return this.message && this.message.readBy.length === 0;
  }

  get isReadByMultipleUsers() {
    return this.message && this.message.readBy.length > 1;
  }

  get isMessageDeliveredAndRead() {
    return (
      this.message &&
      this.message.readBy &&
      this.message.status === 'received' &&
      this.message.readBy.length > 0
    );
  }

  get parsedDate() {
    if (!this.message || !this.message?.created_at) {
      return;
    }
    return parseDate(this.message.created_at);
  }

  get areOptionsVisible() {
    if (!this.message) {
      return false;
    }
    return !(
      !this.message.type ||
      this.message.type === 'error' ||
      this.message.type === 'system' ||
      this.message.type === 'ephemeral' ||
      this.message.status === 'failed' ||
      this.message.status === 'sending'
    );
  }

  get hasAttachment() {
    return !!this.message?.attachments && !!this.message.attachments.length;
  }

  get hasReactions() {
    return (
      !!this.message?.reaction_counts &&
      Object.keys(this.message.reaction_counts).length > 0
    );
  }

  resendMessage() {
    void this.channelService.resendMessage(this.message!);
  }

  textClicked() {
    if (getDeviceWidth().device !== 'mobile') {
      this.isPressedOnMobile = false;
      return;
    }
    if (this.isPressedOnMobile) {
      return;
    }
    this.isPressedOnMobile = true;
    const eventHandler = (event: Event) => {
      if (!this.container?.nativeElement.contains(event.target as Node)) {
        this.isPressedOnMobile = false;
        window.removeEventListener('click', eventHandler);
      }
    };
    window.addEventListener('click', eventHandler);
  }
}
