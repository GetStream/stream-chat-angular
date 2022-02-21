import { Component } from '@angular/core';
import { Observable, of, Subscription } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';
import { ChannelService } from '../channel.service';

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
  subscriptions: Subscription[] = [];

  constructor(private channelService: ChannelService) {
    this.isError$ = this.channelService.channels$.pipe(
      map(() => false),
      catchError(() => of(true)),
      startWith(false)
    );
    this.isInitializing$ = this.channelService.channels$.pipe(
      map((channels) => !channels),
      catchError(() => of(false))
    );
    this.isActiveThread$ = this.channelService.activeParentMessageId$.pipe(
      map((id) => !!id)
    );
  }
}
