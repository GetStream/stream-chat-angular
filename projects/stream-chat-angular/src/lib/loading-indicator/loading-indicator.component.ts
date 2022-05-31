import { Component, Input } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';

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
  @Input()
  color = `var(--str-chat__loading-indicator-color, var(--str-chat__primary-color, '#006CFF'))`;

  linearGradientId = uuidv4();

  constructor() {}
}
