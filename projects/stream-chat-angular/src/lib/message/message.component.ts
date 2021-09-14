import { Component, Input } from '@angular/core';
import { FormatMessageResponse } from 'stream-chat';
import { ChatClientService } from '../chat-client.service';

@Component({
  selector: 'stream-message',
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.scss'],
})
export class MessageComponent {
  @Input() message: FormatMessageResponse | undefined;
  userId: string | undefined;

  constructor(private chatClientService: ChatClientService) {
    this.userId = this.chatClientService.chatClient.user?.id;
  }

  get isSentByCurrentUser() {
    return this.message?.user?.id === this.userId;
  }
}
