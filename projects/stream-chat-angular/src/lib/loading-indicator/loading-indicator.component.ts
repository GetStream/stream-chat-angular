import { Component, Input } from '@angular/core';

/**
 * The `LoadingIndicator` component displays a spinner to indicate that an action is in progress.
 */
@Component({
  selector: 'stream-loading-indicator',
  templateUrl: './loading-indicator.component.html',
  styles: [],
})
export class LoadingIndicatorComponent {
  /**
   * The size of the indicator (in pixels)
   */
  @Input() size = 15;
  /**
   * The color of the indicator
   */
  @Input() color = '#006CFF';

  constructor() {}
}
