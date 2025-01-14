import { Injectable, TemplateRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  AttachmentContext,
  AttachmentListContext,
  AttachmentPreviewListContext,
  AvatarContext,
  ChannelActionsContext,
  ChannelHeaderInfoContext,
  ChannelPreviewContext,
  ChannelPreviewInfoContext,
  CommandAutocompleteListItemContext,
  CustomAttachmentListContext,
  CustomAttachmentPreviewListContext,
  CustomAttachmentUploadContext,
  CustomMetadataContext,
  DateSeparatorContext,
  DefaultStreamChatGenerics,
  DeliveredStatusContext,
  EmojiPickerContext,
  IconContext,
  MentionAutcompleteListItemContext,
  MentionTemplateContext,
  MessageActionBoxItemContext,
  MessageActionsBoxContext,
  MessageContext,
  MessageReactionsContext,
  MessageReactionsSelectorContext,
  MessageTextContext,
  ModalContext,
  NotificationContext,
  ReadStatusContext,
  SendingStatusContext,
  SystemMessageContext,
  ThreadHeaderContext,
  ThreadReplyButtonContext,
  TypingIndicatorContext,
  UnreadMessagesIndicatorContext,
  UnreadMessagesNotificationContext,
} from './types';

/**
 * A central location for registering your custom templates to override parts of the chat application.
 *
 * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
 *
 * You can find the type definitions of the context that is provided for each template [on GitHub](https://github.com/GetStream/stream-chat-angular/blob/master/projects/stream-chat-angu)
 */
@Injectable({
  providedIn: 'root',
})
export class CustomTemplatesService<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> {
  /**
   * The autocomplete list item template for mentioning users (used in the [`AutocompleteTextareaComponent`](/chat/docs/sdk/angular/components/AutocompleteTextareaComponent/))
   */
  mentionAutocompleteItemTemplate$ = new BehaviorSubject<
    TemplateRef<MentionAutcompleteListItemContext> | undefined
  >(undefined);
  /**
   * The autocomplete list item template for commands (used in the [`AutocompleteTextareaComponent`](/chat/docs/sdk/angular/components/AutocompleteTextareaComponent/))
   */
  commandAutocompleteItemTemplate$ = new BehaviorSubject<
    TemplateRef<CommandAutocompleteListItemContext> | undefined
  >(undefined);
  /**
   * Template used to display an item in the [channel list](/chat/docs/sdk/angular/components/ChannelListComponent/) (instead of the default [channal list item](/chat/docs/sdk/angular/components/ChannelPreviewComponent/))
   *
   */
  channelPreviewTemplate$ = new BehaviorSubject<
    TemplateRef<ChannelPreviewContext> | undefined
  >(undefined);
  /**
   * The template used for displaying a [mention inside a message](/chat/docs/sdk/angular/code-examples/mention-actions/)
   *
   */
  mentionTemplate$ = new BehaviorSubject<
    TemplateRef<MentionTemplateContext> | undefined
  >(undefined);
  /**
   * The template for [emoji picker](/chat/docs/sdk/angular/code-examples/emoji-picker)
   *
   */
  emojiPickerTemplate$ = new BehaviorSubject<
    TemplateRef<EmojiPickerContext> | undefined
  >(undefined);
  /**
   * The typing indicator template used in the [message list](/chat/docs/sdk/angular/components/MessageListComponent/)
   *
   */
  typingIndicatorTemplate$ = new BehaviorSubject<
    TemplateRef<TypingIndicatorContext> | undefined
  >(undefined);
  /**
   * The template used to display a message in the [message list](/chat/docs/sdk/angular/components/MessageListComponent/) (instead of the [default message component](/chat/docs/sdk/angular/components/MessageComponent/))
   *
   */
  messageTemplate$ = new BehaviorSubject<
    TemplateRef<MessageContext> | undefined
  >(undefined);
  /**
   * The template for channel actions displayed in the [channel header](/chat/docs/sdk/angular/components/ChannelHeaderComponent/) (by default no channel action is displayed)
   *
   */
  channelActionsTemplate$ = new BehaviorSubject<
    TemplateRef<ChannelActionsContext> | undefined
  >(undefined);
  /**
   * The template used to display attachments of a [message](/chat/docs/sdk/angular/components/MessageComponent/) (instead of the [default attachment list](/chat/docs/sdk/angular/components/AttachmentListComponent/))
   *
   */
  attachmentListTemplate$ = new BehaviorSubject<
    TemplateRef<AttachmentListContext> | undefined
  >(undefined);
  /**
   * The template used to display attachments in the [message input](/chat/docs/sdk/angular/components/MessageInputComponent) component (instead of the [default attachment preview](/chat/docs/sdk/angular/components/AttachmentPreviewListComponent))
   *
   */
  attachmentPreviewListTemplate$ = new BehaviorSubject<
    TemplateRef<AttachmentPreviewListContext> | undefined
  >(undefined);
  /**
   * The template used to display avatars for channels and users (instead of the [default avatar](/chat/docs/sdk/angular/components/AvatarComponent/))
   *
   */
  avatarTemplate$ = new BehaviorSubject<TemplateRef<AvatarContext> | undefined>(
    undefined
  );
  /**
   * Template for displaying icons (instead of the [default icon component](/chat/docs/sdk/angular/components/IconComponent/))
   *
   */
  iconTemplate$ = new BehaviorSubject<TemplateRef<IconContext> | undefined>(
    undefined
  );
  /**
   * Template for displaying the loading indicator (instead of the [default loading indicator](/chat/docs/sdk/angular/components/LoadingIndicatorComponent/))
   *
   */
  loadingIndicatorTemplate$ = new BehaviorSubject<
    TemplateRef<void> | undefined
  >(undefined);
  /**
   * Template for displaying the message actions box (instead of the [default message actions box](/chat/docs/sdk/angular/components/MessageActionsBoxComponent/))
   *
   */
  messageActionsBoxTemplate$ = new BehaviorSubject<
    TemplateRef<MessageActionsBoxContext> | undefined
  >(undefined);
  /**
   * The template used for displaying an item in the [message actions box](/chat/docs/sdk/angular/components/MessageActionsBoxComponent/)
   *
   */
  messageActionsBoxItemTemplate$ = new BehaviorSubject<
    TemplateRef<MessageActionBoxItemContext> | undefined
  >(undefined);
  /**
   * The template used to display the reactions of a [message](/chat/docs/sdk/angular/components/MessageComponent/), and the selector to add a reaction to a message (instead of the [default message reactions component](/chat/docs/sdk/angular/components/MessageReactionsComponent/))
   *
   */
  messageReactionsTemplate$ = new BehaviorSubject<
    TemplateRef<MessageReactionsContext> | undefined
  >(undefined);
  /**
   * The template used to display the reactions of a [message](/chat/docs/sdk/angular/components/MessageComponent/), and the selector to add a reaction to a message (instead of the [default message reactions component](/chat/docs/sdk/angular/components/MessageReactionsComponent/))
   *
   */
  messageReactionsSelectorTemplate$ = new BehaviorSubject<
    TemplateRef<MessageReactionsSelectorContext> | undefined
  >(undefined);
  /**
   * The template used to display a modal window (instead of the [default modal](/chat/docs/sdk/angular/components/ModalComponent/))
   *
   */
  modalTemplate$ = new BehaviorSubject<TemplateRef<ModalContext> | undefined>(
    undefined
  );
  /**
   * The template used to override the [default notification component](/chat/docs/sdk/angular/components/NotificationComponent/)
   *
   */
  notificationTemplate$ = new BehaviorSubject<
    TemplateRef<NotificationContext> | undefined
  >(undefined);
  /**
   * The template used for header of a [thread](/chat/docs/sdk/angular/components/ThreadComponent/)
   *
   */
  threadHeaderTemplate$ = new BehaviorSubject<
    TemplateRef<ThreadHeaderContext> | undefined
  >(undefined);
  /**
   * The template used for displaying the delivered state of the message inside the [message component](/chat/docs/sdk/angular/components/MessageComponent/)
   *
   * Displayed for the last message sent by the current user, if the message isn't yet read by anyone
   *
   */
  deliveredStatusTemplate$ = new BehaviorSubject<
    TemplateRef<DeliveredStatusContext> | undefined
  >(undefined);
  /**
   * The template used for displaying the sending state of the message inside the [message component](/chat/docs/sdk/angular/components/MessageComponent/)
   *
   * Displayed for the last message sent by the current user, if the message is currently being sent
   *
   */
  sendingStatusTemplate$ = new BehaviorSubject<
    TemplateRef<SendingStatusContext> | undefined
  >(undefined);
  /**
   * The template used for displaying the sent state of the message inside the [message component](/chat/docs/sdk/angular/components/MessageComponent/)
   *
   * Displayed for the last message sent by the current user, if the message is read at least by one user
   *
   */
  readStatusTemplate$ = new BehaviorSubject<
    TemplateRef<ReadStatusContext> | undefined
  >(undefined);
  /**
   * Template to display custom metadata inside [message component](/chat/docs/sdk/angular/components/MessageComponent/)
   *
   */
  customMessageMetadataTemplate$ = new BehaviorSubject<
    TemplateRef<CustomMetadataContext<T>> | undefined
  >(undefined);
  /**
   * The template used to display additional information about a channel under the channel name inside the [channel header component](/chat/docs/sdk/angular/components/ChannelHeaderComponent/)
   *
   */
  channelHeaderInfoTemplate$ = new BehaviorSubject<
    TemplateRef<ChannelHeaderInfoContext> | undefined
  >(undefined);
  /**
   * The template used for displaying file upload/attachment selector inside the [message input](/chat/docs/sdk/angular/components/MessageInputComponent/)
   *
   */
  customAttachmentUploadTemplate$ = new BehaviorSubject<
    TemplateRef<CustomAttachmentUploadContext> | undefined
  >(undefined);
  /**
   * The template that can be used to override how a single image attachment is displayed inside the [attachment list](/chat/docs/sdk/angular/components/AttachmentListComponent/)
   */
  imageAttachmentTemplate$ = new BehaviorSubject<
    TemplateRef<AttachmentContext> | undefined
  >(undefined);
  /**
   * The template that can be used to override how a voice recording attachment is displayed inside the [attachment list](/chat/docs/sdk/angular/components/AttachmentListComponent/), by default the [voice recording component](/chat/docs/sdk/angular/components/VoiceRecordingComponent/) is used
   */
  voiceRecordingAttachmentTemplate$ = new BehaviorSubject<
    TemplateRef<AttachmentContext> | undefined
  >(undefined);
  /**
   * The template that can be used to override how a video attachment is displayed inside the [attachment list](/chat/docs/sdk/angular/components/AttachmentListComponent/)
   */
  videoAttachmentTemplate$ = new BehaviorSubject<
    TemplateRef<AttachmentContext> | undefined
  >(undefined);
  /**
   * The template that can be used to override how image gallery is displayed inside the [attachment list](/chat/docs/sdk/angular/components/AttachmentListComponent/)
   */
  galleryAttachmentTemplate$ = new BehaviorSubject<
    TemplateRef<AttachmentContext> | undefined
  >(undefined);
  /**
   * The template that can be used to override how a file attachment is displayed inside the [attachment list](/chat/docs/sdk/angular/components/AttachmentListComponent/)
   */
  fileAttachmentTemplate$ = new BehaviorSubject<
    TemplateRef<AttachmentContext> | undefined
  >(undefined);
  /**
   * The template that can be used to override how a card attachment is displayed inside the [attachment list](/chat/docs/sdk/angular/components/AttachmentListComponent/)
   */
  cardAttachmentTemplate$ = new BehaviorSubject<
    TemplateRef<AttachmentContext> | undefined
  >(undefined);
  /**
   * The template that can be used to override how attachment actions are displayed inside the [attachment list](/chat/docs/sdk/angular/components/AttachmentListComponent/)
   */
  attachmentActionsTemplate$ = new BehaviorSubject<
    TemplateRef<AttachmentContext> | undefined
  >(undefined);
  /**
   * The template used to display [system messages](/chat/docs/javascript/silent_messages/) indise the [message component](/chat/docs/sdk/angular/components/MessageComponent/)
   */
  systemMessageTemplate$ = new BehaviorSubject<
    TemplateRef<SystemMessageContext> | undefined
  >(undefined);
  /**
   * The template used to display the date separator inside the [message list](/chat/docs/sdk/angular/components/MessageListComponent/)
   */
  dateSeparatorTemplate$ = new BehaviorSubject<
    TemplateRef<DateSeparatorContext> | undefined
  >(undefined);
  /**
   * The template used to display unread messages indicator inside the [message list](/chat/docs/sdk/angular/components/MessageListComponent/) when the channel is opened
   *
   * This UI element is used to separate unread messages from read messages
   */
  newMessagesIndicatorTemplate$ = new BehaviorSubject<
    TemplateRef<UnreadMessagesIndicatorContext> | undefined
  >(undefined);
  /**
   * The template used to display unread messages notification inside the [message list](/chat/docs/sdk/angular/components/MessageListComponent/) when the channel is opened
   *
   * Users can use this notification to jump to the first unread message when it's clicked
   */
  newMessagesNotificationTemplate$ = new BehaviorSubject<
    TemplateRef<UnreadMessagesNotificationContext> | undefined
  >(undefined);
  /**
   * The template to show if the main message list is empty
   */
  emptyMainMessageListPlaceholder$ = new BehaviorSubject<
    TemplateRef<void> | undefined
  >(undefined);
  /**
   * The template to show if the thread message list is empty
   */
  emptyThreadMessageListPlaceholder$ = new BehaviorSubject<
    TemplateRef<void> | undefined
  >(undefined);
  /**
   * The template used to display the [message bounce prompt](/chat/docs/sdk/angular/components/MessageBouncePromptComponent/)
   */
  messageBouncePromptTemplate$ = new BehaviorSubject<
    TemplateRef<void> | undefined
  >(undefined);
  /**
   * Template used to display the channel information inside the [channel list item](/chat/docs/sdk/angular/components/ChannelPreviewComponent/)
   *
   */
  channelPreviewInfoTemplate$ = new BehaviorSubject<
    TemplateRef<ChannelPreviewInfoContext> | undefined
  >(undefined);
  /**
   * The template used to display custom attachment previews in the [message input component](/chat/docs/sdk/angular/components/MessageInputComponent/)
   */
  customAttachmentPreviewListTemplate$ = new BehaviorSubject<
    TemplateRef<CustomAttachmentPreviewListContext> | undefined
  >(undefined);
  /**
   * The template used to display custom attachments in the [message component](/chat/docs/sdk/angular/components/MessageComponent/)
   */
  customAttachmentListTemplate$ = new BehaviorSubject<
    TemplateRef<CustomAttachmentListContext> | undefined
  >(undefined);
  /**
   * The template used to display the number of thread replies inside the [message component](/chat/docs/sdk/angular/components/MessageComponent/)
   */
  threadLinkButton$ = new BehaviorSubject<
    TemplateRef<ThreadReplyButtonContext> | undefined
  >(undefined);
  /**
   * Template to display custom metadata inside the message bubble of the [message component](/chat/docs/sdk/angular/components/MessageComponent/)
   *
   * To properly position your template you should override the `grid-template-areas` of the `.str-chat__message-inner` selector
   */
  customMessageMetadataInsideBubbleTemplate$ = new BehaviorSubject<
    TemplateRef<CustomMetadataContext> | undefined
  >(undefined);
  /**
   * Template to display the text content inside the [message component](/chat/docs/sdk/angular/components/MessageComponent/). The default component is [stream-message-text](/chat/docs/sdk/angular/components/MessageTextComponent/)
   */
  messageTextTemplate$ = new BehaviorSubject<
    TemplateRef<MessageTextContext> | undefined
  >(undefined);

  constructor() {}
}
