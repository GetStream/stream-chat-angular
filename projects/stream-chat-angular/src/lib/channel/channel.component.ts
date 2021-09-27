import { Component, Input, TemplateRef } from '@angular/core';
import { Channel } from 'stream-chat';
import { ChannelService } from '../channel.service';

@Component({
  selector: 'stream-channel',
  templateUrl: './channel.component.html',
  styleUrls: ['./channel.component.scss'],
})
export class ChannelComponent {
  @Input() messageTemplate: TemplateRef<any> | undefined;
  activeChannel: Channel | undefined;

  constructor(private channelService: ChannelService) {
    this.channelService.activeChannel$.subscribe(
      (c) => (this.activeChannel = c)
    );
    this.activeChannel?.state.messages;
  }
}
