import { Component, Input } from '@angular/core';

export type Icon =
  | 'action-icon'
  | 'delivered-icon'
  | 'reaction-icon'
  | 'connection-error'
  | 'send'
  | 'file-upload'
  | 'retry'
  | 'close'
  | 'file';

@Component({
  selector: 'stream-icon',
  templateUrl: './icon.component.html',
  styles: [],
})
export class IconComponent {
  @Input() icon: Icon | undefined;
  @Input() size: number | undefined;
  constructor() {}
}
