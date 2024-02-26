import { Component } from '@angular/core';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChannelService } from '../channel.service';
import { ThemeService } from '../theme.service';
import { CustomTemplatesService } from '../custom-templates.service';

/**
 * The `Channel` component is a container component that displays the [`ChannelHeader`](./ChannelHeaderComponent.mdx), [`MessageList`](./MessageListComponent.mdx), [`NotificationList`](./NotificationListComponent.mdx) and [`MessageInput`](./MessageInputComponent.mdx) components. You can also provide the [`Thread`](./ThreadComponent.mdx) component to use message [threads](https://getstream.io/chat/docs/javascript/threads/?language=javascript).
 */
@Component({
  selector: 'stream-channel',
  templateUrl: './channel.component.html',
  styles: [],
})
export class ChannelComponent {
  isError$: Observable<boolean>;
  isInitializing$: Observable<boolean>;
  isActiveThread$: Observable<boolean>;
  isActiveChannel$: Observable<boolean>;
  subscriptions: Subscription[] = [];
  theme$: Observable<string>;

  constructor(
    private channelService: ChannelService,
    private themeService: ThemeService,
    readonly customTemplatesService: CustomTemplatesService
  ) {
    this.isError$ = combineLatest([
      this.channelService.channelQueryState$,
      this.channelService.activeChannel$,
    ]).pipe(
      map(([state, activeChannel]) => {
        return !activeChannel && state?.state === 'error';
      })
    );
    this.isInitializing$ = combineLatest([
      this.channelService.channelQueryState$,
      this.channelService.activeChannel$,
    ]).pipe(
      map(([state, activeChannel]) => {
        return !activeChannel && state?.state === 'in-progress';
      })
    );
    this.isActiveThread$ = this.channelService.activeParentMessageId$.pipe(
      map((id) => !!id)
    );
    this.theme$ = this.themeService.theme$;
    this.isActiveChannel$ = this.channelService.activeChannel$.pipe(
      map((c) => !!c)
    );
  }
}
