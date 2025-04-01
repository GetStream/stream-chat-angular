import { Channel, LocalMessage, UserResponse } from 'stream-chat';

export const getReadBy = (message: LocalMessage, channel: Channel) => {
  const readBy: UserResponse[] = [];
  Object.keys(channel.state.read).forEach((key) => {
    if (
      channel.state.read[key].last_read.getTime() >=
        message.created_at.getTime() &&
      message.user?.id !== key
    ) {
      readBy.push(channel.state.read[key].user);
    }
  });

  return readBy;
};
