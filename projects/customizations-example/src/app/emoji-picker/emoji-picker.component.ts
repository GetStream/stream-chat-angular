import { Component, ElementRef, Input, ViewChild } from '@angular/core';
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
  @ViewChild('container') container: ElementRef<HTMLElement> | undefined;

  constructor(themeService: ThemeService) {
    this.theme$ = themeService.theme$;
  }

  emojiSelected(event: { emoji: { native: string } }) {
    this.emojiInput$?.next(event.emoji.native);
  }

  eventHandler = (event: Event) => {
    // Watching for outside clicks
    if (!this.container?.nativeElement.contains(event.target as Node)) {
      this.isOpened = false;
      window.removeEventListener('click', this.eventHandler);
    }
  };

  toggled() {
    if (!this.container) {
      return;
    }
    this.isOpened = !this.isOpened;
    if (this.isOpened) {
      window.addEventListener('click', this.eventHandler);
    } else {
      window.removeEventListener('click', this.eventHandler);
    }
  }
}
