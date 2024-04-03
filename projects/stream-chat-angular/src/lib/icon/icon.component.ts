import { Component, Input } from '@angular/core';

export type Icon =
  | 'action-icon'
  | 'delivered-icon'
  | 'read-icon'
  | 'reaction-icon'
  | 'connection-error'
  | 'send'
  | 'file-upload'
  | 'retry'
  | 'close'
  | 'file'
  | 'audio-file'
  | 'reply'
  | 'close-no-outline'
  | 'reply-in-thread'
  | 'arrow-left'
  | 'arrow-right'
  | 'menu'
  | 'arrow-up'
  | 'arrow-down'
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
  /**
   * The size of the icon (in pixels)
   */
  @Input() size: number | undefined;
  constructor() {}
}
