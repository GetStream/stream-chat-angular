import { Component, Input } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-emoji-picker',
  templateUrl: './emoji-picker.component.html',
  styleUrls: ['./emoji-picker.component.scss'],
})
export class EmojiPickerComponent {
  isOpened = false;
  @Input() emojiInput$: Subject<string> | undefined;

  constructor() {}

  emojiSelected(event: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.emojiInput$?.next(event.emoji.native);
  }
}
