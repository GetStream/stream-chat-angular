import { NgModule } from '@angular/core';
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
import { MessageReactionsComponent } from './message-reactions/message-reactions.component';
import { NotificationComponent } from './notification/notification.component';
import { NotificationListComponent } from './notification-list/notification-list.component';
import { TranslateModule } from '@ngx-translate/core';
import { AttachmentPreviewListComponent } from './attachment-preview-list/attachment-preview-list.component';
import { ModalComponent } from './modal/modal.component';
import { TextareaDirective } from './message-input/textarea.directive';
import { StreamAvatarModule } from './stream-avatar.module';
import { ThreadComponent } from './thread/thread.component';
import { IconPlaceholderComponent } from './icon-placeholder/icon-placeholder.component';
import { LoadingIndicatorPlaceholderComponent } from './loading-indicator-placeholder/loading-indicator-placeholder.component';
import { NgxPopperjsModule } from 'ngx-popperjs';
import { EditMessageFormComponent } from './edit-message-form/edit-message-form.component';
import { MessageBouncePromptComponent } from './message-bounce-prompt/message-bounce-prompt.component';
import { VoiceRecordingComponent } from './voice-recording/voice-recording.component';
import { VoiceRecordingWavebarComponent } from './voice-recording/voice-recording-wavebar/voice-recording-wavebar.component';

@NgModule({
  declarations: [
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
    MessageReactionsComponent,
    NotificationComponent,
    NotificationListComponent,
    AttachmentPreviewListComponent,
    ModalComponent,
    TextareaDirective,
    ThreadComponent,
    IconPlaceholderComponent,
    LoadingIndicatorPlaceholderComponent,
    EditMessageFormComponent,
    MessageBouncePromptComponent,
    VoiceRecordingComponent,
    VoiceRecordingWavebarComponent,
  ],
  imports: [
    CommonModule,
    TranslateModule,
    StreamAvatarModule,
    NgxPopperjsModule,
  ],
  exports: [
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
    MessageReactionsComponent,
    NotificationComponent,
    NotificationListComponent,
    AttachmentPreviewListComponent,
    ModalComponent,
    StreamAvatarModule,
    ThreadComponent,
    IconPlaceholderComponent,
    LoadingIndicatorPlaceholderComponent,
    EditMessageFormComponent,
    MessageBouncePromptComponent,
    VoiceRecordingComponent,
    VoiceRecordingWavebarComponent,
  ],
})
export class StreamChatModule {}
