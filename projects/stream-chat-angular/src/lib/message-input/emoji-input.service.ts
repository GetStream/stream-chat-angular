import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * If you have an emoji picker in your application, you can propagate the selected emoji to the textarea using this service, more info can be found in [custom emoji picker guide](../code-examples/emoji-picker.mdx)
 */
@Injectable({
  providedIn: 'root',
})
export class EmojiInputService {
  /**
   * If you have an emoji picker in your application, you can propagate the selected emoji to the textarea using this Subject, more info can be found in [custom emoji picker guide](../code-examples/emoji-picker.mdx)
   */
  emojiInput$ = new Subject<string>();

  constructor() {}
}
