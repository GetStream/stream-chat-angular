import { Component, Input } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ThemeService } from 'stream-chat-angular';

@Component({
  selector: 'app-emoji-picker',
  templateUrl: './emoji-picker.component.html',
  styleUrls: ['./emoji-picker.component.scss'],
})
export class EmojiPickerComponent {
  isOpened = false;
  theme$: Observable<string>;
  @Input() emojiInput$: Subject<string> | undefined;

  constructor(themeService: ThemeService) {
    this.theme$ = themeService.theme$;
  }

  emojiSelected(event: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.emojiInput$?.next(event.emoji.native);
  }
}
