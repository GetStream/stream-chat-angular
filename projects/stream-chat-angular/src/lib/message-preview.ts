import { Attachment, MessageResponse, UserResponse } from 'stream-chat';
import { v4 as uuidv4 } from 'uuid';
import { DefaultStreamChatGenerics } from './types';

export const createMessagePreview = <
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
>(
  user: UserResponse,
  text: string,
  attachments: Attachment<T>[] = [],
  mentionedUsers: UserResponse<T>[] = [],
  parentId: undefined | string = undefined,
  quotedMessageId: undefined | string = undefined,
  customData: undefined | Partial<T['messageType']>
) => {
  const clientSideId = `${user.id}-${uuidv4()}`;

  return {
    __html: text,
    created_at: new Date(),
    html: text,
    id: clientSideId,
    reactions: [],
    status: 'sending',
    text,
    type: 'regular',
    user,
    attachments,
    mentioned_users: mentionedUsers,
    parent_id: parentId,
    quoted_message_id: quotedMessageId,
    ...customData,
  } as unknown as MessageResponse<T>;
};
