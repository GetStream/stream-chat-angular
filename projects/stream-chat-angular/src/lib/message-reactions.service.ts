import { Injectable } from '@angular/core';
import { MessageReactionClickDetails, MessageReactionType } from './types';
import { BehaviorSubject } from 'rxjs';

/**
 * The `MessageReactionsService` provides customization options to message [reactions](https://getstream.io/chat/docs/javascript/send_reaction/?language=javascript).
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
  /**
   * By default the [`MessageReactionsComponent`](../../components/MessageReactionsComponent) will display the reacting users when a reaction is clicked. You can override this with your own UI by providing a custom event handler.
   *
   * The event handler can retrieve all reactions of a message inside the active channel using the [`channelService.getMessageReactions` method](../../services/ChannelService/#getmessagereactions)
   */
  customReactionClickHandler?: (details: MessageReactionClickDetails) => void;

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
