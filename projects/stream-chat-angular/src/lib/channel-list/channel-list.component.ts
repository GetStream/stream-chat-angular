import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { Observable, of, Subscription } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';
import { Channel } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { CustomTemplatesService } from '../custom-templates.service';
import { ChannelPreviewContext } from '../types';
import { ChannelListToggleService } from './channel-list-toggle.service';

/**
 * The `ChannelList` component renders the list of channels.
 */
@Component({
  selector: 'stream-channel-list',
  templateUrl: './channel-list.component.html',
  styles: [],
})
export class ChannelListComponent implements AfterViewInit, OnDestroy {
  channels$: Observable<Channel[] | undefined>;
  isError$: Observable<boolean>;
  isInitializing$: Observable<boolean>;
  isLoadingMoreChannels = false;
  isOpen$: Observable<boolean>;
  hasMoreChannels$: Observable<boolean>;
  customChannelPreviewTemplate: TemplateRef<ChannelPreviewContext> | undefined;
  subscriptions: Subscription[] = [];
  @ViewChild('container') private container!: ElementRef<HTMLElement>;

  constructor(
    private channelService: ChannelService,
    private channelListToggleService: ChannelListToggleService,
    private customTemplatesService: CustomTemplatesService
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
    this.subscriptions.push(
      this.customTemplatesService.channelPreviewTemplate$.subscribe(
        (template) => (this.customChannelPreviewTemplate = template)
      )
    );
  }
  ngAfterViewInit(): void {
    this.channelListToggleService.setMenuElement(this.container.nativeElement);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
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

  getChannelPreviewContext(channel: Channel): ChannelPreviewContext {
    return {
      channel,
    };
  }
}
