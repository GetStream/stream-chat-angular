import { Component, Input } from '@angular/core';

export type Icon =
  | 'action'
  | 'delivered'
  | 'read'
  | 'reaction'
  | 'send'
  | 'retry'
  | 'close'
  | 'audio-file'
  | 'reply-in-thread'
  | 'arrow-left'
  | 'arrow-up'
  | 'arrow-down'
  | 'arrow-right'
  | 'chat-bubble'
  | 'attach'
  | 'unspecified-filetype'
  | 'download'
  | 'error'
  | 'play'
  | 'pause';

/**
 * The `Icon` component can be used to display different icons (i. e. message delivered icon).
 */
@Component({
  selector: 'stream-icon',
  templateUrl: './icon.component.html',
  styles: [],
})
export class IconComponent {
  /**
   * The icon to display, the list of [supported icons](https://github.com/GetStream/stream-chat-angular/tree/master/projects/stream-chat-angular/src/lib/icon/icon.component.ts) can be found on GitHub.
   */
  @Input() icon: Icon | undefined;
  constructor() {}
}
