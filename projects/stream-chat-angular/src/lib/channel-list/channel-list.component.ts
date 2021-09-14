import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { Channel } from 'stream-chat';
import { ChannelService } from '../channel.service';

@Component({
  selector: 'stream-channel-list',
  templateUrl: './channel-list.component.html',
  styleUrls: ['./channel-list.component.scss'],
})
export class ChannelListComponent {
  channels$: Observable<Channel[]>;

  constructor(private channelService: ChannelService) {
    this.channels$ = this.channelService.channels$;
  }
}
