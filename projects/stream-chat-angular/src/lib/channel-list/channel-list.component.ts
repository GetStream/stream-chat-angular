import { Component, Input, TemplateRef } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';
import { Channel } from 'stream-chat';
import { ChannelService } from '../channel.service';

@Component({
  selector: 'stream-channel-list',
  templateUrl: './channel-list.component.html',
  styles: [],
})
export class ChannelListComponent {
  @Input() customChannelPreviewTemplate: TemplateRef<any> | undefined;
  channels$: Observable<Channel[] | undefined>;
  isError$: Observable<boolean>;
  isInitializing$: Observable<boolean>;
  isLoadingMoreChannels = false;
  hasMoreChannels$: Observable<boolean>;

  constructor(private channelService: ChannelService) {
    this.channels$ = this.channelService.channels$;
    this.hasMoreChannels$ = this.channelService.hasMoreChannels$;
    this.isError$ = this.channels$.pipe(
      map(() => false),
      catchError(() => of(true)),
      startWith(false)
    );
    this.isInitializing$ = this.channels$.pipe(
      map((channels) => !channels),
      catchError(() => of(false))
    );
  }

  async loadMoreChannels() {
    this.isLoadingMoreChannels = true;
    await this.channelService.loadMoreChannels();
    this.isLoadingMoreChannels = false;
  }

  trackByChannelId(index: number, item: Channel) {
    return item.cid;
  }
}
