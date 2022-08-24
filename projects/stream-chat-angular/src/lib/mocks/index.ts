import { DefaultStreamChatGenerics, StreamMessage } from '../types';
import { BehaviorSubject, ReplaySubject, Subject } from 'rxjs';
import {
  AppSettings,
  Channel,
  ChannelMemberResponse,
  Event,
  EventTypes,
  MessageResponse,
  UserResponse,
} from 'stream-chat';

export const mockCurrentUser = () =>
  ({
    id: 'currentUser',
    name: 'Bob',
    image: 'link/to/photo',
  } as UserResponse<DefaultStreamChatGenerics>);

export const mockMessage = () =>
  ({
    id: 'id',
    text: 'Hello from Angular SDK',
    user: mockCurrentUser(),
    type: 'regular',
    status: 'received',
    created_at: new Date('2021-09-14T13:08:30.004112Z'),
    updated_at: new Date('2021-09-14T13:08:30.004112Z'),
    readBy: [{ id: 'alice', name: 'Alice' }],
  } as any as StreamMessage);

export const generateMockMessages = (offset = 0, isOlder = false) => {
  const messages = Array.from({ length: 25 }, (_, index) => {
    const message = mockMessage();
    message.created_at = new Date(
      message.created_at.getUTCMilliseconds() +
        (isOlder ? -1 : 1) * (index + offset)
    );
    message.id = (index + offset).toString();
    return message;
  });

  return messages;
};

export type MockChannel = Channel<DefaultStreamChatGenerics> & {
  handleEvent: (name: EventTypes, payload?: any) => void;
};

export const generateMockChannels = (length = 25) => {
  const channels = Array.from({ length }, (_, index) => {
    const eventHandlers: { [key: string]: Function } = {};
    const channel = {
      cid: 'cid' + index.toString(),
      id: index.toString(),
      data: {
        id: index.toString(),
        name: `Channel${index}`,
        image: 'link/to/image',
        own_capabilities: [
          'upload-file',
          'flag-message',
          'send-reaction',
          'update-any-message',
          'delete-any-message',
          'read-events',
          'send-links',
          'send-message',
          'typing-events',
        ],
      },
      on: (arg1: EventTypes | Function, handler: () => {}) => {
        eventHandlers[typeof arg1 === 'string' ? (arg1 as string) : 'on'] =
          handler || arg1;
        return {
          unsubscribe: () =>
            (eventHandlers[typeof arg1 === 'string' ? (arg1 as string) : 'on'] =
              () => {}),
        };
      },
      watch: () => {},
      sendMessage: () => {},
      sendImage: () => {},
      sendFile: () => {},
      sendAction: () => {},
      deleteImage: () => {},
      deleteFile: () => {},
      countUnread: () => {},
      markRead: () => {},
      getReplies: () => {},
      keystroke: () => {},
      stopTyping: () => {},
      handleEvent: (name: EventTypes, payload?: any) => {
        if (eventHandlers[name as string]) {
          eventHandlers[name as string](payload as StreamMessage);
        } else {
          eventHandlers['on'](payload);
        }
      },
      state: {
        messages: generateMockMessages(),
        pinnedMessages: [],
        threads: {},
        read: {},
        members: {
          jack: { user: { id: 'jack', name: 'Jack' } },
          sara: { user: { id: 'sara', name: 'Sara' } },
          eddie: { user: { id: 'eddie' } },
        },
        addMessageSorted: function (response: MessageResponse) {
          if (response.parent_id) {
            if (
              (this.threads as { [key: string]: StreamMessage[] })[
                response.parent_id
              ]
            ) {
              (this.threads as { [key: string]: StreamMessage[] })[
                response.parent_id
              ].push(response as any as StreamMessage);
            } else {
              (this.threads as { [key: string]: StreamMessage[] })[
                response.parent_id
              ] = [response as any as StreamMessage];
            }
          } else {
            this.messages.push(response as any as StreamMessage);
          }
        },
        removeMessage: () => {},
        loadMessageIntoState: function (
          messageId: string,
          parentMessageId: string
        ) {
          const surroundingMessages = generateMockMessages();
          const loadedMessage =
            surroundingMessages[Math.round(surroundingMessages.length / 2)];
          loadedMessage.id = parentMessageId || messageId;
          this.messages = surroundingMessages;
          if (parentMessageId) {
            const surroundingThreadMessages = generateMockMessages();
            const loadedThreadMessage =
              surroundingThreadMessages[
                Math.round(surroundingThreadMessages.length / 2)
              ];
            loadedThreadMessage.id = messageId;
            (this.threads as { [key: string]: StreamMessage[] })[
              parentMessageId
            ] = surroundingThreadMessages;
          }
          return Promise.resolve();
        },
      },
      query: () => {
        return {
          messages: generateMockMessages(channel.state.messages.length),
        };
      },
      sendReaction: () => {},
      deleteReaction: () => {},
      queryMembers: () => ({
        members: {
          jack: {
            user: {
              id: 'jack',
            },
          },
        },
      }),
      getConfig: () => ({
        commands: [
          {
            args: '[text]',
            description: 'Post a random gif to the channel',
            name: 'giphy',
            set: 'fun_set',
          },
        ],
      }),
    } as any as MockChannel;
    channel.state.latestMessages = channel.state.messages;

    return channel;
  });
  return channels;
};

export type MockChannelService = {
  hasMoreChannels$: Subject<boolean>;
  channels$: Subject<Channel<DefaultStreamChatGenerics>[] | undefined>;
  activeChannelMessages$: BehaviorSubject<StreamMessage[]>;
  activeChannel$: Subject<Channel<DefaultStreamChatGenerics>>;
  activeThreadMessages$: BehaviorSubject<StreamMessage[]>;
  activeParentMessageId$: BehaviorSubject<string | undefined>;
  activeParentMessage$: BehaviorSubject<StreamMessage | undefined>;
  usersTypingInChannel$: BehaviorSubject<UserResponse[]>;
  usersTypingInThread$: BehaviorSubject<UserResponse[]>;
  jumpToMessage$: BehaviorSubject<{ id?: string; parentId?: string }>;
  loadMoreMessages: (d: 'older' | 'newer') => void;
  loadMoreChannels: () => void;
  setAsActiveChannel: (c: Channel) => void;
  setAsActiveParentMessage: (m: StreamMessage | undefined) => void;
  loadMoreThreadReplies: (d: 'older' | 'newer') => void;
  autocompleteMembers: (s: string) => ChannelMemberResponse[];
  jumpToMessage: (id: string, parentId?: string) => void;
};

export const mockChannelService = (): MockChannelService => {
  const messages = generateMockMessages();
  const activeChannelMessages$ = new BehaviorSubject<StreamMessage[]>(messages);
  const activeThreadMessages$ = new BehaviorSubject<StreamMessage[]>([]);
  const activeParentMessageId$ = new BehaviorSubject<undefined | string>(
    undefined
  );
  const activeParentMessage$ = new BehaviorSubject<undefined | StreamMessage>(
    undefined
  );
  const usersTypingInChannel$ = new BehaviorSubject<UserResponse[]>([]);
  const usersTypingInThread$ = new BehaviorSubject<UserResponse[]>([]);
  const activeChannel = generateMockChannels(1)[0];
  const activeChannel$ = new BehaviorSubject<
    Channel<DefaultStreamChatGenerics>
  >(activeChannel);
  const channels$ = new BehaviorSubject<
    Channel<DefaultStreamChatGenerics>[] | undefined
  >(undefined);
  const hasMoreChannels$ = new ReplaySubject<boolean>(1);
  const jumpToMessage$ = new BehaviorSubject<{
    id?: string;
    parentId?: string;
  }>({ id: undefined, parentId: undefined });

  const autocompleteMembers = () => [
    { user: { id: 'jack', name: 'Jack' } },
    { user: { id: 'sara', name: 'Sara' } },
    { user: { id: 'eddie' } },
  ];

  const loadMoreMessages = () => {
    const currentMessages = activeChannelMessages$.getValue();
    const messages = [
      ...generateMockMessages(currentMessages.length, true),
      ...currentMessages,
    ];
    activeChannelMessages$.next(messages);
  };

  const loadMoreThreadReplies = () => {
    const currentMessages = activeThreadMessages$.getValue();
    const messages = [
      ...generateMockMessages(currentMessages.length, true),
      ...currentMessages,
    ];
    activeThreadMessages$.next(messages);
  };

  const loadMoreChannels = () => {};
  const setAsActiveParentMessage = () => {};
  const setAsActiveChannel = (channel: Channel) => {
    channel;
  };

  const jumpToMessage = () => {};

  return {
    activeChannelMessages$,
    activeChannel$,
    loadMoreMessages,
    channels$,
    hasMoreChannels$,
    loadMoreChannels,
    setAsActiveChannel,
    autocompleteMembers,
    activeParentMessageId$,
    activeThreadMessages$,
    activeParentMessage$,
    loadMoreThreadReplies,
    setAsActiveParentMessage,
    usersTypingInChannel$,
    usersTypingInThread$,
    jumpToMessage$,
    jumpToMessage,
  };
};

export type MockStreamChatClient = {
  appSettings$: Subject<AppSettings>;
  user: UserResponse;
  connectUser: jasmine.Spy;
  setGuestUser: jasmine.Spy;
  on: (name: EventTypes, handler: () => {}) => { unsubscribe: () => void };
  handleEvent: (name: EventTypes, event: Event) => void;
  flagMessage: jasmine.Spy;
  setUserAgent: jasmine.Spy;
  queryUsers: jasmine.Spy;
  getUserAgent: jasmine.Spy;
  getAppSettings: jasmine.Spy;
  disconnectUser: jasmine.Spy;
  queryChannels: jasmine.Spy;
};

export const mockStreamChatClient = (): MockStreamChatClient => {
  const eventHandlers: { [key: string]: Function } = {};
  /* eslint-disable jasmine/no-unsafe-spy */
  const connectUser = jasmine.createSpy();
  const setGuestUser = jasmine.createSpy();
  const flagMessage = jasmine.createSpy();
  const setUserAgent = jasmine.createSpy();
  const queryUsers = jasmine.createSpy();
  const queryChannels = jasmine.createSpy().and.returnValue([]);
  const getAppSettings = jasmine.createSpy().and.returnValue({
    app: {
      file_upload_config: {
        allowed_file_extensions: [],
        allowed_mime_types: [],
        blocked_file_extensions: [],
        blocked_mime_types: [],
      },
      image_upload_config: {
        allowed_file_extensions: [],
        allowed_mime_types: [],
        blocked_file_extensions: [],
        blocked_mime_types: [],
      },
    },
  });
  const disconnectUser = jasmine.createSpy();
  const getUserAgent = jasmine
    .createSpy()
    .and.returnValue('stream-chat-javascript-client-browser-2.2.2');
  /* eslint-enable jasmine/no-unsafe-spy */
  const user = mockCurrentUser();
  const on = (name: EventTypes | Function, handler: () => {}) => {
    if (typeof name === 'string') {
      eventHandlers[name as string] = handler;
    } else {
      eventHandlers['all'] = name;
    }
    return {
      unsubscribe: () =>
        delete eventHandlers[typeof name === 'string' ? name : 'all'],
    };
  };
  const handleEvent = (name: EventTypes, event: Event) => {
    if (eventHandlers[name as string]) {
      eventHandlers[name as string](event);
    } else if (eventHandlers['all']) {
      eventHandlers['all']({ ...event, type: name });
    }
  };
  const appSettings$ = new Subject<AppSettings>();

  return {
    connectUser,
    disconnectUser,
    user,
    on,
    handleEvent,
    flagMessage,
    getUserAgent,
    setUserAgent,
    queryUsers,
    getAppSettings,
    appSettings$,
    queryChannels,
    setGuestUser,
  };
};

export type Spied<T> = {
  [x in keyof T]: jasmine.Spy;
};
