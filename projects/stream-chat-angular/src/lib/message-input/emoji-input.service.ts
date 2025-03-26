import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * If you have an emoji picker in your application, you can propagate the selected emoji to the textarea using this service, more info can be found in [custom emoji picker guide](/chat/docs/sdk/angular/v7-rc/code-examples/emoji-picker/)
 */
@Injectable({
  providedIn: 'root',
})
export class EmojiInputService {
  /**
   * If you have an emoji picker in your application, you can propagate the selected emoji to the textarea using this Subject, more info can be found in [custom emoji picker guide](/chat/docs/sdk/angular/v7-rc/code-examples/emoji-picker/)
   */
  emojiInput$ = new Subject<string>();

  constructor() {}
}
