import { Component, ElementRef, ViewChild } from '@angular/core';
import { Channel } from 'stream-chat';
import { ChannelService } from '../channel.service';

@Component({
  selector: 'stream-message-input',
  templateUrl: './message-input.component.html',
  styleUrls: ['./message-input.component.scss'],
})
export class MessageInputComponent {
  activeChannel: Channel | undefined;
  @ViewChild('input') messageInput!: ElementRef<HTMLInputElement>;

  constructor(private channelService: ChannelService) {
    this.channelService.activeChannel$.subscribe(
      (c) => (this.activeChannel = c)
    );
  }

  async messageSent() {
    try {
      await this.activeChannel?.sendMessage({
        text: this.messageInput.nativeElement.value,
      });
      this.messageInput.nativeElement.value = '';
    } catch (error) {
      console.error('Message not sent', error);
    }
  }
}
