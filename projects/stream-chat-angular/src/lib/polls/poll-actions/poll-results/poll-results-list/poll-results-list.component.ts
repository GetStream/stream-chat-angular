import { ChangeDetectionStrategy, Component, HostBinding } from '@angular/core';
import { BasePollComponent } from '../../../base-poll.component';
import { Poll, PollOption, PollVote } from 'stream-chat';

/**
 *
 */
@Component({
  selector: 'stream-poll-results-list',
  templateUrl: './poll-results-list.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollResultsListComponent extends BasePollComponent {
  @HostBinding('class') class = 'str-chat__modal__poll-results';
  name = '';
  options: PollOption[] = [];
  optionToView: PollOption | undefined;
  votePreviewCount = 5;
  maxVotedOptionIds: string[] = [];
  voteCountsByOption: Record<string, number> = {};
  latestVotesByOption: Record<string, PollVote[]> = {};

  protected stateStoreSelector(
    poll: Poll,
    markForCheck: () => void
  ): () => void {
    const unsubscribe = poll.state.subscribeWithSelector(
      (state) => ({
        name: state.name,
        options: state.options,
        maxVotedOptionIds: state.maxVotedOptionIds,
        vote_counts_by_option: state.vote_counts_by_option,
        latest_votes_by_option: state.latest_votes_by_option,
      }),
      (state) => {
        this.name = state.name;
        this.options = [...state.options];
        this.options.sort((a, b) => {
          return (
            (state.vote_counts_by_option[b.id] ?? 0) -
            (state.vote_counts_by_option[a.id] ?? 0)
          );
        });
        this.maxVotedOptionIds = state.maxVotedOptionIds;
        this.voteCountsByOption = state.vote_counts_by_option;
        this.latestVotesByOption = state.latest_votes_by_option;
        markForCheck();
      }
    );

    return unsubscribe;
  }

  isWinner(optionId: string) {
    return (
      this.maxVotedOptionIds.length === 1 &&
      this.maxVotedOptionIds[0] === optionId
    );
  }

  trackByOptionId(_: number, option: PollOption) {
    return option.id;
  }

  trackByVoteId(_: number, vote: PollVote) {
    return vote.id;
  }
}
