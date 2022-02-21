import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';
import { Channel } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { ChannelListToggleService } from './channel-list-toggle.service';

/**
 * The `ChannelList` component renders the list of channels.
 */
@Component({
  selector: 'stream-channel-list',
  templateUrl: './channel-list.component.html',
  styles: [],
})
export class ChannelListComponent implements AfterViewInit {
  /**
   * By default, the [default preview component](./ChannelPreviewComponent.mdx) is used. To change the contents of the channel list, [provide your own custom template](./ChannelPreviewComponent.mdx/#customization).
   */
  @Input() customChannelPreviewTemplate: TemplateRef<any> | undefined;
  channels$: Observable<Channel[] | undefined>;
  isError$: Observable<boolean>;
  isInitializing$: Observable<boolean>;
  isLoadingMoreChannels = false;
  isOpen$: Observable<boolean>;
  hasMoreChannels$: Observable<boolean>;
  @ViewChild('container') private container!: ElementRef<HTMLElement>;

  constructor(
    private channelService: ChannelService,
    private channelListToggleService: ChannelListToggleService
  ) {
    this.isOpen$ = this.channelListToggleService.isOpen$;
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
  ngAfterViewInit(): void {
    this.channelListToggleService.setMenuElement(this.container.nativeElement);
  }

  async loadMoreChannels() {
    this.isLoadingMoreChannels = true;
    await this.channelService.loadMoreChannels();
    this.isLoadingMoreChannels = false;
  }

  trackByChannelId(index: number, item: Channel) {
    return item.cid;
  }

  channelSelected() {
    this.channelListToggleService.channelSelected();
  }
}
