import { NgModule } from '@angular/core';
import { AvatarComponent } from './avatar/avatar.component';
import { ChannelComponent } from './channel/channel.component';
import { ChannelHeaderComponent } from './channel-header/channel-header.component';
import { ChannelListComponent } from './channel-list/channel-list.component';
import { ChannelPreviewComponent } from './channel-preview/channel-preview.component';
import { MessageComponent } from './message/message.component';
import { MessageInputComponent } from './message-input/message-input.component';
import { MessageListComponent } from './message-list/message-list.component';
import { CommonModule } from '@angular/common';
import { LoadingIndicatorComponent } from './loading-indicator/loading-indicator.component';
import { IconComponent } from './icon/icon.component';
import { MessageActionsBoxComponent } from './message-actions-box/message-actions-box.component';
import { AttachmentListComponent } from './attachment-list/attachment-list.component';

@NgModule({
  declarations: [
    AvatarComponent,
    ChannelComponent,
    ChannelHeaderComponent,
    ChannelListComponent,
    ChannelPreviewComponent,
    MessageComponent,
    MessageInputComponent,
    MessageListComponent,
    LoadingIndicatorComponent,
    IconComponent,
    MessageActionsBoxComponent,
    AttachmentListComponent,
  ],
  imports: [CommonModule],
  exports: [
    AvatarComponent,
    ChannelComponent,
    ChannelHeaderComponent,
    ChannelListComponent,
    ChannelPreviewComponent,
    MessageComponent,
    MessageInputComponent,
    MessageListComponent,
  ],
})
export class StreamChatAngularModule {}
