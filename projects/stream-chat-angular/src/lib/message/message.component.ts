import { Component, Input } from '@angular/core';
import { UserResponse } from 'stream-chat';
import { ChatClientService } from '../chat-client.service';
import { DefaultUserType, StreamMessage } from '../types';
import { parseDate } from './parse-date';
import { getReadByText } from './read-by-text';

@Component({
  selector: 'stream-message',
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.scss'],
})
export class MessageComponent {
  @Input() message: StreamMessage | undefined;
  private user: UserResponse<DefaultUserType> | undefined;

  constructor(private chatClientService: ChatClientService) {
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
}
