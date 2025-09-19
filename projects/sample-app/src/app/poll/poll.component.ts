import {
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { Poll, PollState } from 'stream-chat';
import { ChatClientService } from 'stream-chat-angular';

@Component({
  selector: 'app-poll',
  templateUrl: './poll.component.html',
  styleUrls: ['./poll.component.scss'],
})
export class PollComponent implements OnChanges, OnDestroy {
  @Input() pollId: string | undefined;
  poll: Poll | undefined;
  pollState: PollState | undefined;
  pollStateUnsubscribe?: () => void;

  constructor(
    private chatClientService: ChatClientService,
    private cdRef: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pollId']) {
      if (this.pollId) {
        this.poll = this.chatClientService.chatClient.polls.fromState(
          this.pollId
        );
        this.poll?.state.subscribe((state) => {
          this.pollState = state;
          this.cdRef.detectChanges();
        });
      } else {
        this.pollStateUnsubscribe?.();
        this.poll = undefined;
      }
    }
  }

  ngOnDestroy(): void {
    this.pollStateUnsubscribe?.();
  }

  // Helper methods for the template
  getTotalVotes(): number {
    if (!this.pollState?.options) return 0;
    return Object.values(this.pollState.vote_counts_by_option).reduce(
      (total, v) => total + v,
      0
    );
  }

  hasUserVotedForOption(optionId: string): boolean {
    if (!this.pollState?.ownVotesByOptionId) return false;
    return !!this.pollState.ownVotesByOptionId[optionId];
  }

  getVotePercentage(voteCount: number): number {
    const totalVotes = this.getTotalVotes();
    if (totalVotes === 0) return 0;
    return Math.round((voteCount / totalVotes) * 100);
  }

  trackByOptionId(_: number, option: any): string {
    return option.id;
  }
}
