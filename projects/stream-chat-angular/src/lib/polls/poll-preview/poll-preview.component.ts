import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BasePollComponent } from '../base-poll.component';
import { Poll } from 'stream-chat';

/**
 *
 */
@Component({
  selector: 'stream-poll-preview',
  templateUrl: './poll-preview.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollPreviewComponent extends BasePollComponent {
  name = '';
  isClosed = false;

  protected stateStoreSelector(
    poll: Poll,
    markForCheck: () => void
  ): () => void {
    const unsubscribe = poll.state.subscribeWithSelector(
      (state) => ({
        name: state.name,
        is_closed: state.is_closed,
      }),
      (state) => {
        this.name = state.name;
        this.isClosed = state.is_closed ?? false;
        markForCheck();
      }
    );

    return unsubscribe;
  }
}
