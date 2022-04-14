import { Channel } from 'stream-chat';
import { getChannelDisplayText } from './get-channel-display-text';
import { listUsers } from './list-users';
import { DefaultStreamChatGenerics } from './types';

describe('getChannelDisplayText', () => {
  it('should display channel name if it is defined', () => {
    const currentUser = { id: 'hobby-chef2' };
    const channel = {
      data: {
        id: 'hobby-chefs',
        name: 'Hobby Chefs🧁🥩🥗🥑🥘',
        members: [{ id: 'hobby-chef1' }, { id: 'hobby-chef2' }],
      },
    } as any as Channel<DefaultStreamChatGenerics>;

    expect(getChannelDisplayText(channel, currentUser)).toBe(
      'Hobby Chefs🧁🥩🥗🥑🥘'
    );
  });

  it('should display member list if channel name is undefined', () => {
    const members = [
      { id: 'hobby-chef1', name: 'Gordon' },
      { id: 'hobby-chef2' },
    ];
    const currentUser = { id: 'hobby-chef3' };
    const channel = {
      data: {
        id: 'hobby-chefs',
        name: undefined,
      },
      state: {
        members: {
          [members[0].id]: { user: members[0] },
          [members[1].id]: { user: members[1] },
          [currentUser.id]: { user: currentUser },
        },
      },
    } as Channel<DefaultStreamChatGenerics>;

    expect(getChannelDisplayText(channel, currentUser)).toBe(
      listUsers(members)
    );
  });

  it(`it shouldn't list current user as a member`, () => {
    const members = [
      { id: 'hobby-chef1', name: 'Gordon' },
      { id: 'hobby-chef2' },
    ];
    const currentUser = { id: 'hobby-chef3' };
    const channel = {
      data: {
        id: 'hobby-chefs',
        name: undefined,
      },
      state: {
        members: {
          [members[0].id]: { user: members[0] },
          [members[1].id]: { user: members[1] },
          [currentUser.id]: { user: currentUser },
        },
      },
    } as Channel<DefaultStreamChatGenerics>;

    expect(getChannelDisplayText(channel, currentUser)).not.toContain(
      currentUser.id
    );
  });

  it('should display id if neither name nor members exist', () => {
    const currentUser = { id: 'hobby-chef2' };
    const channel = {
      id: 'hobby-chefs',
      data: {
        id: 'hobby-chefs',
        name: undefined,
      },
      state: {
        members: {},
      },
    } as Channel<DefaultStreamChatGenerics>;

    expect(getChannelDisplayText(channel, currentUser)).toBe('hobby-chefs');

    channel.data!.members = [];

    expect(getChannelDisplayText(channel, currentUser)).toBe('hobby-chefs');
  });
});
