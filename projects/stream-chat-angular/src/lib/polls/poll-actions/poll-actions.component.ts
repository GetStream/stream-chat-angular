import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { BasePollComponent } from '../base-poll.component';
import { Poll, PollAnswer, PollOption } from 'stream-chat';
import { ModalContext } from '../../types';
import { CustomTemplatesService } from '../../custom-templates.service';
import { ChatClientService } from '../../chat-client.service';
import { ChannelService } from '../../channel.service';
import { MessageActionsService } from '../../message-actions.service';
import { NotificationService } from '../../notification.service';

type Action =
  | 'allOptions'
  | 'suggestOption'
  | 'addAnswer'
  | 'viewComments'
  | 'viewResults'
  | 'endVote';

/**
 *
 */
@Component({
  selector: 'stream-poll-actions',
  templateUrl: './poll-actions.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollActionsComponent extends BasePollComponent {
  /**
   * If there are more options than this number, the "See all options" button will be displayed
   */
  @Input() maxOptionsDisplayed: number | undefined = 10;
  /**
   * The maximum number of options allowed for the poll, this is defined by Stream API
   */
  @Input() maxPollOptions = 100;
  name = '';
  options: PollOption[] = [];
  isClosed = false;
  allowUserSuggestions = false;
  allowAnswers = false;
  answerCount = 0;
  isOwnPoll = false;
  ownAnwer: PollAnswer | undefined;
  selectedAction: Action | undefined = undefined;
  isModalOpen = false;
  @ViewChild('allOptions') allOptions!: TemplateRef<void>;
  @ViewChild('suggestOption') suggestOption!: TemplateRef<void>;
  @ViewChild('addAnswer') addAnswer!: TemplateRef<void>;
  @ViewChild('viewComments') viewComments!: TemplateRef<void>;
  @ViewChild('viewResults') viewResults!: TemplateRef<void>;
  @ViewChild('endVote') endVote!: TemplateRef<void>;

  constructor(
    customTemplatesService: CustomTemplatesService,
    chatClientService: ChatClientService,
    cdRef: ChangeDetectorRef,
    channelService: ChannelService,
    notificationService: NotificationService,
    private messageService: MessageActionsService
  ) {
    super(
      customTemplatesService,
      chatClientService,
      cdRef,
      channelService,
      notificationService
    );
  }

  protected stateStoreSelector(
    poll: Poll,
    markForCheck: () => void
  ): () => void {
    const unsubscribe = poll.state.subscribeWithSelector(
      (state) => ({
        options: state.options,
        is_closed: state.is_closed,
        allow_user_suggested_options: state.allow_user_suggested_options,
        allow_answers: state.allow_answers,
        answer_count: state.answers_count,
        created_by: state.created_by,
        name: state.name,
        own_answer: state.ownAnswer,
        max_votes_allowed: state.max_votes_allowed,
        own_votes_by_option_id: state.ownVotesByOptionId,
      }),
      (state) => {
        this.options = state.options;
        this.isClosed = state.is_closed ?? false;
        this.allowUserSuggestions = state.allow_user_suggested_options ?? false;
        this.allowAnswers = state.allow_answers ?? false;
        this.answerCount = state.answer_count ?? 0;
        this.isOwnPoll = state.created_by?.id === this.currentUser?.id;
        this.name = state.name;
        this.ownAnwer = state.own_answer ?? undefined;
        markForCheck();
      }
    );

    return unsubscribe;
  }

  modalOpened = (action: Action) => {
    this.selectedAction = action;
    if (!this.isModalOpen) {
      this.isModalOpen = true;
      this.messageService.modalOpenedForMessage.next(this.messageId);
    }
  };

  modalClosed = () => {
    this.selectedAction = undefined;
    if (this.isModalOpen) {
      this.isModalOpen = false;
      this.messageService.modalOpenedForMessage.next(undefined);
      this.markForCheck();
    }
  };

  async closePoll() {
    try {
      await this.poll?.close();
      this.modalClosed();
      this.markForCheck();
    } catch (error) {
      this.notificationService.addTemporaryNotification(
        'streamChat.Failed to end vote'
      );
      throw error;
    }
  }

  getModalContext(): ModalContext {
    return {
      isOpen: this.isModalOpen,
      isOpenChangeHandler: (isOpen: boolean) => {
        if (isOpen) {
          this.modalOpened(this.selectedAction!);
        } else {
          this.modalClosed();
        }
      },
      content: this[this.selectedAction!],
    };
  }
}
