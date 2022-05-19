import { Component, HostBinding, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Channel } from 'stream-chat';
import { ChatClientService } from '../chat-client.service';
import { ChannelService } from '../channel.service';
import { CustomTemplatesService } from '../custom-templates.service';
import { getChannelDisplayText } from '../get-channel-display-text';
import {
  DefaultStreamChatGenerics,
  StreamMessage,
  ThreadHeaderContext,
} from '../types';

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
  channel: Channel<DefaultStreamChatGenerics> | undefined;
  private subscriptions: Subscription[] = [];

  constructor(
    public customTemplatesService: CustomTemplatesService,
    private channelService: ChannelService,
    private chatClientService: ChatClientService
  ) {
    this.subscriptions.push(
      this.channelService.activeParentMessage$.subscribe(
        (parentMessage) => (this.parentMessage = parentMessage)
      )
    );
    this.subscriptions.push(
      this.channelService.activeChannel$.subscribe(
        (channel) => (this.channel = channel)
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

  closeThread() {
    void this.channelService.setAsActiveParentMessage(undefined);
  }

  get channelName() {
    if (!this.channel || !this.chatClientService.chatClient.user) {
      return '';
    }
    return getChannelDisplayText(
      this.channel,
      this.chatClientService.chatClient.user
    );
  }
}
