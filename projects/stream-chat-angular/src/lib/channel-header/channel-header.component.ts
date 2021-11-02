import { Component } from '@angular/core';
import { Channel } from 'stream-chat';
import { ChannelListToggleService } from '../channel-list/channel-list-toggle.service';
import { ChannelService } from '../channel.service';

@Component({
  selector: 'stream-channel-header',
  templateUrl: './channel-header.component.html',
  styles: [],
})
export class ChannelHeaderComponent {
  activeChannel: Channel | undefined;

  constructor(
    private channelService: ChannelService,
    private channelListToggleService: ChannelListToggleService
  ) {
    this.channelService.activeChannel$.subscribe(
      (c) => (this.activeChannel = c)
    );
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.channelListToggleService.toggle();
  }

  get memberCountParam() {
    return { memberCount: this.activeChannel?.data?.member_count || 0 };
  }

  get watcherCountParam() {
    return { watcherCount: this.activeChannel?.state?.watcher_count || 0 };
  }
}
