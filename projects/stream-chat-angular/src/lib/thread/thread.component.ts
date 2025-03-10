import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostBinding,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { ChatClientService } from '../chat-client.service';
import { ChannelService } from '../channel.service';
import { CustomTemplatesService } from '../custom-templates.service';
import { getChannelDisplayText } from '../get-channel-display-text';
import { StreamMessage, ThreadHeaderContext } from '../types';
import { Channel } from 'stream-chat';

/**
 * The `Thread` component represents a [message thread](/chat/docs/javascript/threads/), it is a container component that displays a thread with a header, [`MessageList`](/chat/docs/sdk/angular/v6-rc/components/MessageListComponent) and [`MessageInput`](/chat/docs/sdk/angular/v6-rc/components/MessageInputComponent/) components.
 */
@Component({
  selector: 'stream-thread',
  templateUrl: './thread.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThreadComponent implements OnInit, AfterViewInit, OnDestroy {
  @HostBinding('class') private class = 'str-chat__thread';
  parentMessage: StreamMessage | undefined;
  channelName = '';
  private subscriptions: Subscription[] = [];
  private isViewInitialized = false;

  constructor(
    public customTemplatesService: CustomTemplatesService,
    private channelService: ChannelService,
    private chatClientService: ChatClientService,
    private cdRef: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.channelService.activeParentMessage$.subscribe((parentMessage) => {
        this.parentMessage = parentMessage;
        if (this.isViewInitialized) {
          this.cdRef.markForCheck();
        }
      }),
    );
    this.subscriptions.push(
      this.channelService.activeChannel$.subscribe((channel) => {
        const channelName = this.getChannelName(channel);
        if (channelName !== this.channelName) {
          this.channelName = channelName;
          if (this.isViewInitialized) {
            this.cdRef.markForCheck();
          }
        }
      }),
    );
  }
  ngAfterViewInit(): void {
    this.isViewInitialized = true;
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

  getChannelName(channel: Channel | undefined) {
    if (!channel || !this.chatClientService.chatClient.user) {
      return '';
    }
    return (
      getChannelDisplayText(channel, this.chatClientService.chatClient.user) ??
      ''
    );
  }
}
