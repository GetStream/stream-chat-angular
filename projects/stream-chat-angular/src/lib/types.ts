import { TemplateRef } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import type {
  Attachment,
  Channel,
  ChannelFilters,
  ChannelManagerEventHandlerOverrides,
  ChannelMemberResponse,
  ChannelOptions,
  ChannelSort,
  CommandResponse,
  Event,
  ExtendableGenerics,
  FormatMessageResponse,
  LiteralStringForUnion,
  MessageResponseBase,
  Mute,
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

export type DefaultStreamChatGenerics = ExtendableGenerics & {
  attachmentType: DefaultAttachmentType;
  channelType: DefaultChannelType;
  commandType: LiteralStringForUnion;
  eventType: UnknownType;
  messageType: DefaultMessageType;
  reactionType: UnknownType;
  userType: DefaultUserType;
};

export type DefaultAttachmentType = UnknownType & {
  asset_url?: string;
  id?: string;
  images?: Array<Attachment<DefaultStreamChatGenerics>>;
  mime_type?: string;
  isCustomAttachment?: boolean;
};

export type DefaultChannelType = UnknownType & {
  image?: string;
  member_count?: number;
  subtitle?: string;
};

export type DefaultCommandType = LiteralStringForUnion;

export type DefaultMessageType = UnknownType & {
  customType?: 'channel.intro' | 'message.date';
  date?: string | Date;
  errorStatusCode?: number;
  event?: Event<DefaultStreamChatGenerics>;
  unread?: boolean;
  readBy: UserResponse<DefaultStreamChatGenerics>[];
  translation?: string;
  quoted_message?: MessageResponseBase<DefaultStreamChatGenerics>;
};

export type DefaultUserTypeInternal = {
  image?: string;
  status?: string;
};

export type DefaultUserType = UnknownType &
  DefaultUserTypeInternal & {
    mutes?: Array<Mute<DefaultStreamChatGenerics>>;
  };

export type StreamMessage<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = FormatMessageResponse<T>;

export type AttachmentUploadErrorReason =
  | 'file-size'
  | 'file-extension'
  | 'unknown';

export type AttachmentUpload<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = {
  file: File;
  state: 'error' | 'success' | 'uploading';
  errorReason?: AttachmentUploadErrorReason;
  errorExtraInfo?: { param: string }[];
  url?: string;
  type: 'image' | 'file' | 'video' | 'voiceRecording';
  previewUri?: string | ArrayBuffer;
  thumb_url?: string;
  extraData?: Partial<Attachment<T>>;
  fromAttachment?: Attachment<T>;
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

export type ChannelPreviewContext<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = {
  channel: Channel<T>;
};

export type ChannelPreviewInfoContext<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = ChannelPreviewContext & {
  latestMessage?: StreamMessage<T>;
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
  usersTyping$: Observable<UserResponse<DefaultStreamChatGenerics>[]>;
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

export type ChannelActionsContext<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = { channel: Channel<T> };

export type CustomAttachmentListContext<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = {
  messageId: string;
  attachments: Attachment<T>[];
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
  channel?: Channel<DefaultStreamChatGenerics>;
  user?: User<DefaultStreamChatGenerics>;
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

export type MessageActionsBoxContext<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = {
  isMine: boolean;
  message: StreamMessage<T> | undefined;
  enabledActions: string[];
  messageTextHtmlElement: HTMLElement | undefined;
};

export type MessageActionHandlerExtraParams = {
  isMine: boolean;
  messageTextHtmlElement?: HTMLElement;
};

export type MessageActionHandler<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = (
  message: StreamMessage<T>,
  params: MessageActionHandlerExtraParams,
) => void;

export type MessageActionBoxItemContext<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = {
  actionName: string;
  actionLabelOrTranslationKey: ((message: StreamMessage<T>) => string) | string;
  message: StreamMessage<T>;
  actionHandlerExtraParams: MessageActionHandlerExtraParams;
  actionHandler: MessageActionHandler<T>;
};

export type MessageReactionActionItem<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = {
  actionName: 'react';
  isVisible: (
    enabledActions: string[],
    isMine: boolean,
    message: StreamMessage<T>,
  ) => boolean;
};

type MessageActionItemBase<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = {
  actionLabelOrTranslationKey: ((message: StreamMessage<T>) => string) | string;
  isVisible: (
    enabledActions: string[],
    isMine: boolean,
    message: StreamMessage<T>,
  ) => boolean;
  actionHandler: MessageActionHandler;
};

export type MessageActionItem<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = MessageActionItemBase<T> & {
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

export type CustomMessageActionItem<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = MessageActionItemBase<T> & {
  actionName: string;
};

export type MessageReactionsSelectorContext = {
  messageId: string | undefined;
  ownReactions: ReactionResponse<DefaultStreamChatGenerics>[];
};

export type MessageReactionsContext = {
  messageId: string | undefined;
  /** @deprecated use `messageReactionGroups` */
  messageReactionCounts: { [key in MessageReactionType]?: number };
  /** @deprecated you can fetch the reactions using [`chatService.chatClient.queryReactions()`](/chat/docs/javascript/send_reaction/&q=queryReactions#query-reactions) */
  latestReactions: ReactionResponse<DefaultStreamChatGenerics>[];
  ownReactions: ReactionResponse<DefaultStreamChatGenerics>[];
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

export type CustomMetadataContext<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = {
  message: StreamMessage<T>;
};

export type ReadStatusContext = {
  message: StreamMessage;
  readByText: string;
};

export type ChannelHeaderInfoContext<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = { channel: Channel<T> };

export type CustomAttachmentUploadContext = {
  isMultipleFileUploadEnabled: boolean | undefined;
  attachmentService: AttachmentService;
};

export type AttachmentContext = {
  attachment: Attachment<DefaultStreamChatGenerics>;
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

export type MessageInput<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = {
  text: string;
  attachments: Attachment<T>[];
  mentionedUsers: UserResponse<T>[];
  parentId: string | undefined;
  quotedMessageId: string | undefined;
  customData: undefined | Partial<T['messageType']>;
};

export type OffsetNextPageConfiguration = {
  type: 'offset';
  offset: number;
};

export type FiltertNextPageConfiguration<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = {
  type: 'filter';
  paginationFilter: ChannelFilters<T>;
};

export type NextPageConfiguration =
  | OffsetNextPageConfiguration
  | FiltertNextPageConfiguration
  | undefined;

export type MessageReactionClickDetails = {
  messageId: string;
  reactionType: string;
};

export type MessageActionsClickDetails<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = MessageActionsBoxContext<T> & { customActions: CustomMessageActionItem[] };

export type GroupStyleOptions = {
  noGroupByUser?: boolean;
  lastReadMessageId?: string;
  noGroupByReadState?: boolean;
};

export type ChannelQueryType = 'first-page' | 'next-page' | 'recover-state';

export type ChannelQueryResult<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = {
  channels: Channel<T>[];
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

export type CustomAttachmentPreviewListContext<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = {
  service: AttachmentService<T>;
};

export type ThreadReplyButtonContext<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = {
  message: StreamMessage<T>;
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

// TODO: add ChannelManagerOptions once it's stable
export type ChannelServiceOptions<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = {
  shouldSetActiveChannel?: boolean;
  eventHandlerOverrides?: ChannelManagerEventHandlerOverrides<T>;
};

export type ChannelQueryConfig<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = {
  filters: ChannelFilters<T>;
  sort: ChannelSort<T>;
  options: ChannelOptions;
};

export type ChannelQueryConfigInput<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics,
> = {
  filters: ChannelFilters<T>;
  sort?: ChannelSort<T>;
  options?: ChannelOptions;
};
