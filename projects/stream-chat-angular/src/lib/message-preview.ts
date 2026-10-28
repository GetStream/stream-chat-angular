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
  const preview: LocalMessage = {
    // Set by the caller, the preview doesn't know which channel it belongs to
    cid: '',
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
    deleted_reply_count: 0,
    reply_count: 0,
    mentioned_channel: false,
    mentioned_here: false,
    pinned: false,
    shadowed: false,
    silent: false,
    restricted_visibility: [],
  };
  return preview;
};
