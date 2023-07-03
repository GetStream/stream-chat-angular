import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { Channel } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { CustomTemplatesService } from '../custom-templates.service';
import { ThemeService } from '../theme.service';
import { ChannelPreviewContext, DefaultStreamChatGenerics } from '../types';
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
  channels$: Observable<Channel<DefaultStreamChatGenerics>[] | undefined>;
  isError$: Observable<boolean>;
  isInitializing$: Observable<boolean>;
  isLoadingMoreChannels = false;
  isOpen$: Observable<boolean>;
  hasMoreChannels$: Observable<boolean>;
  customChannelPreviewTemplate: TemplateRef<ChannelPreviewContext> | undefined;
  theme$: Observable<string>;
  subscriptions: Subscription[] = [];
  @ViewChild('container') private container!: ElementRef<HTMLElement>;

  constructor(
    private channelService: ChannelService,
    private channelListToggleService: ChannelListToggleService,
    private customTemplatesService: CustomTemplatesService,
    private themeService: ThemeService
  ) {
    this.theme$ = this.themeService.theme$;
    this.isOpen$ = this.channelListToggleService.isOpen$;
    this.channels$ = this.channelService.channels$;
    this.hasMoreChannels$ = this.channelService.hasMoreChannels$;
    this.isError$ = this.channelService.channelQueryState$.pipe(
      map((s) => !this.isLoadingMoreChannels && s?.state === 'error')
    );
    this.isInitializing$ = this.channelService.channelQueryState$.pipe(
      map((s) => !this.isLoadingMoreChannels && s?.state === 'in-progress')
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

  trackByChannelId(index: number, item: Channel<DefaultStreamChatGenerics>) {
    return item.cid;
  }

  channelSelected() {
    this.channelListToggleService.channelSelected();
  }
}
