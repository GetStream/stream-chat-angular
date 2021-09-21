import { Component, Input } from '@angular/core';

@Component({
  selector: 'stream-loading-indicator',
  templateUrl: './loading-indicator.component.html',
  styles: [],
})
export class LoadingIndicatorComponent {
  @Input() size = 15;
  @Input() color = '#006CFF';

  constructor() {}
}
