import { Component, Input, TemplateRef } from '@angular/core';
import { Channel } from 'stream-chat';
import { ChannelListToggleService } from '../channel-list/channel-list-toggle.service';
import { ChannelService } from '../channel.service';

/**
 * The `ChannelHeader` component displays the avatar and name of the currently active channel along with member and watcher information. You can read about [the difference between members and watchers](https://getstream.io/chat/docs/javascript/watch_channel/?language=javascript#watchers-vs-members) in the platform documentation. Please note that number of watchers is only displayed if the user has [`connect-events` capability](https://getstream.io/chat/docs/javascript/channel_capabilities/?language=javascript)
 */
@Component({
  selector: 'stream-channel-header',
  templateUrl: './channel-header.component.html',
  styles: [],
})
export class ChannelHeaderComponent {
  /**
   * Template that can be used to add actions (such as edit, invite) to the channel header
   */
  @Input() channelActionsTemplate?: TemplateRef<{ channel: Channel }>;
  activeChannel: Channel | undefined;
  canReceiveConnectEvents: boolean | undefined;

  constructor(
    private channelService: ChannelService,
    private channelListToggleService: ChannelListToggleService
  ) {
    this.channelService.activeChannel$.subscribe((c) => {
      this.activeChannel = c;
      const capabilities = this.activeChannel?.data
        ?.own_capabilities as string[];
      if (!capabilities) {
        return;
      }
      this.canReceiveConnectEvents =
        capabilities.indexOf('connect-events') !== -1;
    });
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
