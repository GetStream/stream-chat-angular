import { Component, Input } from '@angular/core';
import { Icon } from 'stream-chat-angular';

@Component({
  selector: 'app-icon',
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.scss'],
})
export class IconComponent {
  @Input() icon: Icon | undefined;

  constructor() {}

  mapToMaterialIcon() {
    // If an Icon is added/deleted in stream-chat-angular we'll get a type error, this ensures the mapping is always up-to-date
    const map: { [key in Icon]: string } = {
      action: 'more_horiz',
      'arrow-left': 'keyboard_arrow_left',
      'arrow-right': 'keyboard_arrow_right',
      close: 'close',
      delivered: 'check',
      reaction: 'face',
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
      'audio-file': '',
      play: '',
      pause: '',
      read: '',
    };

    return map[this.icon!];
  }
}
