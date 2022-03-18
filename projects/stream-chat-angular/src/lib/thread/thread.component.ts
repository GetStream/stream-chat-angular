import { Component, HostBinding, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChannelService } from '../channel.service';
import { CustomTemplatesService } from '../custom-templates.service';
import { StreamMessage, ThreadHeaderContext } from '../types';

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

  constructor(
    public customTemplatesService: CustomTemplatesService,
    private channelService: ChannelService
  ) {
    this.subscriptions.push(
      this.channelService.activeParentMessage$.subscribe(
        (parentMessage) => (this.parentMessage = parentMessage)
      )
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  getThreadHeaderContext(): ThreadHeaderContext {
    return {
      parentMessage: this.parentMessage,
      closeThreadHandler: () => this.closeThread(),
    };
  }

  getReplyCountParam(parentMessage: StreamMessage | undefined) {
    return { replyCount: parentMessage?.reply_count };
  }

  closeThread() {
    void this.channelService.setAsActiveParentMessage(undefined);
  }
}
