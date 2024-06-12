import {
  ChannelQueryState,
  DefaultStreamChatGenerics,
  StreamMessage,
} from '../types';
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
    total_unread_count: 0,
  } as UserResponse<DefaultStreamChatGenerics>);

export const mockMessage = (id?: number) =>
  ({
    id: id === undefined ? 'id' : `id${id}`,
    text: 'Hello from Angular SDK',
    user: mockCurrentUser(),
    user_id: mockCurrentUser().id,
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
  handleEvent: (
    name: EventTypes | 'capabilities.changed',
    payload?: any
  ) => void;
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
      stopWatching: () => {},
      sendMessage: (m: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return Promise.resolve({ message: m });
      },
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
      getReactions: () => {},
      markUnread: () => {},
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
          if (!response) {
            return;
          }
          let array: StreamMessage[];
          const message = response as any as StreamMessage;
          const threads = this.threads as { [key: string]: StreamMessage[] };
          if (message.parent_id) {
            if (threads[message.parent_id]) {
              array = threads[message.parent_id];
            } else {
              array = [];
              threads[message.parent_id] = array;
            }
          } else {
            array = this.messages;
          }
          const existingMessageIndex = array.findIndex((m) =>
            message.id
              ? m.id === message.id
              : m.created_at === message.created_at
          );
          if (existingMessageIndex === -1) {
            array.push(message);
          } else {
            array[existingMessageIndex] = message;
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
        return Promise.resolve({
          messages: generateMockMessages(channel.state.messages.length),
        });
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
  channelQueryState$: BehaviorSubject<ChannelQueryState | undefined>;
  activeChannelLastReadMessageId?: string;
  activeChannelUnreadCount?: number;
  activeChannel?: Channel<DefaultStreamChatGenerics>;
  loadMoreMessages: (
    d: 'older' | 'newer'
  ) => Promise<{ messages: StreamMessage[] }>;
  loadMoreChannels: () => void;
  setAsActiveChannel: (c: Channel) => void;
  setAsActiveParentMessage: (m: StreamMessage | undefined) => void;
  loadMoreThreadReplies: (d: 'older' | 'newer') => void;
  autocompleteMembers: (s: string) => ChannelMemberResponse[];
  jumpToMessage: (id: string, parentId?: string) => void;
  clearMessageJump: () => void;
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
    return Promise.resolve({ messages });
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

  const clearMessageJump = () => {};

  const channelQueryState$ = new BehaviorSubject<ChannelQueryState | undefined>(
    undefined
  );

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
    clearMessageJump,
    channelQueryState$,
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
  connectAnonymousUser: jasmine.Spy;
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
  const connectAnonymousUser = jasmine.createSpy();
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
    connectAnonymousUser,
  };
};

export type Spied<T> = {
  [x in keyof T]: jasmine.Spy;
};

export const mockVoiceRecording = {
  type: 'voiceRecording',
  title: '99831FB3-5E35-41CD-8286-7A2E95A78FDC.aac',
  asset_url:
    'https://us-east.stream-io-cdn.com/102399/attachments/7389dd4b-001f-43c9-8fe3-ba38930202e3.messaging-7B537E48-D-879666ea-5e07-499d-.aac?Key-Pair-Id=APKAIHG36VEWPDULE23Q&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly91cy1lYXN0LnN0cmVhbS1pby1jZG4uY29tLzEwMjM5OS9hdHRhY2htZW50cy83Mzg5ZGQ0Yi0wMDFmLTQzYzktOGZlMy1iYTM4OTMwMjAyZTMubWVzc2FnaW5nLTdCNTM3RTQ4LUQtODc5NjY2ZWEtNWUwNy00OTlkLS5hYWMqIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzExOTgyMzIyfX19XX0_&Signature=dfonQbBUmN04RHp2EiZ2cF8sYIKxaQ90jp8IgsLHQk8TidwhSdkANANqQV9mtkhQf~NhZ3AysJUCOWtG0HJHIaNHqp8ezaeqmTZE01BqyVrNgiJrrn-8v1pCwKmm73jroi3zgmTprjwnXmEqXkUSDfhtiYYW20ckfcdI7tfPN1rCqWE9txWumoRsVaVOu2i3HUqbTVb7h~gn7624mgAx4eX2in4koM29ovck5-o5zEbw~En8-u7zAllNEYRQ8JPHQgvOojfAMPUXeLdnbXDX2uft9-FlIHRkrzTglPRM6sBCJWLRRM3GNBE2OwraVXUJHSYgbugNat7xyd6StUH11Q__',
  waveform_data: [
    0.18580253422260284, 0.22792305052280426, 0.23014479875564575,
    0.2215365618467331, 0.280057817697525, 0.24526794254779816,
    0.23399925231933594, 0.3128012716770172, 0.37945452332496643,
    0.33992674946784973, 0.33231520652770996, 0.35996779799461365,
    0.24952147901058197, 0.2771506607532501, 0.18567748367786407,
    0.2669936418533325, 0.2318495213985443, 0.266754150390625,
    0.24599547684192657, 0.22025825083255768, 0.2574225664138794,
    0.2297886610031128, 0.21858176589012146, 0.22855964303016663,
    0.21926963329315186, 0.1592704802751541, 0.17932571470737457,
    0.17183426022529602, 0.16925041377544403, 0.17725585401058197,
    0.20863258838653564, 0.15763725340366364, 0.17838287353515625,
    0.2596689462661743, 0.2821672856807709, 0.2308555543422699,
    0.21800407767295837, 0.237264484167099, 0.24341285228729248,
    0.21091987192630768, 0.22752471268177032, 0.28887689113616943,
    0.25566428899765015, 0.2714449167251587, 0.30015745759010315,
    0.2883681356906891, 0.28020721673965454, 0.21566811203956604,
    0.2041303962469101, 0.1856091320514679, 0.22570304572582245,
    0.22362418472766876, 0.18938171863555908, 0.2105405479669571,
    0.22487449645996094, 0.2667095959186554, 0.29159706830978394,
    0.2825489938259125, 0.2347666174173355, 0.2768406569957733,
    0.2953290641307831, 0.26249200105667114, 0.3034127950668335,
    0.26899436116218567, 0.2931807041168213, 0.24274344742298126,
    0.23544998466968536, 0.29423996806144714, 0.2060961127281189,
    0.05098915100097656, 0.0063146972097456455, 0.015633393079042435,
    0.03022758476436138, 0.026124343276023865, 0.014958725310862064,
    0.01488060038536787, 0.0297449491918087, 0.046876221895217896,
    0.016678161919116974, 0.030463561415672302, 0.022851256653666496,
    0.040972135961055756, 0.050609588623046875, 0.04940780624747276,
    0.04304153472185135, 0.08744628727436066, 0.0762052908539772,
    0.0801474004983902, 0.0818980410695076, 0.08521285653114319,
    0.07830711454153061, 0.07637504488229752, 0.09124496579170227,
    0.16371025145053864, 0.08206146210432053, 0.0569305419921875,
    0.043944090604782104, 0.07224594056606293, 0.06922554224729538,
    5.340576194612368e-7,
  ],
  duration: 21.07675,
  file_size: 56504,
  mime_type: 'audio/aac',
};
