import { DefaultUserType, StreamMessage } from '../types';
import { BehaviorSubject, ReplaySubject, Subject } from 'rxjs';
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

const generateMockMessages = (offset = 0, isOlder = false) => {
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

export const generateMockChannels = () => {
  /* eslint-disable @typescript-eslint/unbound-method */
  const channels = new Array(25)
    .fill(null)
    .map(
      (_, index) =>
        ({ id: index.toString, name: `Channel${index}` } as any as Channel)
    );
  /* eslint-enable @typescript-eslint/unbound-method */
  return channels;
};

export type MockChannelService = {
  hasMoreChannels$: Subject<boolean>;
  channels$: Subject<Channel[] | undefined>;
  activeChannelMessages$: BehaviorSubject<StreamMessage[]>;
  activeChannel$: Subject<Channel>;
  loadMoreMessages: () => void;
  loadMoreChannels: () => void;
};

export const mockChannelService = (): MockChannelService => {
  const messages = generateMockMessages();
  const activeChannelMessages$ = new BehaviorSubject<StreamMessage[]>(messages);
  const activeChannel$ = new BehaviorSubject<Channel>({
    id: 'channelid',
  } as Channel);
  const channels$ = new BehaviorSubject<Channel[] | undefined>(undefined);
  const hasMoreChannels$ = new ReplaySubject<boolean>(1);

  const loadMoreMessages = () => {
    const currentMessages = activeChannelMessages$.getValue();
    const messages = [
      ...generateMockMessages(currentMessages.length, true),
      ...currentMessages,
    ];
    activeChannelMessages$.next(messages);
  };

  const loadMoreChannels = () => {};

  return {
    activeChannelMessages$,
    activeChannel$,
    loadMoreMessages,
    channels$,
    hasMoreChannels$,
    loadMoreChannels,
  };
};
