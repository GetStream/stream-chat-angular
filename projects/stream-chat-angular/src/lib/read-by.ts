import { Channel, nsToDate, UserResponse } from 'stream-chat';
import { MessageWithDates } from './types';

export const getReadBy = (
  message: Pick<MessageWithDates, 'created_at' | 'user'>,
  channel: Channel
) => {
  const readBy: UserResponse[] = [];
  const read = channel.state.read;
  Object.keys(read).forEach((key) => {
    const lastRead = read[key].last_read;
    if (
      lastRead !== undefined &&
      lastRead !== null &&
      nsToDate(lastRead).getTime() >= message.created_at.getTime() &&
      message.user?.id !== key
    ) {
      readBy.push(read[key].user);
    }
  });

  return readBy;
};
