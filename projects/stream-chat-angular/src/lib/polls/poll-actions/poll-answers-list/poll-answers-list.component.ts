import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { BasePollComponent } from '../../base-poll.component';
import { Poll, PollAnswer } from 'stream-chat';

/**
 *
 */
@Component({
  selector: 'stream-poll-answers-list',
  templateUrl: './poll-answers-list.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollAnswersListComponent
  extends BasePollComponent
  implements OnChanges
{
  @HostBinding('class') class = 'str-chat__modal__poll-answer-list';
  /**
   * The even that's emitted when the update/add comment button is clicked
   */
  @Output() readonly upsertOwnAnswer = new EventEmitter<void>();
  isLoading = false;
  next?: string | undefined;
  answers: PollAnswer[] = [];
  isClosed = false;
  ownAnswer: PollAnswer | undefined;

  ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);
    if (changes['pollId']) {
      void this.queryAnswers();
    }
  }

  async queryAnswers() {
    if (!this.poll) {
      return;
    }
    try {
      this.isLoading = true;
      const response = await this.poll.queryAnswers({
        filter: {},
        sort: { created_at: -1 },
        options: {
          next: this.next,
        },
      });

      this.next = response.next;
      this.answers = [...this.answers, ...response.votes];
      this.markForCheck();
    } catch (error) {
      this.notificationService.addTemporaryNotification(
        'streamChat.Error loading answers'
      );
      this.markForCheck();
      throw error;
    } finally {
      this.isLoading = false;
      this.markForCheck();
    }
  }

  trackByAnswerId(_: number, answer: PollAnswer) {
    return answer.id;
  }

  protected stateStoreSelector(
    poll: Poll,
    markForCheck: () => void
  ): () => void {
    const unsubscribe = poll.state.subscribeWithSelector(
      (state) => ({
        is_closed: state.is_closed,
        own_answer: state.ownAnswer,
      }),
      (state) => {
        this.isClosed = state.is_closed ?? false;
        this.ownAnswer = state.own_answer ?? undefined;
        markForCheck();
      }
    );

    return unsubscribe;
  }
}
