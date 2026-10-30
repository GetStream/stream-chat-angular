import { Channel, MessageResponse, UserResponse } from 'stream-chat';

/**
 * Returns the users who have read the given message (the author of the message isn't included). The read receipts are tracked by stream-chat (`channel.messageReceiptsTracker`).
 * @param message
 * @param channel
 * @returns the users who have read the message
 */
export const getReadBy = (
  message: Pick<MessageResponse, 'id' | 'created_at' | 'user'>,
  channel: Channel
): UserResponse[] =>
  channel.messageReceiptsTracker
    .readersForMessage({ timestamp: message.created_at, msgId: message.id })
    .filter((user) => user.id !== message.user?.id);
