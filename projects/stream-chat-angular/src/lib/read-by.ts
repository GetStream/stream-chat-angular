import { Channel, FormatMessageResponse, UserResponse } from 'stream-chat';
import { DefaultStreamChatGenerics } from './types';

export const getReadBy = <
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
>(
  message: FormatMessageResponse<T>,
  channel: Channel<T>
) => {
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
