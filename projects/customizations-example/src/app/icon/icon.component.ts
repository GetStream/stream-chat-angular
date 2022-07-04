import { Component, Input } from '@angular/core';
import { Icon } from 'stream-chat-angular';

@Component({
  selector: 'app-icon',
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.scss'],
})
export class IconComponent {
  @Input() icon: Icon | undefined;
  @Input() size: number | undefined;
  defaultSize = 18;

  constructor() {}

  mapToMaterialIcon() {
    const map: { [key in Icon]: string } = {
      'action-icon': 'more_horiz',
      'arrow-left': 'keyboard_arrow_left',
      'arrow-right': 'keyboard_arrow_right',
      close: 'close',
      'close-no-outline': 'close',
      'connection-error': 'error',
      'delivered-icon': 'check',
      file: 'folder',
      'file-upload': 'file_upload',
      menu: 'menu',
      'reaction-icon': 'face',
      reply: 'swap_horiz',
      'reply-in-thread': 'reply',
      retry: 'replay',
      send: 'send',
      attach: 'upload_file',
      'unspecified-filetype': 'draft',
      download: 'download_for_offline',
      error: 'error',
      'arrow-up': 'keyboard_arrow_up',
      'arrow-down': 'keyboard_arrow_down',
      'chat-bubble': 'chat',
    };

    return map[this.icon!];
  }
}
