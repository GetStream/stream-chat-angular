import { TemplateRef } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import type {
  Attachment,
  Channel,
  ChannelMemberResponse,
  CommandResponse,
  Event,
  FormatMessageResponse,
  LiteralStringForUnion,
  Mute,
  ReactionResponse,
  UserResponse,
} from 'stream-chat';
import { Icon } from './icon/icon.component';

export type UnknownType = Record<string, unknown>;

export type CustomTrigger = {
  [key: string]: {
    componentProps: UnknownType;
    data: UnknownType;
  };
};

export type DefaultAttachmentType = UnknownType & {
  asset_url?: string;
  id?: string;
  images?: Array<Attachment<DefaultAttachmentType>>;
  mime_type?: string;
};

export type DefaultChannelType = UnknownType & {
  image?: string;
  member_count?: number;
  subtitle?: string;
};

export type DefaultCommandType = LiteralStringForUnion;

export type DefaultEventType = UnknownType;

export type DefaultMessageType = UnknownType & {
  customType?: 'channel.intro' | 'message.date';
  date?: string | Date;
  errorStatusCode?: number;
  event?: Event<
    DefaultAttachmentType,
    DefaultChannelType,
    DefaultCommandType,
    DefaultEventType,
    DefaultMessageType,
    DefaultReactionType,
    DefaultUserType
  >;
  unread?: boolean;
  readBy: UserResponse<DefaultUserType>[];
};

export type DefaultReactionType = UnknownType;

export type DefaultUserTypeInternal = {
  image?: string;
  status?: string;
};

export type DefaultUserType<
  UserType extends DefaultUserTypeInternal = DefaultUserTypeInternal
> = UnknownType &
  DefaultUserTypeInternal & {
    mutes?: Array<Mute<UserType>>;
  };

export type StreamMessage<
  At extends DefaultAttachmentType = DefaultAttachmentType,
  Ch extends DefaultChannelType = DefaultChannelType,
  Co extends DefaultCommandType = DefaultCommandType,
  Me extends DefaultMessageType = DefaultMessageType,
  Re extends DefaultReactionType = DefaultReactionType,
  Us extends DefaultUserType<Us> = DefaultUserType
> = FormatMessageResponse<At, Ch, Co, Me, Re, Us>;

export type AttachmentUpload = {
  file: File;
  state: 'error' | 'success' | 'uploading';
  url?: string;
  type: 'image' | 'file';
  previewUri?: string | ArrayBuffer;
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

export type ChannelPreviewContext = {
  channel: Channel;
};

export type MessageInputContext = {
  isFileUploadEnabled: boolean | undefined;
  areMentionsEnabled: boolean | undefined;
  mentionScope: 'channel' | 'application' | undefined;
  mode: 'thread' | 'main' | undefined;
  isMultipleFileUploadEnabled: boolean | undefined;
  message: StreamMessage | undefined;
  messageUpdateHandler: Function | undefined;
};

export type MentionTemplateContext = {
  content: string;
  user: UserResponse;
};

export type EmojiPickerContext = {
  emojiInput$: Subject<string>;
};

export type TypingIndicatorContext = {
  usersTyping$: Observable<UserResponse<DefaultUserType>[]>;
};

export type MessageContext = {
  message: StreamMessage | undefined;
  enabledMessageActions: string[];
  isLastSentMessage: boolean | undefined;
  mode: 'thread' | 'main';
};

export type ChannelActionsContext = { channel: Channel };

export type AttachmentListContext = {
  messageId: string;
  attachments: Attachment<DefaultAttachmentType>[];
};

export type AvatarContext = {
  name: string | undefined;
  imageUrl: string | undefined;
  size: number | undefined;
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
  displayedActionsCountChaneHanler: (count: number) => any;
  isEditingChangeHandler: (isEditing: boolean) => any;
};

export type MessageActionBoxItemContext = {
  actionName: 'quote' | 'pin' | 'flag' | 'mute' | 'edit' | 'delete';
  actionLabelOrTranslationKey: (() => string) | string;
  actionHandler: () => any;
};

export type MessageActionItem = {
  actionName: 'quote' | 'pin' | 'flag' | 'mute' | 'edit' | 'delete';
  actionLabelOrTranslationKey: (() => string) | string;
  isVisible: (
    enabledActions: string[],
    isMine: boolean,
    message: StreamMessage
  ) => boolean;
  actionHandler: (message: StreamMessage, isMine: boolean) => any;
};

export type MessageReactionsContext = {
  messageId: string | undefined;
  messageReactionCounts: { [key in MessageReactionType]?: number };
  isSelectorOpen: boolean;
  latestReactions: ReactionResponse<DefaultReactionType, DefaultUserType>[];
  ownReactions: ReactionResponse<DefaultReactionType, DefaultUserType>[];
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
  | 'wow';
