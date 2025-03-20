import { TemplateRef } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import type {
  Attachment,
  Channel,
  ChannelFilters,
  ChannelMemberResponse,
  CommandResponse,
  CustomMessageData,
  FormatMessageResponse,
  MessageResponseBase,
  ReactionGroupResponse,
  ReactionResponse,
  User,
  UserResponse,
} from 'stream-chat';
import { AttachmentService } from './attachment.service';
import { Icon } from './icon/icon.component';

export type UnknownType = Record<string, unknown>;

export type CustomTrigger = {
  [key: string]: {
    componentProps: UnknownType;
    data: UnknownType;
  };
};

export type StreamMessage = FormatMessageResponse & {
  readBy: UserResponse[];
  translation?: string;
  errorStatusCode?: number;
  quoted_message?: MessageResponseBase & { translation?: string };
};

export type AttachmentUploadErrorReason =
  | 'file-size'
  | 'file-extension'
  | 'unknown';

export type AttachmentUpload = {
  file: File;
  state: 'error' | 'success' | 'uploading';
  errorReason?: AttachmentUploadErrorReason;
  errorExtraInfo?: { param: string }[];
  url?: string;
  type: 'image' | 'file' | 'video' | 'voiceRecording';
  previewUri?: string | ArrayBuffer;
  thumb_url?: string;
  extraData?: Partial<Attachment>;
  fromAttachment?: Attachment;
};

export type MentionAutcompleteListItemContext = {
  item: MentionAutcompleteListItem;
};

export type CommandAutocompleteListItemContext = {
  item: ComandAutocompleteListItem;
};

export type MentionAutcompleteListItem = (
  | ChannelMemberResponse
  | UserResponse
) & {
  autocompleteLabel: string;
};

export type ComandAutocompleteListItem = CommandResponse & {
  autocompleteLabel: string;
};

export type NotificationType = 'success' | 'error' | 'info';

export type NotificationPayload<T = object> = {
  id: string;
  type: NotificationType;
  text?: string;
  translateParams?: object;
  template?: TemplateRef<T>;
  templateContext?: T;
  dismissFn: () => void;
};

export type ChannelPreviewContext = {
  channel: Channel;
};

export type ChannelPreviewInfoContext = ChannelPreviewContext & {
  latestMessage?: StreamMessage;
  /**
   * The text of the latest message, or some meta information (for example: "Nothing yet")
   */
  latestMessageText: string;
  /**
   * The title of the channel, or the name of the channel members
   */
  channelDisplayTitle: string;
  /**
   * The status of the last message (only available if the last message was sent by the current user)
   */
  latestMessageStatus?: 'delivered' | 'read';
  /**
   * The time of the last message (formatted to a user-friendly string)
   */
  latestMessageTime?: string;
  unreadCount: number;
};

export type MentionTemplateContext = {
  content: string;
  user: UserResponse;
};

export type EmojiPickerContext = {
  emojiInput$: Subject<string>;
};

export type TypingIndicatorContext = {
  usersTyping$: Observable<UserResponse[]>;
};

export type MessageContext = {
  message: StreamMessage | undefined;
  enabledMessageActions: string[];
  isLastSentMessage: boolean | undefined;
  mode: 'thread' | 'main';
  isHighlighted: boolean;
  customActions: CustomMessageActionItem[];
  scroll$?: Observable<void>;
};

export type ChannelActionsContext = { channel: Channel };

export type CustomAttachmentListContext = {
  messageId: string;
  attachments: Attachment[];
  parentMessageId?: string;
};

export type AttachmentListContext = CustomAttachmentListContext & {
  imageModalStateChangeHandler?: (state: 'opened' | 'closed') => void;
};

export type AvatarType = 'channel' | 'user';

export type AvatarLocation =
  | 'channel-preview'
  | 'channel-header'
  | 'message-sender'
  | 'message-reader'
  | 'quoted-message-sender'
  | 'autocomplete-item'
  | 'typing-indicator'
  /**
   * @deprecated this will be renamed to user-list in the next major release
   */
  | 'reaction';

export type AvatarContext = {
  name: string | undefined;
  imageUrl: string | undefined;
  type: AvatarType | undefined;
  location: AvatarLocation | undefined;
  channel?: Channel;
  user?: User;
  initialsType?: 'first-letter-of-first-word' | 'first-letter-of-each-word';
  showOnlineIndicator?: boolean;
};

export type AttachmentPreviewListContext = {
  attachmentUploads$: Observable<AttachmentUpload[]> | undefined;
  retryUploadHandler: (f: File) => void;
  deleteUploadHandler: (u: AttachmentUpload) => void;
  service: AttachmentService;
};

export type IconContext = {
  icon: Icon | undefined;
};

export type MessageActionsBoxContext = {
  isMine: boolean;
  message: StreamMessage | undefined;
  enabledActions: string[];
  messageTextHtmlElement: HTMLElement | undefined;
};

export type MessageActionHandlerExtraParams = {
  isMine: boolean;
  messageTextHtmlElement?: HTMLElement;
};

export type MessageActionHandler = (
  message: StreamMessage,
  params: MessageActionHandlerExtraParams
) => void;

export type MessageActionBoxItemContext = {
  actionName: string;
  actionLabelOrTranslationKey: ((message: StreamMessage) => string) | string;
  message: StreamMessage;
  actionHandlerExtraParams: MessageActionHandlerExtraParams;
  actionHandler: MessageActionHandler;
};

export type MessageReactionActionItem = {
  actionName: 'react';
  isVisible: (
    enabledActions: string[],
    isMine: boolean,
    message: StreamMessage
  ) => boolean;
};

type MessageActionItemBase = {
  actionLabelOrTranslationKey: ((message: StreamMessage) => string) | string;
  isVisible: (
    enabledActions: string[],
    isMine: boolean,
    message: StreamMessage
  ) => boolean;
  actionHandler: MessageActionHandler;
};

export type MessageActionItem = MessageActionItemBase & {
  actionName:
    | 'quote'
    | 'pin'
    | 'flag'
    | 'edit'
    | 'delete'
    | 'mark-unread'
    | 'thread-reply'
    | 'copy-message-text';
};

export type CustomMessageActionItem = MessageActionItemBase & {
  actionName: string;
};

export type MessageReactionsSelectorContext = {
  messageId: string | undefined;
  ownReactions: ReactionResponse[];
};

export type MessageReactionsContext = {
  messageId: string | undefined;
  /** @deprecated use `messageReactionGroups` */
  messageReactionCounts: { [key in MessageReactionType]?: number };
  /** @deprecated you can fetch the reactions using [`chatService.chatClient.queryReactions()`](/chat/docs/javascript/send_reaction/&q=queryReactions#query-reactions) */
  latestReactions: ReactionResponse[];
  ownReactions: ReactionResponse[];
  messageReactionGroups: {
    [key in MessageReactionType]: ReactionGroupResponse;
  };
};

export type ModalContext = {
  isOpen: boolean;
  isOpenChangeHandler: (isOpen: boolean) => void;
  content: TemplateRef<void>;
};

export type NotificationContext = {
  type: NotificationType | undefined;
  content: TemplateRef<void> | undefined;
};

export type ThreadHeaderContext = {
  parentMessage: StreamMessage | undefined;
  closeThreadHandler: () => void;
};

export type MessageReactionType = string;

export type AttachmentConfigration = {
  url: string;
  height: string;
  width: string;
};

export type ImageAttachmentConfiguration = AttachmentConfigration & {
  originalHeight: number;
  originalWidth: number;
};

export type VideoAttachmentConfiguration = ImageAttachmentConfiguration & {
  thumbUrl?: string;
};

export type DeliveredStatusContext = {
  message: StreamMessage;
};

export type SendingStatusContext = {
  message: StreamMessage;
};

export type CustomMetadataContext = {
  message: StreamMessage;
};

export type ReadStatusContext = {
  message: StreamMessage;
  readByText: string;
};

export type ChannelHeaderInfoContext = { channel: Channel };

export type CustomAttachmentUploadContext = {
  isMultipleFileUploadEnabled: boolean | undefined;
  attachmentService: AttachmentService;
};

export type AttachmentContext = {
  attachment: Attachment;
};

export type GalleryAttachmentContext = {
  attachment: GalleryAttachment;
};

export type SystemMessageContext = MessageContext & {
  parsedDate: string | undefined;
};

export type DateSeparatorContext = {
  date: Date;
  parsedDate: string;
};

export type UnreadMessagesIndicatorContext = {
  unreadCount: number;
};

export type UnreadMessagesNotificationContext =
  UnreadMessagesIndicatorContext & {
    onJump: () => void;
    onDismiss: () => void;
  };

export type ChannelQueryState = {
  state: 'in-progress' | 'success' | 'error';
  // No type def from stream-chat
  error?: unknown;
};

export type MessageInput = {
  text: string;
  attachments: Attachment[];
  mentionedUsers: UserResponse[];
  parentId: string | undefined;
  quotedMessageId: string | undefined;
  customData: undefined | CustomMessageData;
};

export type OffsetNextPageConfiguration = {
  type: 'offset';
  offset: number;
};

export type FiltertNextPageConfiguration = {
  type: 'filter';
  paginationFilter: ChannelFilters;
};

export type NextPageConfiguration =
  | OffsetNextPageConfiguration
  | FiltertNextPageConfiguration
  | undefined;

export type MessageReactionClickDetails = {
  messageId: string;
  reactionType: string;
};

export type MessageActionsClickDetails = MessageActionsBoxContext & {
  customActions: CustomMessageActionItem[];
};

export type GroupStyleOptions = {
  noGroupByUser?: boolean;
  lastReadMessageId?: string;
  noGroupByReadState?: boolean;
};

export type ChannelQueryType = 'first-page' | 'next-page' | 'recover-state';

export type ChannelQueryResult = {
  channels: Channel[];
  hasMorePage: boolean;
};

export type VirtualizedListScrollPosition = 'top' | 'bottom' | 'middle';

export type VirtualizedListQueryState = {
  state: 'loading-top' | 'loading-bottom' | 'success' | 'error';
  error?: unknown;
};

export type VirtualizedListQueryDirection = 'top' | 'bottom';

export type VirtualizedListVerticalItemPosition = 'top' | 'bottom' | 'middle';

export type AudioRecording = MediaRecording & { waveform_data: number[] };

export type MediaRecording = {
  recording: File;
  duration: number;
  mime_type: string;
  asset_url: string | ArrayBuffer | undefined;
};

export type CustomAttachmentPreviewListContext = {
  attachmentService: AttachmentService;
};

export type ThreadReplyButtonContext = {
  message: StreamMessage;
};

export type CustomAutocompleteItemContext = {
  item: CustomAutocompleteItem;
};

export type CustomAutocompleteItem = {
  /**
   * This is the text that will be inserted into the message input once a user selects an option (appended after the trigger character)
   */
  autocompleteLabel: string;
};

export type CustomAutocomplete = {
  /**
   * The character that will trigger the autocomplete (for example #)
   *
   * The SDK supports @ and / by default, so you can't use those
   */
  triggerCharacter: string;
  /**
   * The HTML template to display an item in the autocomplete list
   */
  templateRef: TemplateRef<{ item: CustomAutocompleteItem }>;
  /**
   * Set to `true` if space characters can be part of the `autocompleteLabel`
   */
  allowSpace: boolean;
  /**
   * The options to choose from
   *
   * In case you want to use dynamic/server-side filtering, use `updateOptions` instead
   */
  options: CustomAutocompleteItem[];
  /**
   * If you want to have dynamic/server-side filtering provide a  method that will be called any time the autocomplete options should be filtered
   * @param searchTerm the text to filter by (without the trigger character), can be an empty string
   * @returns a promise that will resolve to the options, you should take care of error handling
   */
  updateOptions?: (searchTerm: string) => Promise<CustomAutocompleteItem[]>;
};

export type MessageTextContext = {
  message: StreamMessage | undefined | MessageResponseBase;
  isQuoted: boolean;
  shouldTranslate: boolean;
};

export type GalleryAttachment = {
  type: 'gallery';
  images: Attachment[];
};
