import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BasePollComponent } from '../base-poll.component';
import { Poll } from 'stream-chat';

/**
 *
 */
@Component({
  selector: 'stream-poll',
  templateUrl: './poll.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollComponent extends BasePollComponent {
  isClosed = false;

  protected stateStoreSelector(
    poll: Poll,
    markForCheck: () => void
  ): () => void {
    const unsubscribe = poll.state.subscribeWithSelector(
      (state) => {
        return {
          is_closed: state.is_closed,
        };
      },
      (state) => {
        this.isClosed = state.is_closed ?? false;
        markForCheck();
      }
    );

    return unsubscribe;
  }
}
