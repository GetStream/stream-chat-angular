import { Component, HostBinding, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChannelService } from '../channel.service';
import { StreamMessage } from '../types';

/**
 * The `Thread` component represents a [message thread](https://getstream.io/chat/docs/javascript/threads/?language=javascript), it is a container component that displays a thread with a header, [`MessageList`](./MessageListComponent.mdx) and [`MessageInput`](./MessageInputComponent.mdx) components.
 */
@Component({
  selector: 'stream-thread',
  templateUrl: './thread.component.html',
  styles: [],
})
export class ThreadComponent implements OnDestroy {
  @HostBinding('class') private class = 'str-chat__thread';
  parentMessage: StreamMessage | undefined;
  private subscriptions: Subscription[] = [];

  constructor(private channelService: ChannelService) {
    this.subscriptions.push(
      this.channelService.activeParentMessage$.subscribe(
        (parentMessage) => (this.parentMessage = parentMessage)
      )
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  get replyCountParam() {
    return { replyCount: this.parentMessage?.reply_count };
  }

  closeThread() {
    void this.channelService.setAsActiveParentMessage(undefined);
  }
}
