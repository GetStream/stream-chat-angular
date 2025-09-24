import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { BasePollComponent } from '../../../base-poll.component';
import { Poll, PollOption, PollVote } from 'stream-chat';

/**
 *
 */
@Component({
  selector: 'stream-poll-vote-results-list',
  templateUrl: './poll-vote-results-list.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollVoteResultsListComponent
  extends BasePollComponent
  implements OnChanges
{
  /**
   * The poll option to display the votes for
   */
  @Input() option: PollOption | undefined;
  isWinner = false;
  voteCount = 0;
  isLoading = false;
  next?: string | undefined;
  votes: PollVote[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);
    if (changes['option']) {
      this.setupStateStoreSelector();
      this.next = undefined;
      this.votes = [];
      void this.loadVotes();
    }
  }

  async loadVotes() {
    if (!this.poll) {
      return;
    }
    try {
      this.isLoading = true;
      const response = await this.poll.queryOptionVotes({
        filter: {
          option_id: this.option?.id ?? '',
        },
        sort: { created_at: -1 },
        options: {
          next: this.next,
        },
      });

      this.next = response.next;
      this.votes = [...this.votes, ...response.votes];
      this.markForCheck();
    } catch (error) {
      this.notificationService.addTemporaryNotification(
        'streamChat.Error loading votes'
      );
      throw error;
      this.markForCheck();
    } finally {
      this.isLoading = false;
      this.markForCheck();
    }
  }

  trackByVoteId = (_: number, vote: PollVote) => {
    return vote.id;
  };

  protected stateStoreSelector(
    poll: Poll,
    markForCheck: () => void
  ): () => void {
    const subscribe = poll.state.subscribeWithSelector(
      (state) => ({
        voteCount: state.vote_counts_by_option[this.option?.id ?? ''],
        maxVotedOptionIds: state.maxVotedOptionIds,
      }),
      (state) => {
        this.isWinner =
          state.maxVotedOptionIds?.includes(this.option?.id ?? '') &&
          state.maxVotedOptionIds.length === 1;
        this.voteCount = state.voteCount ?? 0;
        markForCheck();
      }
    );

    return subscribe;
  }
}
