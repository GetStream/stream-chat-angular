import { ChangeDetectionStrategy, Component, TemplateRef } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Channel } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { CustomTemplatesService } from '../custom-templates.service';
import { ThemeService } from '../theme.service';
import { ChannelPreviewContext } from '../types';

/**
 * The `ChannelList` component renders the list of channels.
 */
@Component({
  selector: 'stream-channel-list',
  templateUrl: './channel-list.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelListComponent {
  channels$: Observable<Channel[] | undefined>;
  isError$: Observable<boolean>;
  isInitializing$: Observable<boolean>;
  isLoadingMoreChannels = false;
  hasMoreChannels$: Observable<boolean>;
  customChannelPreviewTemplate: TemplateRef<ChannelPreviewContext> | undefined;
  theme$: Observable<string>;

  constructor(
    private channelService: ChannelService,
    public readonly customTemplatesService: CustomTemplatesService,
    private themeService: ThemeService,
  ) {
    this.theme$ = this.themeService.theme$;
    this.channels$ = this.channelService.channels$;
    this.hasMoreChannels$ = this.channelService.hasMoreChannels$;
    this.isError$ = this.channelService.shouldRecoverState$;
    this.isInitializing$ = this.channelService.channelQueryState$.pipe(
      map((s) => !this.isLoadingMoreChannels && s?.state === 'in-progress'),
    );
  }

  async loadMoreChannels() {
    this.isLoadingMoreChannels = true;
    await this.channelService.loadMoreChannels();
    this.isLoadingMoreChannels = false;
  }

  recoverState() {
    void this.channelService.recoverState();
  }

  trackByChannelId(_: number, item: Channel) {
    return item.cid;
  }
}
