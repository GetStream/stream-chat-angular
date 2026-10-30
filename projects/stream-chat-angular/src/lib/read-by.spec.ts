import {
  Channel,
  dateToNs,
  MessageReceiptsTracker,
  ReadStateResponse,
} from 'stream-chat';
import { StreamMessage } from './types';
import { getReadBy } from './read-by';

describe('getReadBy', () => {
  const createChannel = (read: ReadStateResponse[]) => {
    const channel = { getClient: () => ({ userId: 'sender' }) } as Channel;
    // Every read cursor is resolved to a message, so the cursors are compared by timestamp
    const tracker = new MessageReceiptsTracker({
      channel,
      locateMessage: (timestamp) => ({ timestamp, msgId: 'message' }),
    });
    tracker.ingestInitial(read);
    Object.assign(channel, { messageReceiptsTracker: tracker });
    return channel;
  };
  const sender = { id: 'sender', name: 'Tess' };
  const message = {
    id: 'message',
    created_at: dateToNs(new Date('2021-09-14T13:08:30.004112Z')),
    user: sender,
  } as unknown as StreamMessage;

  it('should return the users that have already read the provided #message', () => {
    expect(getReadBy(message, createChannel([])).length).toBe(0);

    const channel = createChannel([
      {
        last_read: dateToNs(new Date('2021-09-14T13:08:33.004112Z')),
        user: { id: 'id1', name: 'John' },
        unread_messages: 2,
      },
      {
        last_read: dateToNs(new Date('2021-09-14T13:09:01.004112Z')),
        user: sender,
        unread_messages: 2,
      },
      {
        last_read: dateToNs(new Date('2021-09-14T13:05:30.004112Z')),
        user: { id: 'id2', name: 'Alice' },
        unread_messages: 2,
      },
      {
        last_read: dateToNs(new Date('2021-09-14T13:08:30.004112Z')),
        user: { id: 'id3', name: 'Bob' },
        unread_messages: 2,
      },
    ] as unknown as ReadStateResponse[]);
    const result = getReadBy(message, channel);

    expect(result.length).toBe(2);
    expect(result.find((i) => i.id === 'id1')).toBeDefined();
    expect(result.find((i) => i.id === 'id3')).toBeDefined();
    expect(result.find((i) => i.id === sender.id)).toBeUndefined();
  });

  it('should handle null last_read values gracefully', () => {
    const channel = createChannel([
      {
        last_read: dateToNs(new Date('2021-09-14T13:08:33.004112Z')),
        user: { id: 'id1', name: 'John' },
        unread_messages: 2,
      },
      {
        last_read: null,
        user: { id: 'id2', name: 'Alice' },
        unread_messages: 2,
      },
      {
        last_read: dateToNs(new Date('2021-09-14T13:08:30.004112Z')),
        user: { id: 'id3', name: 'Bob' },
        unread_messages: 2,
      },
    ] as unknown as ReadStateResponse[]);
    const result = getReadBy(message, channel);

    expect(result.length).toBe(2);
    expect(result.find((i) => i.id === 'id1')).toBeDefined();
    expect(result.find((i) => i.id === 'id3')).toBeDefined();
    expect(result.find((i) => i.id === 'id2')).toBeUndefined();
  });
});
