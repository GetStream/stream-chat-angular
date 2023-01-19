import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { Channel } from 'stream-chat';
import { ChannelListToggleService } from '../channel-list/channel-list-toggle.service';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import { CustomTemplatesService } from '../custom-templates.service';
import { getChannelDisplayText } from '../get-channel-display-text';
import {
  ChannelActionsContext,
  ChannelHeaderInfoContext,
  DefaultStreamChatGenerics,
} from '../types';

/**
 * The `ChannelHeader` component displays the avatar and name of the currently active channel along with member and watcher information. You can read about [the difference between members and watchers](https://getstream.io/chat/docs/javascript/watch_channel/?language=javascript#watchers-vs-members) in the platform documentation. Please note that number of watchers is only displayed if the user has [`connect-events` capability](https://getstream.io/chat/docs/javascript/channel_capabilities/?language=javascript)
 */
@Component({
  selector: 'stream-channel-header',
  templateUrl: './channel-header.component.html',
  styles: [],
})
export class ChannelHeaderComponent implements OnInit, OnDestroy {
  channelActionsTemplate?: TemplateRef<ChannelActionsContext>;
  channelHeaderInfoTemplate?: TemplateRef<ChannelHeaderInfoContext>;
  activeChannel: Channel<DefaultStreamChatGenerics> | undefined;
  canReceiveConnectEvents: boolean | undefined;
  private subscriptions: Subscription[] = [];

  constructor(
    private channelService: ChannelService,
    private channelListToggleService: ChannelListToggleService,
    private customTemplatesService: CustomTemplatesService,
    private cdRef: ChangeDetectorRef,
    private chatClientService: ChatClientService
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
  ngOnInit(): void {
    this.subscriptions.push(
      this.customTemplatesService.channelActionsTemplate$.subscribe(
        (template) => {
          this.channelActionsTemplate = template;
          this.cdRef.detectChanges();
        }
      )
    );
    this.subscriptions.push(
      this.customTemplatesService.channelHeaderInfoTemplate$.subscribe(
        (template) => {
          this.channelHeaderInfoTemplate = template;
          this.cdRef.detectChanges();
        }
      )
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.channelListToggleService.toggle();
  }

  getChannelActionsContext(): ChannelActionsContext {
    return { channel: this.activeChannel! };
  }

  getChannelInfoContext(): ChannelHeaderInfoContext {
    return { channel: this.activeChannel! };
  }

  get memberCountParam() {
    return { memberCount: this.activeChannel?.data?.member_count || 0 };
  }

  get watcherCountParam() {
    return { watcherCount: this.activeChannel?.state?.watcher_count || 0 };
  }

  get displayText() {
    if (!this.activeChannel) {
      return '';
    }
    return getChannelDisplayText(
      this.activeChannel,
      this.chatClientService.chatClient.user!
    );
  }

  get avatarName() {
    return this.activeChannel?.data?.name;
  }
}
