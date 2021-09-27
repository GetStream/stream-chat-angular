import { Component, Input } from '@angular/core';
import { FormatMessageResponse } from 'stream-chat';
import { ChatClientService } from 'stream-chat-angular';

@Component({
  selector: 'app-custom-message',
  templateUrl: './custom-message.component.html',
  styleUrls: ['./custom-message.component.scss'],
})
export class CustomMessageComponent {
  @Input() message: FormatMessageResponse | undefined;
  userId: string | undefined;

  constructor(private chatClientService: ChatClientService) {
    this.userId = this.chatClientService.chatClient.user?.id;
  }

  get isSentByCurrentUser() {
    return this.message?.user?.id === this.userId;
  }
}
