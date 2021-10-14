import { Component, ElementRef, ViewChild } from '@angular/core';
import { ChannelService } from '../channel.service';

@Component({
  selector: 'stream-message-input',
  templateUrl: './message-input.component.html',
  styles: [],
})
export class MessageInputComponent {
  @ViewChild('input') private messageInput!: ElementRef<HTMLInputElement>;

  constructor(private channelService: ChannelService) {}

  messageSent(event?: Event) {
    event?.preventDefault();
    const text = this.messageInput.nativeElement.value;
    this.messageInput.nativeElement.value = '';
    void this.channelService.sendMessage(text);
  }
}
