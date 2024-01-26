import { Injectable } from '@angular/core';
import { Channel } from 'stream-chat';
import { ChannelService, DefaultStreamChatGenerics } from 'stream-chat-angular';

@Injectable({
  providedIn: 'root',
})
export class MessageListService {
  // This is the root level ChannelService instance that's connected to the MessageListComponent
  constructor(private channelService: ChannelService) {}

  openMessageListForChannel(channel: Channel<DefaultStreamChatGenerics>) {
    this.channelService.setAsActiveChannel(channel);
  }

  closeMessageList() {
    this.channelService.deselectActiveChannel();
  }
}
