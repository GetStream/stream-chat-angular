import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  CustomMessageActionItem,
  DefaultStreamChatGenerics,
  MessageActionItem,
  MessageActionsClickDetails,
  StreamMessage,
} from './types';
import { ChatClientService } from './chat-client.service';
import { NotificationService } from './notification.service';
import { ChannelService } from './channel.service';

/**
 * The message actions service provides customization options for the [message actions](../../components/MessageActionsBoxComponent)
 */
@Injectable({
  providedIn: 'root',
})
export class MessageActionsService<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> {
  /**
   * Default actions - these are the actions that are handled by the built-in component
   */
  readonly defaultActions: MessageActionItem<T>[] = [
    {
      actionName: 'mark-unread',
      actionLabelOrTranslationKey: 'streamChat.Mark as unread',
      actionHandler: (message: StreamMessage<T>) =>
        this.channelService.markMessageUnread(message.id),
      isVisible: (
        enabledActions: string[],
        isMine: boolean,
        message: StreamMessage<T>
      ) => enabledActions.indexOf('read-events') !== -1 && !message.parent_id,
    },
    {
      actionName: 'quote',
      actionLabelOrTranslationKey: 'streamChat.Reply',
      actionHandler: (message: StreamMessage<T>) =>
        this.channelService.selectMessageToQuote(message),
      isVisible: (enabledActions: string[]) =>
        enabledActions.indexOf('quote-message') !== -1,
    },
    {
      actionName: 'pin',
      actionLabelOrTranslationKey: (message: StreamMessage<T>) =>
        message.pinned ? 'streamChat.Unpin' : 'streamChat.Pin',
      actionHandler: (message: StreamMessage<T>) =>
        message.pinned
          ? this.channelService.unpinMessage(message)
          : this.channelService.pinMessage(message),
      isVisible: (enabledActions: string[]) =>
        enabledActions.indexOf('pin-message') !== -1,
    },
    {
      actionName: 'flag',
      actionLabelOrTranslationKey: 'streamChat.Flag',
      actionHandler: async (message: StreamMessage<T>) => {
        try {
          await this.chatClientService.flagMessage(message.id);
          this.notificationService.addTemporaryNotification(
            'streamChat.Message has been successfully flagged',
            'success'
          );
        } catch (err) {
          this.notificationService.addTemporaryNotification(
            'streamChat.Error adding flag'
          );
        }
      },
      isVisible: (enabledActions: string[], isMine: boolean) =>
        enabledActions.indexOf('flag-message') !== -1 && !isMine,
    },
    {
      actionName: 'edit',
      actionLabelOrTranslationKey: 'streamChat.Edit Message',
      actionHandler: (message: StreamMessage<T>) => {
        this.messageToEdit$.next(message);
      },
      isVisible: (enabledActions: string[], isMine: boolean) =>
        (enabledActions.indexOf('update-own-message') !== -1 && isMine) ||
        enabledActions.indexOf('update-any-message') !== -1,
    },
    {
      actionName: 'delete',
      actionLabelOrTranslationKey: 'streamChat.Delete',
      actionHandler: async (message: StreamMessage<T>) => {
        try {
          await this.channelService.deleteMessage(message);
        } catch (error) {
          this.notificationService.addTemporaryNotification(
            'streamChat.Error deleting message'
          );
        }
      },
      isVisible: (enabledActions: string[], isMine: boolean) =>
        ((enabledActions.indexOf('delete') !== -1 ||
          enabledActions.indexOf('delete-own-message') !== -1) &&
          isMine) ||
        enabledActions.indexOf('delete-any') !== -1 ||
        enabledActions.indexOf('delete-any-message') !== -1,
    },
  ];
  /**
   * The built-in components will handle changes to this observable.
   */
  messageToEdit$ = new BehaviorSubject<StreamMessage<T> | undefined>(undefined);
  /**
   * You can pass your own custom actions that will be displayed inside the built-in message actions component
   */
  customActions$ = new BehaviorSubject<CustomMessageActionItem[]>([]);
  /**
   * By default the [`MessageComponent`](../../components/MessageComponent) will display the [`MessageActionsBoxComponent`](../../components/MessageActionsBoxComponent). You can override that behavior by providing your own event handler.
   */
  customActionClickHandler?: (details: MessageActionsClickDetails<T>) => void;

  constructor(
    private chatClientService: ChatClientService,
    private notificationService: NotificationService,
    private channelService: ChannelService
  ) {}

  /**
   * This method returns how many authorized actions are available to the given message
   *
   * @param message
   * @param enabledActions
   * @returns the count
   */
  getAuthorizedMessageActionsCount(
    message: StreamMessage<T>,
    enabledActions: string[]
  ) {
    const customActions = this.customActions$.getValue() || [];
    const allActions = [...this.defaultActions, ...customActions];
    const currentUserId = this.chatClientService.chatClient.user?.id;
    const isMine = message.user_id === currentUserId;

    return allActions.filter((item) =>
      item.isVisible(enabledActions, isMine, message)
    ).length;
  }
}
