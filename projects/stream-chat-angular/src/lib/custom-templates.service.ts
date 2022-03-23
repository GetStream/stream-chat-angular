import { Injectable, TemplateRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  AttachmentListContext,
  AttachmentPreviewListContext,
  AvatarContext,
  ChannelActionsContext,
  ChannelPreviewContext,
  CommandAutocompleteListItemContext,
  EmojiPickerContext,
  IconContext,
  LoadingIndicatorContext,
  MentionAutcompleteListItemContext,
  MentionTemplateContext,
  MessageActionBoxItemContext,
  MessageActionsBoxContext,
  MessageContext,
  MessageInputContext,
  MessageReactionsContext,
  ModalContext,
  NotificationContext,
  ThreadHeaderContext,
  TypingIndicatorContext,
} from './types';

/**
 * A central location for registering your custom templates to override parts of the chat application
 */
@Injectable({
  providedIn: 'root',
})
export class CustomTemplatesService {
  /**
   * The autocomplete list item template for mentioning users
   */
  mentionAutocompleteItemTemplate$ = new BehaviorSubject<
    TemplateRef<MentionAutcompleteListItemContext> | undefined
  >(undefined);
  /**
   * The autocomplete list item template for commands
   */
  commandAutocompleteItemTemplate$ = new BehaviorSubject<
    TemplateRef<CommandAutocompleteListItemContext> | undefined
  >(undefined);
  /**
   * Item in the channel list
   */
  channelPreviewTemplate$ = new BehaviorSubject<
    TemplateRef<ChannelPreviewContext> | undefined
  >(undefined);
  /**
   * The message input template used when editing a message
   */
  messageInputTemplate$ = new BehaviorSubject<
    TemplateRef<MessageInputContext> | undefined
  >(undefined);
  /**
   * The template used for displaying a mention inside a message
   */
  mentionTemplate$ = new BehaviorSubject<
    TemplateRef<MentionTemplateContext> | undefined
  >(undefined);
  /**
   * The template for emoji picker
   */
  emojiPickerTemplate$ = new BehaviorSubject<
    TemplateRef<EmojiPickerContext> | undefined
  >(undefined);
  /**
   * The typing indicator template used in the message list
   */
  typingIndicatorTemplate$ = new BehaviorSubject<
    TemplateRef<TypingIndicatorContext> | undefined
  >(undefined);
  /**
   * The template used to display a message in the message list
   */
  messageTemplate$ = new BehaviorSubject<
    TemplateRef<MessageContext> | undefined
  >(undefined);
  /**
   * The template for channel actions
   */
  channelActionsTemplate$ = new BehaviorSubject<
    TemplateRef<ChannelActionsContext> | undefined
  >(undefined);
  /**
   * The template used to display attachments of a message
   */
  attachmentListTemplate$ = new BehaviorSubject<
    TemplateRef<AttachmentListContext> | undefined
  >(undefined);
  /**
   * The template used to display attachments in the message input component
   */
  attachmentPreviewListTemplate$ = new BehaviorSubject<
    TemplateRef<AttachmentPreviewListContext> | undefined
  >(undefined);
  /**
   * The template used to display avatars for channels and users
   */
  avatarTemplate$ = new BehaviorSubject<TemplateRef<AvatarContext> | undefined>(
    undefined
  );
  /**
   * Template for displaying icons
   */
  iconTemplate$ = new BehaviorSubject<TemplateRef<IconContext> | undefined>(
    undefined
  );
  /**
   * Template for displaying the loading indicator (instead of the [default loading indicator](../components/LoadingIndicatorComponent.mdx))
   */
  loadingIndicatorTemplate$ = new BehaviorSubject<
    TemplateRef<LoadingIndicatorContext> | undefined
  >(undefined);
  /**
   * Template for displaying the message actions box (instead of the [default message actions box](../components/MessageActionsBoxComponent.mdx))
   */
  messageActionsBoxTemplate$ = new BehaviorSubject<
    TemplateRef<MessageActionsBoxContext> | undefined
  >(undefined);
  /**
   * The template used for displaying an item in the [message actions box](../components/MessageActionsBoxComponent.mdx)]
   */
  messageActionsBoxItemTemplate$ = new BehaviorSubject<
    TemplateRef<MessageActionBoxItemContext> | undefined
  >(undefined);
  /**
   * The template used to display the reactions of a message, and the selector to add a reaction to a message (instead of the [default message reactions component](../components/MessageReactionsComponent.mdx))
   */
  messageReactionsTemplate$ = new BehaviorSubject<
    TemplateRef<MessageReactionsContext> | undefined
  >(undefined);
  /**
   * The template used to display a modal window (instead of the [default modal](../components/ModalComponent.mdx))
   */
  modalTemplate$ = new BehaviorSubject<TemplateRef<ModalContext> | undefined>(
    undefined
  );
  /**
   * The template used to override the [default notification component](../components/NotificationComponent.mdx)
   */
  notificationTemplate$ = new BehaviorSubject<
    TemplateRef<NotificationContext> | undefined
  >(undefined);
  /**
   * The template used for header of thread
   */
  threadHeaderTemplate$ = new BehaviorSubject<
    TemplateRef<ThreadHeaderContext> | undefined
  >(undefined);

  constructor() {}
}
