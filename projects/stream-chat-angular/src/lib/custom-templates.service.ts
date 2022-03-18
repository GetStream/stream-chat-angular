import { Injectable, TemplateRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  ChannelActionsContext,
  ChannelPreviewContext,
  CommandAutocompleteListItemContext,
  EmojiPickerContext,
  MentionAutcompleteListItemContext,
  MentionTemplateContext,
  MessageContext,
  MessageInputContext,
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

  constructor() {}
}
