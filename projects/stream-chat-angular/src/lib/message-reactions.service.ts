import { Injectable } from '@angular/core';
import { MessageReactionType } from './types';
import { BehaviorSubject } from 'rxjs';

/**
 * The `MessageReactionsService` allows you to set which [reactions](https://getstream.io/chat/docs/javascript/send_reaction/?language=javascript) are enabled and their associated emoji.
 *
 */
@Injectable({
  providedIn: 'root',
})
export class MessageReactionsService {
  /**
   * The enabled [reactions](https://getstream.io/chat/docs/javascript/send_reaction/?language=javascript) and the associated emoji
   *
   * You can provide any string as a reaction. The emoji can be provided as a string, if you want to use custom images for reactions you have to provide a [custom reactions UI](../../services/CustomTemplatesService/#messagereactionstemplate)
   */
  reactions$ = new BehaviorSubject<{ [key in MessageReactionType]: string }>({
    like: '👍',
    angry: '😠',
    love: '❤️',
    haha: '😂',
    wow: '😮',
    sad: '😞',
  });

  constructor() {}

  /**
   * Sets the enabled reactions
   */
  set reactions(reactions: { [key in MessageReactionType]: string }) {
    this.reactions$.next(reactions);
  }

  /**
   * Get the currently enabled reactions
   */
  get reactions() {
    return this.reactions$.getValue();
  }
}
