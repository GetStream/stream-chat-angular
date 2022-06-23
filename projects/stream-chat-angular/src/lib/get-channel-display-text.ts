import { Channel, UserResponse } from 'stream-chat';
import { listUsers } from './list-users';
import { DefaultStreamChatGenerics } from './types';

export const getChannelDisplayText = (
  channel: Channel<DefaultStreamChatGenerics>,
  currentUser: UserResponse<DefaultStreamChatGenerics>
) => {
  if (channel.data?.name) {
    return channel.data.name;
  }
  if (channel.state.members && Object.keys(channel.state.members).length > 0) {
    const members = Object.values(channel.state.members)
      .map((m) => m.user || { id: m.user_id! })
      .filter((m) => m.id !== currentUser?.id);
    return listUsers(members);
  }
  return channel.id;
};
