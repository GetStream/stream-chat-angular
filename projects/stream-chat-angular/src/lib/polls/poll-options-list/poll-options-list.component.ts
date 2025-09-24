import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BasePollComponent } from '../base-poll.component';
import { Poll, PollOption } from 'stream-chat';

/**
 *
 */
@Component({
  selector: 'stream-poll-options-list',
  templateUrl: './poll-options-list.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollOptionsListComponent extends BasePollComponent {
  /**
   * How many options should be displayed. If there are more options than this number, use the poll actions to display all options
   */
  @Input() maxOptionsDisplayed: number | undefined = 10;
  options: PollOption[] = [];

  protected stateStoreSelector(
    poll: Poll,
    markForCheck: () => void
  ): () => void {
    const unsubscribe = poll.state.subscribeWithSelector(
      (state) => ({
        options: state.options,
      }),
      (state) => {
        this.options = state.options;
        markForCheck();
      }
    );

    return unsubscribe;
  }

  trackByOptionId(_: number, option: PollOption) {
    return option.id;
  }
}
