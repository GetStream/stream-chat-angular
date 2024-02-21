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
  CommandAutocompleteListItemContext,
  CustomAttachmentUploadContext,
  CustomMetadataContext,
  DateSeparatorContext,
  DefaultStreamChatGenerics,
  DeliveredStatusContext,
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
  ReadStatusContext,
  SendingStatusContext,
  SystemMessageContext,
  ThreadHeaderContext,
  TypingIndicatorContext,
  UnreadMessagesIndicatorContext,
  UnreadMessagesNotificationContext,
} from './types';

/**
 * A central location for registering your custom templates to override parts of the chat application.
 *
 * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
 */
@Injectable({
  providedIn: 'root',
})
export class CustomTemplatesService<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> {
  /**
   * The autocomplete list item template for mentioning users (used in the [`AutocompleteTextareaComponent`](../components/AutocompleteTextareaComponent.mdx))
   */
  mentionAutocompleteItemTemplate$ = new BehaviorSubject<
    TemplateRef<MentionAutcompleteListItemContext> | undefined
  >(undefined);
  /**
   * The autocomplete list item template for commands (used in the [`AutocompleteTextareaComponent`](../components/AutocompleteTextareaComponent.mdx))
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  commandAutocompleteItemTemplate$ = new BehaviorSubject<
    TemplateRef<CommandAutocompleteListItemContext> | undefined
  >(undefined);
  /**
   * Template used to display an item in the [channel list](../components/ChannelListComponent.mdx) (instead of the default [channal list item](../components/ChannelPreviewComponent.mdx))
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  channelPreviewTemplate$ = new BehaviorSubject<
    TemplateRef<ChannelPreviewContext> | undefined
  >(undefined);
  /**
   * The message input template used when editing a message (instead of the [default message input](../components/MessageInputComponent.mdx))
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  messageInputTemplate$ = new BehaviorSubject<
    TemplateRef<MessageInputContext> | undefined
  >(undefined);
  /**
   * The template used for displaying a [mention inside a message](../code-examples/mention-actions.mdx)
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  mentionTemplate$ = new BehaviorSubject<
    TemplateRef<MentionTemplateContext> | undefined
  >(undefined);
  /**
   * The template for [emoji picker](../code-examples/emoji-picker.mdx)
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  emojiPickerTemplate$ = new BehaviorSubject<
    TemplateRef<EmojiPickerContext> | undefined
  >(undefined);
  /**
   * The typing indicator template used in the [message list](../components/MessageListComponent.mdx)
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  typingIndicatorTemplate$ = new BehaviorSubject<
    TemplateRef<TypingIndicatorContext> | undefined
  >(undefined);
  /**
   * The template used to display a message in the [message list](../components/MessageListComponent.mdx) (instead of the [default message component](../components/MessageComponent.mdx))
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  messageTemplate$ = new BehaviorSubject<
    TemplateRef<MessageContext> | undefined
  >(undefined);
  /**
   * The template for channel actions displayed in the [channel header](../components/ChannelHeaderComponent.mdx) (by default no channel action is displayed)
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  channelActionsTemplate$ = new BehaviorSubject<
    TemplateRef<ChannelActionsContext> | undefined
  >(undefined);
  /**
   * The template used to display attachments of a [message](../components/MessageComponent.mdx) (instead of the [default attachment list](../components/AttachmentListComponent.mdx))
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  attachmentListTemplate$ = new BehaviorSubject<
    TemplateRef<AttachmentListContext> | undefined
  >(undefined);
  /**
   * The template used to display attachments in the [message input](../components/MessageInputComponent.mdx) component (instead of the [default attachment preview](../components/AttachmentPreviewListComponent.mdx))
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  attachmentPreviewListTemplate$ = new BehaviorSubject<
    TemplateRef<AttachmentPreviewListContext> | undefined
  >(undefined);
  /**
   * The template used to display avatars for channels and users (instead of the [default avatar](../components/AvatarComponent.mdx))
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  avatarTemplate$ = new BehaviorSubject<TemplateRef<AvatarContext> | undefined>(
    undefined
  );
  /**
   * Template for displaying icons (instead of the [default icon component](../components/IconComponent.mdx))
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  iconTemplate$ = new BehaviorSubject<TemplateRef<IconContext> | undefined>(
    undefined
  );
  /**
   * Template for displaying the loading indicator (instead of the [default loading indicator](../components/LoadingIndicatorComponent.mdx))
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  loadingIndicatorTemplate$ = new BehaviorSubject<
    TemplateRef<LoadingIndicatorContext> | undefined
  >(undefined);
  /**
   * Template for displaying the message actions box (instead of the [default message actions box](../components/MessageActionsBoxComponent.mdx))
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  messageActionsBoxTemplate$ = new BehaviorSubject<
    TemplateRef<MessageActionsBoxContext> | undefined
  >(undefined);
  /**
   * The template used for displaying an item in the [message actions box](../components/MessageActionsBoxComponent.mdx)
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  messageActionsBoxItemTemplate$ = new BehaviorSubject<
    TemplateRef<MessageActionBoxItemContext> | undefined
  >(undefined);
  /**
   * The template used to display the reactions of a [message](../components/MessageComponent.mdx), and the selector to add a reaction to a message (instead of the [default message reactions component](../components/MessageReactionsComponent.mdx))
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  messageReactionsTemplate$ = new BehaviorSubject<
    TemplateRef<MessageReactionsContext> | undefined
  >(undefined);
  /**
   * The template used to display a modal window (instead of the [default modal](../components/ModalComponent.mdx))
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  modalTemplate$ = new BehaviorSubject<TemplateRef<ModalContext> | undefined>(
    undefined
  );
  /**
   * The template used to override the [default notification component](../components/NotificationComponent.mdx)
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  notificationTemplate$ = new BehaviorSubject<
    TemplateRef<NotificationContext> | undefined
  >(undefined);
  /**
   * The template used for header of a [thread](../components/ThreadComponent.mdx)
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  threadHeaderTemplate$ = new BehaviorSubject<
    TemplateRef<ThreadHeaderContext> | undefined
  >(undefined);
  /**
   * The template used for displaying the delivered state of the message inside the [message component](../components/MessageComponent.mdx)
   *
   * Displayed for the last message sent by the current user, if the message isn't yet read by anyone
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  deliveredStatusTemplate$ = new BehaviorSubject<
    TemplateRef<DeliveredStatusContext> | undefined
  >(undefined);
  /**
   * The template used for displaying the sending state of the message inside the [message component](../components/MessageComponent.mdx)
   *
   * Displayed for the last message sent by the current user, if the message is currently being sent
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  sendingStatusTemplate$ = new BehaviorSubject<
    TemplateRef<SendingStatusContext> | undefined
  >(undefined);
  /**
   * The template used for displaying the sent state of the message inside the [message component](../components/MessageComponent.mdx)
   *
   * Displayed for the last message sent by the current user, if the message is read at least by one user
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  readStatusTemplate$ = new BehaviorSubject<
    TemplateRef<ReadStatusContext> | undefined
  >(undefined);
  /**
   * Template to display custom metadata inside [message component](../components/MessageComponent.mdx)
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  customMessageMetadataTemplate$ = new BehaviorSubject<
    TemplateRef<CustomMetadataContext<T>> | undefined
  >(undefined);
  /**
   * The template used to display additional information about a channel under the channel name inside the [channel header component](../components/ChannelHeaderComponent.mdx)
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  channelHeaderInfoTemplate$ = new BehaviorSubject<
    TemplateRef<ChannelHeaderInfoContext> | undefined
  >(undefined);
  /**
   * The template used for displaying file upload/attachment selector inside the [message input](../components/MessageInputComponent.mdx)
   *
   * For code examples to the different customizations see our [customizations example application](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example), specifically the [AppComponent](https://github.com/GetStream/stream-chat-angular/tree/master/projects/customizations-example/src/app) (see [README](https://github.com/GetStream/stream-chat-angular/blob/master/README.md#customization-examples) for instructions on how to start the application).
   */
  customAttachmentUploadTemplate$ = new BehaviorSubject<
    TemplateRef<CustomAttachmentUploadContext> | undefined
  >(undefined);
  /**
   * The template that can be used to override how a single image attachment is displayed inside the [attachment list](../components/AttachmentListComponent.mdx)
   */
  imageAttachmentTemplate$ = new BehaviorSubject<
    TemplateRef<AttachmentContext> | undefined
  >(undefined);
  /**
   * The template that can be used to override how a video attachment is displayed inside the [attachment list](../components/AttachmentListComponent.mdx)
   */
  videoAttachmentTemplate$ = new BehaviorSubject<
    TemplateRef<AttachmentContext> | undefined
  >(undefined);
  /**
   * The template that can be used to override how image gallery is displayed inside the [attachment list](../components/AttachmentListComponent.mdx)
   */
  galleryAttachmentTemplate$ = new BehaviorSubject<
    TemplateRef<AttachmentContext> | undefined
  >(undefined);
  /**
   * The template that can be used to override how a file attachment is displayed inside the [attachment list](../components/AttachmentListComponent.mdx)
   */
  fileAttachmentTemplate$ = new BehaviorSubject<
    TemplateRef<AttachmentContext> | undefined
  >(undefined);
  /**
   * The template that can be used to override how a card attachment is displayed inside the [attachment list](../components/AttachmentListComponent.mdx)
   */
  cardAttachmentTemplate$ = new BehaviorSubject<
    TemplateRef<AttachmentContext> | undefined
  >(undefined);
  /**
   * The template that can be used to override how attachment actions are displayed inside the [attachment list](../components/AttachmentListComponent.mdx)
   */
  attachmentActionsTemplate$ = new BehaviorSubject<
    TemplateRef<AttachmentContext> | undefined
  >(undefined);
  /**
   * The template used to display [system messages](https://getstream.io/chat/docs/javascript/silent_messages/?language=javascript&q=system) indise the [message component](../components/MessageComponent.mdx)
   */
  systemMessageTemplate$ = new BehaviorSubject<
    TemplateRef<SystemMessageContext> | undefined
  >(undefined);
  /**
   * The template used to display the date separator inside the [message list](../components/MessageListComponent.mdx)
   */
  dateSeparatorTemplate$ = new BehaviorSubject<
    TemplateRef<DateSeparatorContext> | undefined
  >(undefined);
  /**
   * The template used to display unread messages indicator inside the [message list](../components/MessageListComponent.mdx) when the channel is opened
   *
   * This UI element is used to separate unread messages from read messages
   */
  newMessagesIndicatorTemplate$ = new BehaviorSubject<
    TemplateRef<UnreadMessagesIndicatorContext> | undefined
  >(undefined);
  /**
   * The template used to display unread messages notification inside the [message list](../components/MessageListComponent.mdx) when the channel is opened
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
   * The template used to display the [edit message form](../components/EditMessageFormComponent.mdx)
   */
  editMessageFormTemplate$ = new BehaviorSubject<TemplateRef<void> | undefined>(
    undefined
  );
  /**
   * The template used to display the [message bounce prompt](../components/MessageBouncePromptComponent.mdx)
   */
  messageBouncePromptTemplate$ = new BehaviorSubject<
    TemplateRef<void> | undefined
  >(undefined);
  constructor() {}
}
