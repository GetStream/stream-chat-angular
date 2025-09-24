import { NgModule } from '@angular/core';
import { ChannelComponent } from './channel/channel.component';
import { ChannelHeaderComponent } from './channel-header/channel-header.component';
import { ChannelListComponent } from './channel-list/channel-list.component';
import { ChannelPreviewComponent } from './channel-preview/channel-preview.component';
import { MessageComponent } from './message/message.component';
import { MessageInputComponent } from './message-input/message-input.component';
import { MessageListComponent } from './message-list/message-list.component';
import { CommonModule } from '@angular/common';
import { MessageActionsBoxComponent } from './message-actions-box/message-actions-box.component';
import { AttachmentListComponent } from './attachment-list/attachment-list.component';
import { MessageReactionsComponent } from './message-reactions/message-reactions.component';
import { NotificationComponent } from './notification/notification.component';
import { NotificationListComponent } from './notification-list/notification-list.component';
import { AttachmentPreviewListComponent } from './attachment-preview-list/attachment-preview-list.component';
import { TextareaDirective } from './message-input/textarea.directive';
import { StreamAvatarModule } from './stream-avatar.module';
import { ThreadComponent } from './thread/thread.component';
import { MessageBouncePromptComponent } from './message-bounce-prompt/message-bounce-prompt.component';
import { NgxFloatUiModule } from 'ngx-float-ui';
import { TranslateModule } from '@ngx-translate/core';
import { MessageReactionsSelectorComponent } from './message-reactions-selector/message-reactions-selector.component';
import { UserListComponent } from './user-list/user-list.component';
import { VoiceRecordingModule } from './voice-recording/voice-recording.module';
import { IconModule } from './icon/icon.module';
import { VoiceRecorderService } from './message-input/voice-recorder.service';
import { MessageTextComponent } from './message-text/message-text.component';
import { MessageBlockedComponent } from './message-blocked/message-blocked.component';
import { StreamModalModule } from './modal/stream-modal.module';
import { StreamNotificationModule } from './notification-list/stream-notification.module';
import { StreamPaginatedListModule } from './paginated-list/stream-paginated-list.module';

@NgModule({
  declarations: [
    ChannelComponent,
    ChannelHeaderComponent,
    ChannelListComponent,
    ChannelPreviewComponent,
    MessageComponent,
    MessageInputComponent,
    MessageListComponent,
    MessageActionsBoxComponent,
    AttachmentListComponent,
    MessageReactionsComponent,
    AttachmentPreviewListComponent,
    TextareaDirective,
    ThreadComponent,
    MessageBouncePromptComponent,
    MessageReactionsSelectorComponent,
    UserListComponent,
    MessageTextComponent,
    MessageBlockedComponent,
  ],
  imports: [
    CommonModule,
    NgxFloatUiModule,
    StreamAvatarModule,
    TranslateModule,
    VoiceRecordingModule,
    IconModule,
    StreamModalModule,
    StreamNotificationModule,
    StreamPaginatedListModule,
  ],
  exports: [
    ChannelComponent,
    ChannelHeaderComponent,
    ChannelListComponent,
    ChannelPreviewComponent,
    MessageComponent,
    MessageInputComponent,
    MessageListComponent,
    MessageActionsBoxComponent,
    AttachmentListComponent,
    MessageReactionsComponent,
    NotificationComponent,
    NotificationListComponent,
    AttachmentPreviewListComponent,
    StreamModalModule,
    StreamAvatarModule,
    ThreadComponent,
    MessageBouncePromptComponent,
    VoiceRecordingModule,
    MessageReactionsSelectorComponent,
    UserListComponent,
    StreamPaginatedListModule,
    IconModule,
    MessageTextComponent,
    MessageBlockedComponent,
    StreamNotificationModule,
  ],
  providers: [VoiceRecorderService],
})
export class StreamChatModule {}
