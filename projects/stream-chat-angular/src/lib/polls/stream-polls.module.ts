import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PollComposerComponent } from './poll-composer/poll-composer.component';
import { PollComponent } from './poll/poll.component';
import { PollHeaderComponent } from './poll-header/poll-header.component';
import { TranslateModule } from '@ngx-translate/core';
import { PollOptionsListComponent } from './poll-options-list/poll-options-list.component';
import { PollOptionSelectorComponent } from './poll-option-selector/poll-option-selector.component';
import { StreamAvatarModule } from '../stream-avatar.module';
import { PollActionsComponent } from './poll-actions/poll-actions.component';
import { StreamModalModule } from '../modal/stream-modal.module';
import { StreamNotificationModule } from '../notification-list/stream-notification.module';
import { StreamPaginatedListModule } from '../paginated-list/stream-paginated-list.module';
import { PollVoteComponent } from './poll-actions/poll-results/poll-vote/poll-vote.component';
import { PollAnswersListComponent } from './poll-actions/poll-answers-list/poll-answers-list.component';
import { PollVoteResultsListComponent } from './poll-actions/poll-results/poll-vote-results-list/poll-vote-results-list.component';
import { PollResultsListComponent } from './poll-actions/poll-results/poll-results-list/poll-results-list.component';
import { UpsertAnswerComponent } from './poll-actions/upsert-answer/upsert-answer.component';
import { AddOptionComponent } from './poll-actions/add-option/add-option.component';
import { ReactiveFormsModule } from '@angular/forms';
import { PollPreviewComponent } from './poll-preview/poll-preview.component';

@NgModule({
  declarations: [
    PollComposerComponent,
    PollComponent,
    PollHeaderComponent,
    PollOptionsListComponent,
    PollOptionSelectorComponent,
    PollActionsComponent,
    PollResultsListComponent,
    PollVoteResultsListComponent,
    PollVoteComponent,
    PollAnswersListComponent,
    UpsertAnswerComponent,
    AddOptionComponent,
    PollPreviewComponent,
  ],
  imports: [
    CommonModule,
    TranslateModule,
    StreamAvatarModule,
    StreamModalModule,
    StreamNotificationModule,
    StreamPaginatedListModule,
    ReactiveFormsModule,
  ],
  exports: [
    PollComposerComponent,
    PollComponent,
    PollHeaderComponent,
    PollOptionsListComponent,
    PollOptionSelectorComponent,
    PollActionsComponent,
    PollResultsListComponent,
    PollVoteResultsListComponent,
    PollVoteComponent,
    PollAnswersListComponent,
    UpsertAnswerComponent,
    AddOptionComponent,
    PollPreviewComponent,
  ],
})
export class StreamPollsModule {}
