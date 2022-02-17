import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 *
 */
@Injectable({
  providedIn: 'root',
})
export class EmojiInputService {
  /**
   *
   */
  emojiInput$ = new Subject<string>();

  constructor() {}
}
