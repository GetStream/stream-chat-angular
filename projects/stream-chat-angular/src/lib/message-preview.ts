import {
  Attachment,
  CustomMessageData,
  MessageResponse,
  UserResponse,
} from 'stream-chat';
import { v4 as uuidv4 } from 'uuid';

export const createMessagePreview = (
  user: UserResponse,
  text: string,
  attachments: Attachment[] = [],
  mentionedUsers: UserResponse[] = [],
  parentId: undefined | string = undefined,
  quotedMessageId: undefined | string = undefined,
  customData: undefined | CustomMessageData,
  pollId: undefined | string = undefined
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
    poll_id: pollId,
    ...customData,
  } as unknown as MessageResponse;
};
