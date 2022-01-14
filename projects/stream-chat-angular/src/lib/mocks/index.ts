import { DefaultUserType, StreamMessage } from '../types';
import { BehaviorSubject, ReplaySubject, Subject } from 'rxjs';
import {
  AppSettings,
  Channel,
  ChannelMemberResponse,
  ChannelState,
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
  } as UserResponse<DefaultUserType>);

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

export type MockChannel = Channel & {
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
      handleEvent: (name: EventTypes, payload?: any) => {
        if (eventHandlers[name as string]) {
          eventHandlers[name as string](payload as StreamMessage);
        } else {
          eventHandlers['on'](payload);
        }
      },
      state: {
        messages: generateMockMessages(),
        threads: {},
        read: {},
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
    return channel;
  });
  return channels;
};

export type MockChannelService = {
  hasMoreChannels$: Subject<boolean>;
  channels$: Subject<Channel[] | undefined>;
  activeChannelMessages$: BehaviorSubject<StreamMessage[]>;
  activeChannel$: Subject<Channel>;
  activeThreadMessages$: BehaviorSubject<StreamMessage[]>;
  activeParentMessageId$: BehaviorSubject<string | undefined>;
  activeParentMessage$: BehaviorSubject<StreamMessage | undefined>;
  loadMoreMessages: () => void;
  loadMoreChannels: () => void;
  setAsActiveChannel: (c: Channel) => void;
  setAsActiveParentMessage: (m: StreamMessage | undefined) => void;
  loadMoreThreadReplies: () => void;
  autocompleteMembers: (s: string) => ChannelMemberResponse[];
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
  const activeChannel$ = new BehaviorSubject<Channel>({
    id: 'channelid',
    data: {
      own_capabilities: [
        'upload-file',
        'flag-message',
        'send-reaction',
        'update-any-message',
        'delete-any-message',
      ],
    },
    state: {
      members: {
        jack: { user: { id: 'jack', name: 'Jack' } },
        sara: { user: { id: 'sara', name: 'Sara' } },
        eddie: { user: { id: 'eddie' } },
      },
    } as any as ChannelState,
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
  } as Channel);
  const channels$ = new BehaviorSubject<Channel[] | undefined>(undefined);
  const hasMoreChannels$ = new ReplaySubject<boolean>(1);

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
  };
};

export type MockStreamChatClient = {
  appSettings$: Subject<AppSettings>;
  user: UserResponse;
  connectUser: jasmine.Spy;
  on: (name: EventTypes, handler: () => {}) => void;
  handleEvent: (name: EventTypes, event: Event) => void;
  flagMessage: jasmine.Spy;
  setUserAgent: jasmine.Spy;
  queryUsers: jasmine.Spy;
  getUserAgent: () => string;
  getAppSettings: jasmine.Spy;
  disconnectUser: jasmine.Spy;
};

export const mockStreamChatClient = (): MockStreamChatClient => {
  const eventHandlers: { [key: string]: Function } = {};
  /* eslint-disable jasmine/no-unsafe-spy */
  const connectUser = jasmine.createSpy();
  const flagMessage = jasmine.createSpy();
  const setUserAgent = jasmine.createSpy();
  const queryUsers = jasmine.createSpy();
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
  /* eslint-enable jasmine/no-unsafe-spy */
  const user = mockCurrentUser();
  const on = (name: EventTypes | Function, handler: () => {}) => {
    if (typeof name === 'string') {
      eventHandlers[name as string] = handler;
    } else {
      eventHandlers['all'] = name;
    }
  };
  const handleEvent = (name: EventTypes, event: Event) => {
    if (eventHandlers[name as string]) {
      eventHandlers[name as string](event);
    } else {
      eventHandlers['all']({ ...event, type: name });
    }
  };
  const getUserAgent = () => 'stream-chat-javascript-client-browser-2.2.2';
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
  };
};

export type Spied<T> = {
  [x in keyof T]: jasmine.Spy;
};
