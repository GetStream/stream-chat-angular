import { Channel, MessageResponse, UserResponse } from 'stream-chat';

export const getReadBy = (
  message: Pick<MessageResponse, 'created_at' | 'user'>,
  channel: Channel
) => {
  const readBy: UserResponse[] = [];
  const read = channel.state.read;
  Object.keys(read).forEach((key) => {
    const lastRead = read[key].last_read;
    if (
      lastRead !== undefined &&
      lastRead !== null &&
      lastRead >= message.created_at &&
      message.user?.id !== key
    ) {
      readBy.push(read[key].user);
    }
  });

  return readBy;
};
