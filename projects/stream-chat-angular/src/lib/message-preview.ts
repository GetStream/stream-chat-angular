import {
  Attachment,
  CustomMessageData,
  LocalMessage,
  nowNs,
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

  const now = nowNs();
  return {
    created_at: now,
    updated_at: now,
    html: text,
    id: clientSideId,
    latest_reactions: [],
    own_reactions: [],
    reaction_counts: {},
    reaction_scores: {},
    status: 'sending',
    text,
    type: 'regular',
    user,
    attachments,
    mentioned_users: mentionedUsers,
    parent_id: parentId,
    quoted_message_id: quotedMessageId,
    poll_id: pollId,
    custom: customData ?? {},
  } as unknown as LocalMessage;
};
