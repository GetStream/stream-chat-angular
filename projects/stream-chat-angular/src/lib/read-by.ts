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

/**
 * Calls `callback` with the users who have read the given message (the author of the message isn't included), and again every time the read receipts of the channel change
 * @param message
 * @param channel
 * @param callback
 * @returns a method to stop watching the read receipts
 */
export const watchReadBy = (
  message: Pick<MessageResponse, 'id' | 'created_at' | 'user'>,
  channel: Channel,
  callback: (readBy: UserResponse[]) => void
): (() => void) =>
  channel.messageReceiptsTracker.snapshotStore.subscribeWithSelector(
    (state) => ({ revision: state.revision }),
    () => callback(getReadBy(message, channel))
  );
