import { Component, Input, OnInit } from '@angular/core';
import { Channel } from 'stream-chat';
import { ChannelService } from '../channel.service';

@Component({
  selector: 'stream-channel-preview',
  templateUrl: './channel-preview.component.html',
  styleUrls: ['./channel-preview.component.scss'],
})
export class ChannelPreviewComponent implements OnInit {
  @Input() channel: Channel | undefined;
  isActive = false;

  constructor(private channelService: ChannelService) {}

  ngOnInit(): void {
    this.channelService.activeChannel$.subscribe(
      (activeChannel) =>
        (this.isActive = activeChannel?.id === this.channel?.id)
    );
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

  get latestMessage() {
    const messages = this.channel?.state?.messages;
    return messages && messages.length > 0
      ? messages[messages.length - 1].text
      : '';
  }

  setAsActiveChannel(): void {
    void this.channelService.setAsActiveChannel(this.channel!);
  }
}
