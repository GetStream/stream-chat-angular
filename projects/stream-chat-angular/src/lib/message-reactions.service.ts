import { Injectable } from '@angular/core';
import { MessageReactionClickDetails, MessageReactionType } from './types';
import { BehaviorSubject } from 'rxjs';
import { ChatClientService } from './chat-client.service';
import { NotificationService } from './notification.service';

/**
 * The `MessageReactionsService` provides customization options to message [reactions](/chat/docs/javascript/send_reaction/).
 *
 */
@Injectable({
  providedIn: 'root',
})
export class MessageReactionsService {
  /**
   * The enabled [reactions](/chat/docs/javascript/send_reaction/) and the associated emoji
   *
   * You can provide any string as a reaction. The emoji can be provided as a string, if you want to use custom images for reactions you have to provide a [custom reactions UI](/chat/docs/sdk/angular/v6-rc/services/CustomTemplatesService/#messagereactionstemplate/)
   */
  reactions$ = new BehaviorSubject<{ [key in MessageReactionType]: string }>({
    haha: '😂',
    like: '👍',
    love: '❤️',
    sad: '😞',
    wow: '😮',
  });
  /**
   * By default the [`MessageReactionsComponent`](/chat/docs/sdk/angular/v6-rc/components/MessageReactionsComponent/) will display the reacting users when a reaction is clicked. You can override this with your own UI by providing a custom event handler.
   *
   * The event handler can retrieve all reactions of a message using the [`messageReactionsService.queryReactions()`](/chat/docs/sdk/angular/v6-rc/services/MessageReactionsService/#queryreactions)
   */
  customReactionClickHandler?: (details: MessageReactionClickDetails) => void;

  constructor(
    private chatClientService: ChatClientService,
    private notificationService: NotificationService,
  ) {}

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

  /**
   * Query reactions of a specific message, more info in the [API documentation](/chat/docs/javascript/send_reaction/#query-reactions)
   * @param messageId
   * @param type
   * @param next
   * @returns the reactions and the cursor for the next/prev pages
   */
  async queryReactions(messageId: string, type: string, next?: string) {
    if (!this.chatClientService.chatClient) {
      throw new Error(
        'Intialize the ChatClientService before querying reactions',
      );
    } else {
      try {
        const response = await this.chatClientService.chatClient.queryReactions(
          messageId,
          { type },
          { created_at: -1 },
          { next },
        );

        return response;
      } catch (error) {
        this.notificationService.addTemporaryNotification(
          'streamChat.Error loading reactions',
        );
        throw error;
      }
    }
  }
}
