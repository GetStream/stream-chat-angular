import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The `LoadingIndicator` component displays a spinner to indicate that an action is in progress.
 */
@Component({
  selector: 'stream-loading-indicator',
  templateUrl: './loading-indicator.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingIndicatorComponent {
  constructor() {}
}
