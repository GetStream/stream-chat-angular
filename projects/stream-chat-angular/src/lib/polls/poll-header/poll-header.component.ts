import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Poll, PollState } from 'stream-chat';
import { BasePollComponent } from '../base-poll.component';

type SelectionInstructions = {
  text: string;
  count: number | undefined;
};

/**
 *
 */
@Component({
  selector: 'stream-poll-header',
  templateUrl: './poll-header.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollHeaderComponent extends BasePollComponent {
  name = '';
  selectionInstructions: SelectionInstructions = {
    text: '',
    count: undefined,
  };

  protected stateStoreSelector(
    poll: Poll,
    markForCheck: () => void
  ): () => void {
    const unsubscribe = poll.state.subscribeWithSelector(
      (state) => ({
        name: state.name,
        is_closed: state.is_closed,
        enforce_unique_vote: state.enforce_unique_vote,
        max_votes_allowed: state.max_votes_allowed,
        options: state.options,
      }),
      (state) => {
        const name = state.name;
        const selectionInstructions = this.getSelectionInstructions(state);

        let changed = false;
        if (name !== this.name) {
          this.name = name;
          changed = true;
        }
        if (
          selectionInstructions.text !== this.selectionInstructions.text ||
          selectionInstructions.count !== this.selectionInstructions.count
        ) {
          this.selectionInstructions = selectionInstructions;
          changed = true;
        }

        if (changed) {
          markForCheck();
        }
      }
    );

    return unsubscribe;
  }

  getSelectionInstructions(
    state: Pick<
      PollState,
      'is_closed' | 'enforce_unique_vote' | 'max_votes_allowed' | 'options'
    >
  ): SelectionInstructions {
    if (state.is_closed)
      return {
        text: 'streamChat.Vote ended',
        count: undefined,
      };
    if (state.enforce_unique_vote || state.options.length === 1) {
      return {
        text: 'streamChat.Select one',
        count: undefined,
      };
    }
    if (state.max_votes_allowed)
      return {
        text: 'streamChat.Select up to {{count}}',
        count:
          state.max_votes_allowed > state.options.length
            ? state.options.length
            : state.max_votes_allowed,
      };
    if (state.options.length > 1) {
      return {
        text: 'streamChat.Select one or more',
        count: undefined,
      };
    }
    return {
      text: '',
      count: undefined,
    };
  }
}
