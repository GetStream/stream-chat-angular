import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { ChannelService, DefaultStreamChatGenerics } from 'stream-chat-angular';
import { MessageListService } from '../message-list.service';
import { Channel, ChannelResponse } from 'stream-chat';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-custom-channel-list',
  templateUrl: './custom-channel-list.component.html',
  styleUrls: ['./custom-channel-list.component.scss'],
  // Each channel list has it's own ChannelService instance
  providers: [ChannelService],
})
export class CustomChannelListComponent implements OnInit, OnChanges {
  @Input() channelListType: '1:1 conversations' | 'Team conversations' =
    '1:1 conversations';

  constructor(
    private channelService: ChannelService,
    private messageListService: MessageListService
  ) {}

  ngOnInit(): void {
    this.channelService.activeChannel$.subscribe((channel) => {
      if (channel) {
        this.messageListService.openMessageListForChannel(channel);
      } else {
        this.messageListService.closeMessageList();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.channelListType) {
      this.filterChannels();
    }
  }

  private isChannelMatchesCurrentFilter(
    channel?:
      | ChannelResponse<DefaultStreamChatGenerics>
      | Channel<DefaultStreamChatGenerics>
  ) {
    if (!channel) {
      return false;
    }
    const memberCount =
      (channel.data
        ? (channel as Channel<DefaultStreamChatGenerics>).data?.member_count
        : (channel as ChannelResponse<DefaultStreamChatGenerics>)
            .member_count) || 0;
    if (this.channelListType === '1:1 conversations' && memberCount <= 2) {
      return true;
    } else if (
      this.channelListType === 'Team conversations' &&
      memberCount > 2
    ) {
      return true;
    }

    return false;
  }

  filterChannels() {
    // Channel filters only work for queryChannels endpoint
    // For WS events we have to define a filter to prevent adding channels that don't match the current filter
    const filter = (
      channel:
        | Channel<DefaultStreamChatGenerics>
        | ChannelResponse<DefaultStreamChatGenerics>
        | undefined,
      channelListSetter: (
        channels: (
          | Channel<DefaultStreamChatGenerics>
          | ChannelResponse<DefaultStreamChatGenerics>
        )[],
        shouldStopWatchingRemovedChannels?: boolean
      ) => void
    ) => {
      if (this.isChannelMatchesCurrentFilter(channel)) {
        console.log('matches filter');
        channelListSetter([channel!, ...this.channelService.channels]);
      }
    };

    this.channelService.customAddedToChannelNotificationHandler = (
      clientEvent,
      channelListSetter
    ) => filter(clientEvent.event.channel, channelListSetter);
    this.channelService.customNewMessageNotificationHandler = (
      clientEvent,
      channelListSetter
    ) => filter(clientEvent.event.channel, channelListSetter);
    this.channelService.customChannelVisibleHandler = (
      _,
      channel,
      channelListSetter
    ) => filter(channel, channelListSetter);

    this.channelService.reset();
    void this.channelService.init({
      type: 'messaging',
      members: { $in: [environment.userId] },
      member_count:
        this.channelListType === '1:1 conversations' ? { $lte: 2 } : { $gt: 2 },
    });
  }
}
