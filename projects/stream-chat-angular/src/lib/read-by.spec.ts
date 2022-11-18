import { Channel, FormatMessageResponse } from 'stream-chat';
import { getReadBy } from './read-by';
import { DefaultStreamChatGenerics } from './types';

describe('getReadBy', () => {
  it('should return the users that have already read the provided #message', () => {
    const sender = { id: 'sender', name: 'Tess' };

    const message = {
      created_at: new Date('2021-09-14T13:08:30.004112Z'),
      user: sender,
    } as FormatMessageResponse<DefaultStreamChatGenerics>;
    const channel = {
      state: { read: {} },
    } as Channel<DefaultStreamChatGenerics>;

    expect(getReadBy(message, channel).length).toBe(0);

    channel.state.read = {
      id1: {
        last_read: new Date('2021-09-14T13:08:33.004112Z'),
        user: {
          id: 'id1',
          name: 'John',
        },
        unread_messages: 2,
      },
      sender: {
        last_read: new Date('2021-09-14T13:09:01.004112Z'),
        user: sender,
        unread_messages: 2,
      },
      id2: {
        last_read: new Date('2021-09-14T13:05:30.004112Z'),
        user: {
          id: 'id2',
          name: 'Alice',
        },
        unread_messages: 2,
      },
      id3: {
        last_read: new Date('2021-09-14T13:08:30.004112Z'),
        user: {
          id: 'id3',
          name: 'Bob',
        },
        unread_messages: 2,
      },
    };
    const result = getReadBy(message, channel);

    expect(result.length).toBe(2);
    expect(result.find((i) => i.id === 'id1')).toBeDefined();
    expect(result.find((i) => i.id === 'id3')).toBeDefined();
    expect(result.find((i) => i.id === sender.id)).toBeUndefined();
  });
});
