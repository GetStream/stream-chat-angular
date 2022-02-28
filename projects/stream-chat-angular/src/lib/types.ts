import type {
  Attachment,
  ChannelMemberResponse,
  CommandResponse,
  Event,
  FormatMessageResponse,
  LiteralStringForUnion,
  Mute,
  UserResponse,
} from 'stream-chat';

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
