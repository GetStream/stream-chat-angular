import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { BasePollComponent } from '../base-poll.component';
import {
  isVoteAnswer,
  Poll,
  PollOption,
  PollVote,
  VotingVisibility,
} from 'stream-chat';

/**
 *
 */
@Component({
  selector: 'stream-poll-option-selector',
  templateUrl: './poll-option-selector.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollOptionSelectorComponent
  extends BasePollComponent
  implements OnChanges
{
  @Input() option: PollOption | undefined;
  @Input() displayAvatarCount = 3;
  @Input() voteCountVerbose = false;
  isClosed = false;
  latestVotes: PollVote[] = [];
  isWinner = false;
  ownVote: PollVote | undefined;
  voteCount = 0;
  votingVisibility: VotingVisibility | undefined;
  winningOptionCount = 0;
  maxVoteAllowedCount = 0;
  ownVoteCount = 0;

  ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);
    if (changes['option']) {
      this.setupStateStoreSelector();
    }
  }

  async toggleVote() {
    if (!this.canVote || !this.option?.id || !this.messageId || this.isClosed)
      return;
    const haveVotedForTheOption = !!this.ownVote;
    if (
      !haveVotedForTheOption &&
      this.maxVoteAllowedCount > 0 &&
      this.ownVoteCount >= this.maxVoteAllowedCount
    ) {
      this.addNotification(
        'streamChat.You have reached the maximum number of votes allowed'
      );
      return;
    }
    try {
      await (haveVotedForTheOption
        ? this.poll?.removeVote(this.ownVote!.id, this.messageId)
        : this.poll?.castVote(this.option?.id, this.messageId));
    } catch (error) {
      this.notificationService.addTemporaryNotification(
        'streamChat.Failed to cast vote'
      );
      throw error;
    }
  }

  trackByVoteId(_: number, vote: PollVote) {
    return vote.id;
  }

  protected stateStoreSelector(
    poll: Poll,
    markForCheck: () => void
  ): () => void {
    const unsubscribe = poll.state.subscribeWithSelector(
      (nextValue) => {
        return {
          is_closed: nextValue.is_closed,
          latest_votes_by_option: nextValue.latest_votes_by_option,
          maxVotedOptionIds: nextValue.maxVotedOptionIds,
          ownVotesByOptionId: nextValue.ownVotesByOptionId,
          vote_counts_by_option: nextValue.vote_counts_by_option,
          voting_visibility: nextValue.voting_visibility,
          max_votes_allowed: nextValue.max_votes_allowed,
        };
      },
      (state) => {
        const isClosed = state.is_closed;
        const latestVotes =
          state.latest_votes_by_option[this.option?.id ?? '']?.filter(
            (vote) => !!vote.user && !isVoteAnswer(vote)
          ) ?? [];
        const isWinner =
          state.maxVotedOptionIds.includes(this.option?.id ?? '') &&
          state.maxVotedOptionIds.length === 1;
        const ownVote = state.ownVotesByOptionId[this.option?.id ?? ''];
        const voteCount = state.vote_counts_by_option[this.option?.id ?? ''];
        const votingVisibility = state.voting_visibility;
        const winningOptionCount =
          state.vote_counts_by_option[state.maxVotedOptionIds?.[0] ?? ''];
        const maxVoteAllowedCount = state.max_votes_allowed;
        const ownVoteCount = Object.keys(state.ownVotesByOptionId).length;

        let changed = false;
        if (isClosed !== this.isClosed) {
          this.isClosed = isClosed ?? false;
          changed = true;
        }
        if (latestVotes !== this.latestVotes) {
          this.latestVotes = latestVotes ?? [];
          changed = true;
        }
        if (isWinner !== this.isWinner) {
          this.isWinner = isWinner ?? false;
          changed = true;
        }
        if (ownVote !== this.ownVote) {
          this.ownVote = ownVote ?? undefined;
          changed = true;
        }
        if (voteCount !== this.voteCount) {
          this.voteCount = voteCount ?? 0;
          changed = true;
        }
        if (votingVisibility !== this.votingVisibility) {
          this.votingVisibility = votingVisibility ?? undefined;
          changed = true;
        }
        if (winningOptionCount !== this.winningOptionCount) {
          this.winningOptionCount = winningOptionCount ?? 0;
          changed = true;
        }
        if (maxVoteAllowedCount !== this.maxVoteAllowedCount) {
          this.maxVoteAllowedCount = maxVoteAllowedCount ?? 0;
          changed = true;
        }
        if (ownVoteCount !== this.ownVoteCount) {
          this.ownVoteCount = ownVoteCount ?? 0;
          changed = true;
        }

        if (
          this.dismissNotificationFn &&
          this.maxVoteAllowedCount > 0 &&
          this.ownVoteCount <= this.maxVoteAllowedCount
        ) {
          this.dismissNotificationFn();
          changed = true;
        }

        if (changed) {
          markForCheck();
        }
      }
    );

    return unsubscribe;
  }
}
