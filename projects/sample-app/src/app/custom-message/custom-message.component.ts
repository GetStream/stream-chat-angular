import { Component, Input } from '@angular/core';
import { nsToDate } from 'stream-chat';
import { ChatClientService, StreamMessage } from 'stream-chat-angular';

@Component({
  selector: 'app-custom-message',
  templateUrl: './custom-message.component.html',
  styleUrls: ['./custom-message.component.scss'],
})
export class CustomMessageComponent {
  @Input() message: StreamMessage | undefined;
  userId: string | undefined;

  constructor(private chatClientService: ChatClientService) {
    this.userId = this.chatClientService.chatClient.user?.id;
  }

  get isSentByCurrentUser() {
    return this.message?.user?.id === this.userId;
  }

  get createdAt() {
    return this.message ? nsToDate(this.message.created_at) : undefined;
  }
}
