import { TemplateRef } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import type {
  Attachment,
  Channel,
  ChannelFilters,
  ChannelMemberResponse,
  CommandResponse,
  Event,
  ExtendableGenerics,
  FormatMessageResponse,
  LiteralStringForUnion,
  MessageResponseBase,
  Mute,
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
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> = FormatMessageResponse<T>;

export type AttachmentUploadErrorReason =
  | 'file-size'
  | 'file-extension'
  | 'unknown';

export type AttachmentUpload<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> = {
  file: File;
  state: 'error' | 'success' | 'uploading';
  errorReason?: AttachmentUploadErrorReason;
  errorExtraInfo?: { param: string }[];
  url?: string;
  type: 'image' | 'file' | 'video';
  previewUri?: string | ArrayBuffer;
  thumb_url?: string;
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

export type NotificationPayload<T = {}> = {
  id: string;
  type: NotificationType;
  text?: string;
  translateParams?: Object;
  template?: TemplateRef<T>;
  templateContext?: T;
  dismissFn: Function;
};

export type ChannelPreviewContext<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> = {
  channel: Channel<T>;
};

export type ChannelPreviewInfoContext<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
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

export type MessageInputContext = {
  isFileUploadEnabled: boolean | undefined;
  areMentionsEnabled: boolean | undefined;
  mentionScope: 'channel' | 'application' | undefined;
  mode: 'thread' | 'main' | undefined;
  isMultipleFileUploadEnabled: boolean | undefined;
  message: StreamMessage | undefined;
  messageUpdateHandler: Function | undefined;
  sendMessage$: Observable<void>;
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
};

export type ChannelActionsContext<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> = { channel: Channel<T> };

export type AttachmentListContext = {
  messageId: string;
  attachments: Attachment<DefaultStreamChatGenerics>[];
  parentMessageId?: string;
  imageModalStateChangeHandler?: (state: 'opened' | 'closed') => {};
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
  | 'reaction';

export type AvatarContext = {
  name: string | undefined;
  imageUrl: string | undefined;
  size: number | undefined;
  type: AvatarType | undefined;
  location: AvatarLocation | undefined;
  channel?: Channel<DefaultStreamChatGenerics>;
  user?: User<DefaultStreamChatGenerics>;
  initialsType?: 'first-letter-of-first-word' | 'first-letter-of-each-word';
  showOnlineIndicator?: boolean;
};

export type AttachmentPreviewListContext = {
  attachmentUploads$: Observable<AttachmentUpload[]> | undefined;
  retryUploadHandler: (f: File) => any;
  deleteUploadHandler: (u: AttachmentUpload) => any;
};

export type IconContext = {
  icon: Icon | undefined;
  size: number | undefined;
};

export type LoadingIndicatorContext = {
  size: number | undefined;
  color: string | undefined;
};

export type MessageActionsBoxContext = {
  isOpen: boolean;
  isMine: boolean;
  message: StreamMessage | undefined;
  enabledActions: string[];
  /**
   * @deprecated please use `messageReactionsService.customActions$`
   *
   * More information: https://getstream.io/chat/docs/sdk/angular/services/MessageActionsService
   */
  customActions: CustomMessageActionItem[];
  /**
   * @deprecated because the name contains typos, use the `displayedActionsCountChangeHandler` instead
   */
  displayedActionsCountChaneHanler: (count: number) => any;
  /**
   * @deprecated components should use `messageReactionsService.getAuthorizedMessageActionsCount` method
   *
   * More information: https://getstream.io/chat/docs/sdk/angular/services/MessageActionsService
   */
  displayedActionsCountChangeHandler: (count: number) => any;
};

export type MessageActionBoxItemContext<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> = {
  actionName: 'quote' | 'pin' | 'flag' | 'edit' | 'delete' | string;
  actionLabelOrTranslationKey: ((message: StreamMessage<T>) => string) | string;
  message: StreamMessage<T>;
  isMine: boolean;
  actionHandler: (message: StreamMessage<T>, isMine: boolean) => any;
};

type MessageActionItemBase<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> = {
  actionLabelOrTranslationKey: ((message: StreamMessage<T>) => string) | string;
  isVisible: (
    enabledActions: string[],
    isMine: boolean,
    message: StreamMessage<T>
  ) => boolean;
  actionHandler: (message: StreamMessage<T>, isMine: boolean) => any;
};

export type MessageActionItem<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> = MessageActionItemBase<T> & {
  actionName: 'quote' | 'pin' | 'flag' | 'edit' | 'delete' | 'mark-unread';
};

export type CustomMessageActionItem<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> = MessageActionItemBase<T> & {
  actionName: string;
};

export type MessageReactionsContext = {
  messageId: string | undefined;
  messageReactionCounts: { [key in MessageReactionType]?: number };
  isSelectorOpen: boolean;
  latestReactions: ReactionResponse<DefaultStreamChatGenerics>[];
  ownReactions: ReactionResponse<DefaultStreamChatGenerics>[];
  isSelectorOpenChangeHandler: (isOpen: boolean) => any;
};

export type ModalContext = {
  isOpen: boolean;
  isOpenChangeHandler: (isOpen: boolean) => any;
  content: TemplateRef<void>;
};

export type NotificationContext = {
  type: NotificationType | undefined;
  content: TemplateRef<void> | undefined;
};

export type ThreadHeaderContext = {
  parentMessage: StreamMessage | undefined;
  closeThreadHandler: Function;
};

export type MessageReactionType =
  | 'angry'
  | 'haha'
  | 'like'
  | 'love'
  | 'sad'
  | 'wow'
  | string;

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
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> = {
  message: StreamMessage<T>;
};

export type ReadStatusContext = {
  message: StreamMessage;
  readByText: string;
};

export type ChannelHeaderInfoContext<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
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
    onJump: Function;
    onDismiss: Function;
  };

export type ChannelQueryState = {
  state: 'in-progress' | 'success' | 'error';
  // No type def from stream-chat
  error?: unknown;
};

export type MessageInput<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
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
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> = {
  type: 'filter';
  paginationFilter: ChannelFilters<T>;
};

export type NextPageConfiguration =
  | OffsetNextPageConfiguration
  | FiltertNextPageConfiguration;

export type MessageReactionClickDetails = {
  messageId: string;
  reactionType: string;
};

export type MessageActionsClickDetails<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> = {
  message: StreamMessage<T>;
  enabledActions: string[];
  isMine: boolean;
  customActions: CustomMessageActionItem[];
};

export type GroupStyleOptions = {
  noGroupByUser?: boolean;
  lastReadMessageId?: string;
  noGroupByReadState?: boolean;
};
