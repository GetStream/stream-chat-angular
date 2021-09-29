import { DefaultUserType, StreamMessage } from '../types';
import { BehaviorSubject, Subject } from 'rxjs';
import { Channel, UserResponse } from 'stream-chat';

export const mockCurrentUser = () =>
  ({
    id: 'currentUser',
    name: 'Bob',
    image: 'link/to/photo',
  } as UserResponse<DefaultUserType>);

export const mockMessage = () =>
  ({
    id: 'id',
    text: 'Hello from Angular SDK',
    user: mockCurrentUser(),
    type: 'regular',
    status: 'received',
    created_at: new Date('2021-09-14T13:08:30.004112Z'),
    readBy: [{ id: 'alice', name: 'Alice' }],
  } as any as StreamMessage);

const generateMessages = (offset = 0, isOlder = false) => {
  const messages = new Array(25).fill(null).map((_, index) => {
    const message = mockMessage();
    message.created_at = new Date(
      message.created_at.getUTCMilliseconds() +
        (isOlder ? -1 : 1) * (index + offset)
    );
    message.id = index.toString() + offset.toString();
    return message;
  });

  return messages;
};

export type MockChannelService = {
  activeChannelMessages$: BehaviorSubject<StreamMessage[]>;
  activeChannel$: Subject<Channel>;
  loadMoreMessages: () => void;
};

export const mockChannelService = (): MockChannelService => {
  const messages = generateMessages();
  const activeChannelMessages$ = new BehaviorSubject<StreamMessage[]>(messages);
  const activeChannel$ = new BehaviorSubject<Channel>({
    id: 'channelid',
  } as Channel);

  const loadMoreMessages = () => {
    const currentMessages = activeChannelMessages$.getValue();
    const messages = [
      ...generateMessages(currentMessages.length, true),
      ...currentMessages,
    ];
    activeChannelMessages$.next(messages);
  };

  return { activeChannelMessages$, activeChannel$, loadMoreMessages };
};
