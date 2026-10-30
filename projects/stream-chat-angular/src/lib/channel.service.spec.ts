import { TestBed } from '@angular/core/testing';
import { Observable, Subject } from 'rxjs';
import { first, take } from 'rxjs/operators';
import {
  Attachment,
  Channel,
  ChannelMemberResponse,
  CustomMessageData,
  ChannelOptions,
  dateToNs,
  nsToDate,
  Event,
  LocalMessage,
  ReactionResponse,
  SortParamRequest,
  StreamAPIError,
  UpdateMessagePartialRequest,
  UserResponse,
} from 'stream-chat';
import { ChannelService } from './channel.service';
import { ChatClientService, ClientEvent } from './chat-client.service';
import {
  generateMockChannels,
  generateMockLocalMessages,
  MockChannel,
  mockCurrentUser,
  MockMessagePaginator,
  mockMessage,
  MockStateStore,
  mockStreamChatClient,
  MockStreamChatClient,
  MockThread,
} from './mocks';
import { NotificationService } from './notification.service';
import { toLocalMessage } from './local-message';
import { AttachmentUpload, MessageInput, StreamMessage } from './types';

// The error stream-chat v10 throws for API errors (see api-client.ts)
const apiError = (message: string, code = 4, status = 400) =>
  new StreamAPIError(message, {
    code,
    status,
    response: {
      data: { code, message, StatusCode: status },
      status,
    } as unknown as StreamAPIError['response'],
  });

type TestChatClient = Omit<
  MockStreamChatClient,
  'channel' | 'channelManager'
> & {
  channel: jasmine.Spy;
  channelManager: { get: jasmine.Spy };
  activeChannels: { [key: string]: Channel };
};

describe('ChannelService', () => {
  let service: ChannelService;
  let mockChatClient: TestChatClient;
  let events$: Subject<ClientEvent>;
  let logger: { warn: jasmine.Spy; error: jasmine.Spy; info: jasmine.Spy };
  let init: (
    c?: Channel[],
    sort?: SortParamRequest[],
    options?: ChannelOptions,
    mockChannelQuery?: Function,
    shouldSetActiveChannel?: boolean
  ) => Promise<Channel[]>;
  let user: UserResponse;
  const filters = { type: 'messaging' };

  const getActiveChannel = () => service.activeChannel as MockChannel;
  const getLatestValue = <T>(observable: Observable<T>) => {
    let value!: T;
    observable.pipe(take(1)).subscribe((v) => (value = v));
    return value;
  };
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
  const waitForMarkReadThrottle = () =>
    new Promise((resolve) => {
      setTimeout(resolve, service['markReadThrottleTime']);
    });
  const toLocal = (m: StreamMessage) => toLocalMessage(m);
  const mockPaginator = (c: Channel) =>
    c.messagePaginator as unknown as MockMessagePaginator;

  beforeEach(() => {
    user = mockCurrentUser();
    const client = mockStreamChatClient();
    const activeChannels: { [key: string]: Channel } = {};
    mockChatClient = {
      ...client,
      channel: jasmine.createSpy(),
      channelManager: {
        get: jasmine
          .createSpy()
          .and.callFake((cid: string) => activeChannels[cid]),
      },
      activeChannels,
    };
    mockChatClient.queryChannels.and.returnValue(generateMockChannels());
    events$ = new Subject();
    logger = {
      warn: jasmine.createSpy(),
      error: jasmine.createSpy(),
      info: jasmine.createSpy(),
    };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ChatClientService,
          useValue: {
            chatClient: mockChatClient,
            events$,
            logger,
          },
        },
        NotificationService,
      ],
    });
    service = TestBed.inject(ChannelService);
    init = async (
      channels?: Channel[],
      sort?: SortParamRequest[],
      options?: ChannelOptions,
      mockChannelQuery?: Function,
      shouldSetActiveChannel?: boolean
    ) => {
      if (mockChannelQuery) {
        mockChannelQuery();
      } else {
        mockChatClient.queryChannels.and.returnValue(
          channels || generateMockChannels()
        );
      }

      return service.init(filters, sort, options, shouldSetActiveChannel);
    };
  });

  it('should pass the provided sort params to stream-chat unchanged', async () => {
    const sort: SortParamRequest[] = [
      { field: 'last_message_at', direction: -1 },
    ];
    await init(undefined, sort);

    expect(
      mockChatClient.queryChannelsAndHydrate.calls.mostRecent().args[0].sort
    ).toBe(sort);

    mockChatClient.queryChannelsAndHydrate.calls.reset();
    service.reset();
    const multiFieldSort: SortParamRequest[] = [
      { field: 'pinned_at', direction: -1 },
      { field: 'updated_at', direction: 1 },
    ];
    await init(undefined, multiFieldSort);

    expect(mockChatClient.queryChannelsAndHydrate).toHaveBeenCalledWith(
      jasmine.objectContaining({
        sort: [
          { field: 'pinned_at', direction: -1 },
          { field: 'updated_at', direction: 1 },
        ],
      })
    );
  });

  it('should use default sort params', async () => {
    await init();

    expect(mockChatClient.queryChannelsAndHydrate).toHaveBeenCalledWith(
      jasmine.objectContaining({
        sort: [{ field: 'last_message_at', direction: -1 }],
      })
    );
  });

  it('should use provided options params', async () => {
    const options: ChannelOptions = { limit: 5 };
    await init(undefined, undefined, options);

    expect(mockChatClient.queryChannelsAndHydrate).toHaveBeenCalledWith(
      jasmine.objectContaining(options)
    );
  });

  it('should use provided filter params', async () => {
    await init();

    expect(mockChatClient.queryChannelsAndHydrate).toHaveBeenCalledWith(
      jasmine.objectContaining({ filter_conditions: filters })
    );
  });

  it('should register thread subscriptions and configure message paginators on init', async () => {
    await init(undefined, undefined, { message_limit: 40 });

    expect(mockChatClient.threads.registerSubscriptions).toHaveBeenCalledWith();
    expect(mockChatClient.config.setConfig).toHaveBeenCalledWith('channel', {
      messagePaginator: { pageSize: 40 },
    });
    expect(mockChatClient.config.setConfig).toHaveBeenCalledWith('thread', {
      messagePaginator: { pageSize: 40 },
    });
    expect(service.messagePageSize).toBe(40);
  });

  it('should emit #channels$', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    const mockChannels = generateMockChannels();

    const result = spy.calls.mostRecent().args[0] as Channel[];
    result.forEach((channel, index) => {
      expect(channel.cid).toEqual(mockChannels[index].cid);
    });
  });

  it('should return the result of the init', async () => {
    const notificationService = TestBed.inject(NotificationService);
    const notificationSpy = jasmine.createSpy();
    notificationService.notifications$.subscribe(notificationSpy);
    notificationSpy.calls.reset();
    const expectedResult = generateMockChannels();
    const result = await init(expectedResult);

    expect(result as any as MockChannel[]).toEqual(expectedResult);
    expect(notificationSpy).not.toHaveBeenCalled();
  });

  it('should return the result of the init - error', async () => {
    const notificationService = TestBed.inject(NotificationService);
    const notificationSpy = jasmine.createSpy();
    notificationService.notifications$.subscribe(notificationSpy);
    notificationSpy.calls.reset();
    const error = apiError('QueryChannels failed with error: "error"');

    await expectAsync(
      init(undefined, undefined, undefined, () =>
        mockChatClient.queryChannels.and.rejectWith(error)
      )
    ).toBeRejectedWith(error);

    expect(notificationSpy).toHaveBeenCalledWith(
      jasmine.arrayContaining([
        jasmine.objectContaining({
          type: 'error',
          text: 'streamChat.Error loading channels',
        }),
      ])
    );
  });

  it('should handle errors during channel load', async () => {
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    const activeChannelSpy = jasmine.createSpy();
    service.activeChannel$.subscribe(activeChannelSpy);

    await expectAsync(
      init(undefined, undefined, undefined, () =>
        mockChatClient.queryChannels.and.rejectWith(
          apiError('QueryChannels failed with error: "error"')
        )
      )
    ).toBeRejected();

    const channels = generateMockChannels();
    mockChatClient.queryChannels.and.resolveTo(channels);
    spy.calls.reset();
    activeChannelSpy.calls.reset();
    const notificationService = TestBed.inject(NotificationService);
    const notificationSpy = jasmine.createSpy();
    notificationService.notifications$.subscribe(notificationSpy);
    notificationSpy.calls.reset();
    events$.next({ eventType: 'connection.recovered' } as ClientEvent);
    await settle();

    expect(spy).toHaveBeenCalledWith(channels);
    expect(activeChannelSpy).toHaveBeenCalledWith(channels[0]);
    expect(notificationSpy).toHaveBeenCalledWith([]);
  });

  it('should emit channel query state correctly', async () => {
    const spy = jasmine.createSpy();
    service.channelQueryState$.subscribe(spy);

    await init();

    let calls = spy.calls.all();

    /* eslint-disable  @typescript-eslint/no-unsafe-member-access */
    expect(calls[1].args[0].state).toBe('in-progress');

    expect(calls[2].args[0].state).toBe('success');

    spy.calls.reset();
    const error = apiError('QueryChannels failed with error: "error"');

    await expectAsync(
      init(undefined, undefined, undefined, () =>
        mockChatClient.queryChannels.and.rejectWith(error)
      )
    ).toBeRejectedWith(error);

    calls = spy.calls.all();

    expect(calls[0].args[0]?.state).toBe('in-progress');

    expect(calls[1].args[0]).toEqual({
      state: 'error',
      error,
    });

    /* eslint-enable  @typescript-eslint/no-unsafe-member-access */
  });

  it('should set pagination options correctly if #customPaginator is provided', async () => {
    service.customPaginator = (channelQueryResult: Channel[]) => {
      const lastChannel = channelQueryResult[channelQueryResult.length - 1];
      if (!lastChannel) {
        return {
          type: 'filter',
          paginationFilter: {},
        };
      } else {
        return {
          type: 'filter',
          paginationFilter: {
            cid: { $gte: lastChannel.cid },
          },
        };
      }
    };

    await init();

    // @ts-expect-error we know channelQuery exists, TS doesn't
    expect(service['channelQuery']?.['nextPageConfiguration']).toEqual({
      type: 'filter',
      paginationFilter: {
        cid: { $gte: jasmine.any(String) },
      },
    });
  });

  it('should not set active channel if #shouldSetActiveChannel is false', async () => {
    const activeChannelSpy = jasmine.createSpy();
    service.activeChannel$.subscribe(activeChannelSpy);
    activeChannelSpy.calls.reset();
    await init(undefined, undefined, undefined, undefined, false);

    expect(activeChannelSpy).not.toHaveBeenCalled();
  });

  it('should reset', async () => {
    await init();
    const messagesSpy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(messagesSpy);
    const activeChannelSpy = jasmine.createSpy();
    service.activeChannel$.subscribe(activeChannelSpy);
    const channelsSpy = jasmine.createSpy();
    service.channels$.subscribe(channelsSpy);
    const messageToQuoteSpy = jasmine.createSpy();
    service.messageToQuote$.subscribe(messageToQuoteSpy);
    const latestMessagesSpy = jasmine.createSpy();
    service.latestMessageDateByUserByChannels$.subscribe(latestMessagesSpy);
    const jumpToMessageSpy = jasmine.createSpy();
    service.jumpToMessage$.subscribe(jumpToMessageSpy);
    const pinnedMessagesSpy = jasmine.createSpy();
    service.activeChannelPinnedMessages$.subscribe(pinnedMessagesSpy);
    const channelsQueryStateSpy = jasmine.createSpy();
    service.channelQueryState$.subscribe(channelsQueryStateSpy);
    messagesSpy.calls.reset();
    activeChannelSpy.calls.reset();
    channelsSpy.calls.reset();
    messageToQuoteSpy.calls.reset();
    latestMessagesSpy.calls.reset();
    jumpToMessageSpy.calls.reset();
    pinnedMessagesSpy.calls.reset();
    channelsQueryStateSpy.calls.reset();
    service.reset();

    expect(messagesSpy).toHaveBeenCalledWith([]);
    expect(channelsSpy).toHaveBeenCalledWith(undefined);
    expect(activeChannelSpy).toHaveBeenCalledWith(undefined);
    expect(messageToQuoteSpy).toHaveBeenCalledWith(undefined);
    expect(latestMessagesSpy).toHaveBeenCalledWith({});
    expect(pinnedMessagesSpy).toHaveBeenCalledWith([]);
    expect(channelsQueryStateSpy).toHaveBeenCalledWith(undefined);

    channelsSpy.calls.reset();
    events$.next({
      eventType: 'notification.message_new',
      event: {
        type: 'notification.message_new',
        channel: {
          id: 'channel',
          type: 'messaging',
          cid: 'messaging:channel',
        },
      } as unknown as Event,
    });
    await settle();

    expect(channelsSpy).not.toHaveBeenCalled();
  });

  it('should deselect active channel', async () => {
    await init();
    const activeChannel = getActiveChannel();
    const messagesSpy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(messagesSpy);
    const activeChannelSpy = jasmine.createSpy();
    service.activeChannel$.subscribe(activeChannelSpy);
    const messageToQuoteSpy = jasmine.createSpy();
    service.messageToQuote$.subscribe(messageToQuoteSpy);
    const latestMessagesSpy = jasmine.createSpy();
    service.latestMessageDateByUserByChannels$.subscribe(latestMessagesSpy);
    const jumpToMessageSpy = jasmine.createSpy();
    service.jumpToMessage$.subscribe(jumpToMessageSpy);
    const pinnedMessagesSpy = jasmine.createSpy();
    service.activeChannelPinnedMessages$.subscribe(pinnedMessagesSpy);
    const typingUsersSpy = jasmine.createSpy();
    service.usersTypingInChannel$.subscribe(typingUsersSpy);
    const typingUsersInThreadSpy = jasmine.createSpy();
    service.usersTypingInThread$.subscribe(typingUsersInThreadSpy);
    const paginationStateSpy = jasmine.createSpy();
    service.activeChannelMessagesPaginationState$.subscribe(paginationStateSpy);
    service.isMessageLoadingInProgress = true;
    messagesSpy.calls.reset();
    activeChannelSpy.calls.reset();
    messageToQuoteSpy.calls.reset();
    latestMessagesSpy.calls.reset();
    jumpToMessageSpy.calls.reset();
    pinnedMessagesSpy.calls.reset();
    typingUsersSpy.calls.reset();
    typingUsersInThreadSpy.calls.reset();
    paginationStateSpy.calls.reset();
    const channelSwitchStateSpy = jasmine.createSpy();
    service.channelSwitchState$.subscribe(channelSwitchStateSpy);
    channelSwitchStateSpy.calls.reset();
    spyOn(activeChannel.messagePaginator, 'setViewingLive');
    service.deselectActiveChannel();

    expect(messagesSpy).toHaveBeenCalledWith([]);
    expect(activeChannelSpy).toHaveBeenCalledWith(undefined);
    expect(messageToQuoteSpy).toHaveBeenCalledWith(undefined);
    expect(latestMessagesSpy).toHaveBeenCalledWith({});
    expect(jumpToMessageSpy).toHaveBeenCalledWith({
      id: undefined,
      parentId: undefined,
    });

    expect(pinnedMessagesSpy).toHaveBeenCalledWith([]);
    expect(typingUsersSpy).toHaveBeenCalledWith([]);
    expect(typingUsersInThreadSpy).toHaveBeenCalledWith([]);
    expect(paginationStateSpy).toHaveBeenCalledWith({
      hasMoreOlder: true,
      hasMoreNewer: false,
      isLoading: false,
      error: undefined,
    });
    expect(service.activeChannelLastReadMessageId).toBeUndefined();
    expect(service.activeChannelUnreadCount).toBeUndefined();
    expect(activeChannel.messagePaginator.setViewingLive).toHaveBeenCalledWith(
      false
    );

    messagesSpy.calls.reset();
    activeChannel.handleEvent('message.new', {
      message: toLocal(mockMessage()),
    });
    activeChannel.messagePaginator.ingestItem(toLocal(mockMessage(100)));

    expect(messagesSpy).not.toHaveBeenCalled();
    expect(service.isMessageLoadingInProgress).toBeFalse();

    expect(channelSwitchStateSpy.calls.count()).toBe(2);
    expect(channelSwitchStateSpy.calls.first().args[0]).toBe('start');
    expect(channelSwitchStateSpy.calls.mostRecent().args[0]).toBe('end');
  });

  it('should tell if user #hasMoreChannels$', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.hasMoreChannels$.subscribe(spy);

    expect(spy).toHaveBeenCalledWith(true);

    mockChatClient.queryChannels.and.callFake(() => {
      const channels = generateMockChannels();
      channels.pop();
      return channels;
    });
    spy.calls.reset();
    await service.loadMoreChannels();

    expect(spy).toHaveBeenCalledWith(false);
  });

  it('should load more channels and filter duplicates', async () => {
    await init();

    // Check that offset is set properly after query
    // @ts-expect-error we know channelQuery exists, TS doesn't
    expect(service['channelQuery']?.['nextPageConfiguration']).toEqual({
      type: 'offset',
      offset: service.channels.length,
    });

    mockChatClient.queryChannels.calls.reset();
    const existingChannel = service.channels[0];
    const newChannel = generateMockChannels(1)[0];
    newChannel.cid = 'this-channel-is-not-yet-loaded';
    mockChatClient.queryChannels.and.resolveTo([existingChannel, newChannel]);
    const prevChannelCount = service.channels.length;
    await service.loadMoreChannels();

    expect(mockChatClient.queryChannelsAndHydrate).toHaveBeenCalledWith(
      jasmine.objectContaining({
        filter_conditions: filters,
        offset: prevChannelCount,
      })
    );

    expect(service.channels.length).toEqual(prevChannelCount + 1);
  });

  it('should set active channel', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.activeChannel$.subscribe(spy);
    const pinnedMessagesSpy = jasmine.createSpy();
    service.activeChannelPinnedMessages$.subscribe(pinnedMessagesSpy);
    pinnedMessagesSpy.calls.reset();
    const mockChannels = generateMockChannels();

    let result = spy.calls.mostRecent().args[0] as Channel;

    expect(result.cid).toBe(mockChannels[0].cid);

    const messagesSpy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(messagesSpy);
    messagesSpy.calls.reset();
    const messageToQuoteSpy = jasmine.createSpy();
    service.messageToQuote$.subscribe(messageToQuoteSpy);
    messageToQuoteSpy.calls.reset();
    const typingUsersSpy = jasmine.createSpy();
    service.usersTypingInChannel$.subscribe(typingUsersSpy);
    typingUsersSpy.calls.reset();
    const typingUsersInThreadSpy = jasmine.createSpy();
    service.usersTypingInThread$.subscribe(typingUsersInThreadSpy);
    typingUsersInThreadSpy.calls.reset();
    const newActiveChannel = mockChannels[1];
    spyOn(newActiveChannel, 'markReadViaReporter').and.callThrough();
    const pinnedMessages = generateMockLocalMessages(100);
    newActiveChannel.pinnedMessagesPaginator.setItems(pinnedMessages);
    const channelSwitchStateSpy = jasmine.createSpy();
    service.channelSwitchState$.subscribe(channelSwitchStateSpy);
    channelSwitchStateSpy.calls.reset();
    service.setAsActiveChannel(newActiveChannel);
    result = spy.calls.mostRecent().args[0] as Channel;

    expect(result.cid).toBe(newActiveChannel.cid);
    expect(messagesSpy).toHaveBeenCalledWith(jasmine.any(Object));
    expect(
      (messagesSpy.calls.mostRecent().args[0] as StreamMessage[]).map(
        (m) => m.id
      )
    ).toEqual(newActiveChannel.messagePaginator.items!.map((m) => m.id));
    expect(newActiveChannel.markReadViaReporter).toHaveBeenCalledWith();
    expect(messageToQuoteSpy).toHaveBeenCalledWith(undefined);
    expect(
      (pinnedMessagesSpy.calls.mostRecent().args[0] as StreamMessage[]).map(
        (m) => m.id
      )
    ).toEqual(pinnedMessages.map((m) => m.id));
    expect(
      (pinnedMessagesSpy.calls.mostRecent().args[0] as StreamMessage[])[0]
        .created_at
    ).toBe(pinnedMessages[0].created_at);
    expect(typingUsersSpy).toHaveBeenCalledWith([]);
    expect(typingUsersInThreadSpy).toHaveBeenCalledWith([]);
    expect(channelSwitchStateSpy.calls.count()).toBe(2);
    expect(channelSwitchStateSpy.calls.first().args[0]).toBe('start');
    expect(channelSwitchStateSpy.calls.mostRecent().args[0]).toBe('end');
  });

  it('should activate the active channel, and release the previous one on channel switch', async () => {
    const channels = generateMockChannels(3);
    const releaseSpies = channels.map(() => jasmine.createSpy());
    channels.forEach((c, i) =>
      spyOn(c, 'activate').and.returnValue(releaseSpies[i])
    );
    await init(channels);

    expect(channels[0].activate).toHaveBeenCalledTimes(1);
    expect(releaseSpies[0]).not.toHaveBeenCalled();

    service.setAsActiveChannel(channels[1]);

    expect(releaseSpies[0]).toHaveBeenCalledTimes(1);
    expect(channels[1].activate).toHaveBeenCalledTimes(1);
    expect(releaseSpies[1]).not.toHaveBeenCalled();

    service.deselectActiveChannel();

    expect(releaseSpies[1]).toHaveBeenCalledTimes(1);
  });

  it('should release the active channel, if it is removed and the channel list becomes empty', async () => {
    const channels = generateMockChannels(1);
    const release = jasmine.createSpy();
    spyOn(channels[0], 'activate').and.returnValue(release);
    await init(channels);

    expect(getLatestValue(service.activeChannelMessages$).length).not.toBe(0);

    service.removeChannel(channels[0].cid);

    expect(release).toHaveBeenCalledTimes(1);
    expect(getLatestValue(service.activeChannel$)).toBeUndefined();
    expect(getLatestValue(service.activeChannelMessages$)).toEqual([]);
  });

  it(`shouldn't emit channel switch start, if there is no active channel to deselect`, async () => {
    await init();
    service.deselectActiveChannel();
    const spy = jasmine.createSpy();
    service.channelSwitchState$.subscribe(spy);
    spy.calls.reset();
    service.deselectActiveChannel();

    expect(spy).not.toHaveBeenCalled();
  });

  it('should load messages of the channel, if channel is not yet initialized', async () => {
    await init();
    const channel = generateMockChannels(1)[0];
    channel.cid = 'not-initialized';
    (channel as unknown as { initialized: boolean }).initialized = false;
    spyOn(channel, 'watch').and.callThrough();
    service.setAsActiveChannel(channel);

    expect(channel.watch).toHaveBeenCalledWith();
  });

  it('should emit error, if loading messages of the channel failed', async () => {
    await init();
    const channel = generateMockChannels(1)[0];
    channel.cid = 'not-initialized';
    (channel as unknown as { initialized: boolean }).initialized = false;
    const error = apiError('GetOrCreateChannel failed with error: "error"');
    spyOn(channel, 'watch').and.rejectWith(error);
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    const paginationStateSpy = jasmine.createSpy();
    service.activeChannelMessagesPaginationState$.subscribe(paginationStateSpy);
    service.setAsActiveChannel(channel);
    await settle();

    expect(paginationStateSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ isLoading: true })
    );
    expect(paginationStateSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ isLoading: false, error })
    );
    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Error loading messages'
    );
  });

  it('should emit #activeChannelMessages$', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(spy);
    const messages = generateMockChannels()[0].messagePaginator.items!;

    const result = spy.calls.mostRecent().args[0] as StreamMessage[];

    expect(result.length).toBe(messages.length);
    result.forEach((m, i) => {
      expect(m.id).toEqual(messages[i].id);
      expect(m.created_at).toBe(messages[i].created_at);
    });
  });

  it('should emit #activeChannelMessages$ if items of the message paginator change', async () => {
    await init();
    const channel = getActiveChannel();
    const spy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(spy);
    const prevMessages = spy.calls.mostRecent().args[0] as StreamMessage[];
    spy.calls.reset();
    const newMessage = toLocal(mockMessage(100));
    channel.messagePaginator.ingestItem(newMessage);

    let messages = spy.calls.mostRecent().args[0] as StreamMessage[];

    expect(messages.length).toBe(prevMessages.length + 1);
    expect(messages[messages.length - 1].id).toBe(newMessage.id);
    // unchanged messages are cached
    expect(messages[0]).toBe(prevMessages[0]);

    spy.calls.reset();
    channel.messagePaginator.setItems([]);

    expect(spy).toHaveBeenCalledWith([]);

    // hasMoreHead change also re-emits messages (it's used to decide if the latest message is in the list)
    spy.calls.reset();
    mockPaginator(channel).state.partialNext({ hasMoreHead: true });

    expect(spy).toHaveBeenCalledWith([]);

    // other pagination state changes don't re-emit messages
    spy.calls.reset();
    mockPaginator(channel).state.partialNext({ isLoading: true });

    expect(spy).not.toHaveBeenCalled();

    messages = getLatestValue(service.activeChannelMessages$);

    expect(messages).toEqual([]);
  });

  it('should emit #activeChannelMessagesPaginationState$', async () => {
    await init();
    const channel = getActiveChannel();
    const spy = jasmine.createSpy();
    service.activeChannelMessagesPaginationState$.subscribe(spy);

    expect(spy).toHaveBeenCalledWith({
      hasMoreOlder: true,
      hasMoreNewer: false,
      isLoading: false,
      error: undefined,
    });

    const error = new Error('error');
    mockPaginator(channel).state.partialNext({
      hasMoreTail: false,
      hasMoreHead: true,
      isLoading: true,
      lastQueryError: error,
    });

    expect(spy).toHaveBeenCalledWith({
      hasMoreOlder: false,
      hasMoreNewer: true,
      isLoading: true,
      error,
    });
  });

  it('should add readBy field to messages', async () => {
    await init();
    service.activeChannelMessages$.subscribe((messages) => {
      messages.forEach((m) => expect(m.readBy).not.toBeUndefined());
    });
  });

  it('should load more older messages', async () => {
    await init();
    const activeChannel = getActiveChannel();
    const paginator = mockPaginator(activeChannel);
    spyOn(paginator, 'toTail').and.callThrough();
    const olderMessages = generateMockLocalMessages(100, true);
    paginator.loadPage = () => olderMessages;
    const spy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(spy);
    const prevCount = (spy.calls.mostRecent().args[0] as StreamMessage[])
      .length;
    await service.loadMoreMessages();

    expect(paginator.toTail).toHaveBeenCalledWith();

    const messages = spy.calls.mostRecent().args[0] as StreamMessage[];

    expect(messages.length).toBe(prevCount + olderMessages.length);
    expect(messages[0].id).toBe(olderMessages[0].id);
  });

  it('should load more newer messages', async () => {
    await init();
    const activeChannel = getActiveChannel();
    const paginator = mockPaginator(activeChannel);
    paginator.state.partialNext({ hasMoreHead: true });
    spyOn(paginator, 'toHead').and.callThrough();
    const newerMessages = generateMockLocalMessages(100);
    paginator.loadPage = () => newerMessages;
    await service.loadMoreMessages('newer');

    expect(paginator.toHead).toHaveBeenCalledWith();

    const messages = getLatestValue(service.activeChannelMessages$);

    expect(messages[messages.length - 1].id).toBe(
      newerMessages[newerMessages.length - 1].id
    );
  });

  it(`shouldn't load more newer messages if already at the latest messages`, async () => {
    await init();
    const activeChannel = getActiveChannel();
    const paginator = mockPaginator(activeChannel);
    spyOn(paginator, 'toHead').and.callThrough();
    spyOn(paginator, 'toTail').and.callThrough();

    expect(service.loadMoreMessages('newer')).toBeFalse();
    expect(paginator.toHead).not.toHaveBeenCalled();

    await service.loadMoreMessages('older');

    expect(paginator.toTail).toHaveBeenCalledWith();
  });

  it(`shouldn't load more older messages if there are no more older messages`, async () => {
    await init();
    const paginator = mockPaginator(getActiveChannel());
    spyOn(paginator, 'toTail').and.callThrough();
    paginator.state.partialNext({ hasMoreTail: false });

    expect(service.loadMoreMessages('older')).toBeFalse();
    expect(paginator.toTail).not.toHaveBeenCalled();
  });

  it(`shouldn't load more messages if loading is in progress or if there are no messages`, async () => {
    await init();
    const paginator = mockPaginator(getActiveChannel());
    spyOn(paginator, 'toTail').and.callThrough();
    paginator.state.partialNext({ isLoading: true });

    expect(service.loadMoreMessages('older')).toBeFalse();

    paginator.state.partialNext({ isLoading: false, items: [] });

    expect(service.loadMoreMessages('older')).toBeFalse();

    paginator.state.partialNext({ items: undefined });

    expect(service.loadMoreMessages('older')).toBeFalse();
    expect(paginator.toTail).not.toHaveBeenCalled();
  });

  it(`shouldn't load more messages if there is no active channel`, () => {
    expect(service.loadMoreMessages()).toBeFalse();
    expect(service.loadMoreThreadReplies()).toBeFalse();
  });

  it('should reject #loadMoreMessages if the paginator has a query error', async () => {
    await init();
    const paginator = mockPaginator(getActiveChannel());
    const error = new Error('query failed');
    paginator.loadPage = () => {
      paginator.state.partialNext({ lastQueryError: error });
      return [];
    };

    await expectAsync(
      service.loadMoreMessages('older') as Promise<void>
    ).toBeRejectedWith(error);

    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to load older messages',
      jasmine.objectContaining({ error })
    );
  });

  it('should load more thread replies', async () => {
    await init();
    const parentMessage = service.activeChannelMessages[0] as StreamMessage;
    await service.setAsActiveParentMessage(
      getLatestValue(service.activeChannelMessages$).find(
        (m) => m.id === parentMessage.id
      )
    );
    const thread = mockChatClient.threads.get(parentMessage.id)!;
    const paginator = thread.messagePaginator;
    spyOn(paginator, 'toTail').and.callThrough();
    const olderReplies = generateMockLocalMessages(100, true).map((m) => ({
      ...m,
      parent_id: parentMessage.id,
    }));
    paginator.loadPage = () => olderReplies;
    const spy = jasmine.createSpy();
    service.activeThreadMessages$.subscribe(spy);
    const prevCount = (spy.calls.mostRecent().args[0] as StreamMessage[])
      .length;
    await service.loadMoreThreadReplies();

    expect(paginator.toTail).toHaveBeenCalledWith();
    expect((spy.calls.mostRecent().args[0] as StreamMessage[]).length).toBe(
      prevCount + olderReplies.length
    );

    expect(service.loadMoreThreadReplies('newer')).toBeFalse();
  });

  it('should add reaction', async () => {
    await init();
    const activeChannel = getActiveChannel();
    spyOn(activeChannel, 'sendReaction');
    const messageId = 'id';
    const reactionType = 'wow';
    await service.addReaction(messageId, reactionType);

    expect(activeChannel.sendReaction).toHaveBeenCalledWith(
      { id: messageId },
      { reaction: { type: reactionType, custom: undefined } }
    );

    await service.addReaction(messageId, reactionType, { clap: true });

    expect(activeChannel.sendReaction).toHaveBeenCalledWith(
      { id: messageId },
      { reaction: { type: reactionType, custom: { clap: true } } }
    );
  });

  it('should remove reaction', async () => {
    await init();
    const activeChannel = getActiveChannel();
    spyOn(activeChannel, 'deleteReaction');
    const messageId = 'id';
    const reactionType = 'wow';
    await service.removeReaction(messageId, reactionType);

    expect(activeChannel.deleteReaction).toHaveBeenCalledWith({
      id: messageId,
      type: reactionType,
    });
  });

  it('should watch for new message events', async () => {
    await init();
    // wait for mark read throttle time
    await waitForMarkReadThrottle();
    const spy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(spy);
    const prevCount = (spy.calls.mostRecent().args[0] as StreamMessage[])
      .length;
    spy.calls.reset();
    const activeChannel = getActiveChannel();
    const newMessage = toLocal(mockMessage(100));
    spyOn(activeChannel, 'markReadViaReporter');
    // stream-chat adds the message to the paginator
    activeChannel.messagePaginator.ingestItem(newMessage);
    activeChannel.handleEvent('message.new', { message: newMessage });

    const newCount = (spy.calls.mostRecent().args[0] as StreamMessage[]).length;

    expect(newCount).toBe(prevCount + 1);
    expect(activeChannel.markReadViaReporter).toHaveBeenCalledWith();
  });

  it('should pause read events', async () => {
    await init();
    await waitForMarkReadThrottle();
    service.shouldMarkActiveChannelAsRead = false;
    const activeChannel = getActiveChannel();
    const newMessage = toLocal(mockMessage(100));
    spyOn(activeChannel, 'markReadViaReporter');
    activeChannel.handleEvent('message.new', { message: newMessage });

    expect(activeChannel.markReadViaReporter).not.toHaveBeenCalled();

    service.setAsActiveChannel(activeChannel);

    expect(activeChannel.markReadViaReporter).not.toHaveBeenCalled();

    service.shouldMarkActiveChannelAsRead = true;

    expect(activeChannel.markReadViaReporter).toHaveBeenCalledWith();
  });

  it('should only tell stream-chat that the user views live, if the channel is marked as read', async () => {
    await init();
    const activeChannel = getActiveChannel();
    const paginator = activeChannel.messagePaginator;
    service.setIsLatestMessageVisible(true);

    expect(paginator.isViewingLive).toBeTrue();

    // stream-chat wouldn't increase the unread count, but we don't mark the channel as read
    service.shouldMarkActiveChannelAsRead = false;

    expect(paginator.isViewingLive).toBeFalse();

    service.shouldMarkActiveChannelAsRead = true;

    expect(paginator.isViewingLive).toBeTrue();

    service.setIsLatestMessageVisible(false);

    expect(paginator.isViewingLive).toBeFalse();

    service.setIsLatestMessageVisible(true);
    spyOn(activeChannel, 'markUnread').and.resolveTo();
    await service.markMessageUnread('message-id');

    expect(paginator.isViewingLive).toBeFalse();

    service.setIsLatestMessageVisible(true);

    expect(paginator.isViewingLive).toBeFalse();
  });

  it(`shouldn't tell stream-chat that the user views live, if user dosen't have 'read-events' capability`, async () => {
    await init();
    const activeChannel = getActiveChannel();
    const capabilites = activeChannel.data?.own_capabilities as string[];
    capabilites.splice(capabilites.indexOf('read-events'), 1);
    service.setIsLatestMessageVisible(true);

    expect(activeChannel.messagePaginator.isViewingLive).toBeFalse();
  });

  it(`shouldn't make "markRead" call, if user dosen't have 'read-events' capability`, async () => {
    await init();
    await waitForMarkReadThrottle();
    const activeChannel = getActiveChannel();
    const capabilites = activeChannel.data?.own_capabilities as string[];
    capabilites.splice(capabilites.indexOf('read-events'), 1);
    const newMessage = toLocal(mockMessage(100));
    spyOn(activeChannel, 'markReadViaReporter');
    activeChannel.handleEvent('message.new', { message: newMessage });

    expect(activeChannel.markReadViaReporter).not.toHaveBeenCalled();

    service.setAsActiveChannel(activeChannel);

    expect(activeChannel.markReadViaReporter).not.toHaveBeenCalled();
  });

  it(`should log a warning if "markRead" call fails`, async () => {
    await init();
    await waitForMarkReadThrottle();
    const activeChannel = getActiveChannel();
    const error = new Error('mark read failed');
    spyOn(activeChannel, 'markReadViaReporter').and.rejectWith(error);
    activeChannel.handleEvent('message.new', {
      message: toLocal(mockMessage(100)),
    });
    await settle();

    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to mark channel as read',
      jasmine.objectContaining({ error })
    );
  });

  it('should watch for message update events', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(spy);
    spy.calls.reset();
    const pinnedMessagesSpy = jasmine.createSpy();
    service.activeChannelPinnedMessages$.subscribe(pinnedMessagesSpy);
    pinnedMessagesSpy.calls.reset();
    const activeChannel = getActiveChannel();
    const pinnedMessages = generateMockLocalMessages(100);
    // stream-chat updates the paginators on message.updated events
    activeChannel.pinnedMessagesPaginator.setItems(pinnedMessages);
    const items = activeChannel.messagePaginator.items!;
    const message = items[items.length - 1];
    activeChannel.messagePaginator.ingestItem({ ...message, text: 'updated' });

    const messages = spy.calls.mostRecent().args[0] as StreamMessage[];
    const updatedMessage = messages[messages.length - 1];

    expect(updatedMessage.text).toBe('updated');

    expect(
      (pinnedMessagesSpy.calls.mostRecent().args[0] as StreamMessage[]).map(
        (m) => m.id
      )
    ).toEqual(pinnedMessages.map((m) => m.id));
  });

  it('should emit reaction updates', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(spy);
    spy.calls.reset();
    const activeChannel = getActiveChannel();
    const message = activeChannel.messagePaginator.items![0];
    // stream-chat updates the paginator on reaction events
    activeChannel.messagePaginator.ingestItem({
      ...message,
      reaction_counts: { wow: 1 },
    } as LocalMessage);

    const messages = spy.calls.mostRecent().args[0] as StreamMessage[];

    expect(messages[0].reaction_counts).toEqual({ wow: 1 });
  });

  it('should watch for message deleted events', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(spy);
    spy.calls.reset();
    const activeChannel = getActiveChannel();
    const items = activeChannel.messagePaginator.items!;
    const message = items[items.length - 1];
    const deletedAt = new Date();
    activeChannel.messagePaginator.ingestItem({
      ...message,
      deleted_at: dateToNs(deletedAt),
    });

    expect(spy).toHaveBeenCalledWith(
      jasmine.arrayContaining([
        jasmine.objectContaining({
          id: message.id,
          deleted_at: dateToNs(deletedAt),
        }),
      ])
    );

    spy.calls.reset();
    activeChannel.messagePaginator.removeItem({ id: message.id });

    expect(spy).toHaveBeenCalled();
    expect(
      (spy.calls.mostRecent().args[0] as StreamMessage[]).find(
        (m) => m.id === message.id
      )
    ).toBeUndefined();
  });

  it('should move channel to the top of the list', async () => {
    await init();
    let channel!: Channel;
    service.channels$
      .pipe(first())
      .subscribe((channels) => (channel = channels![1]));
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    const event = {
      message: toLocal(mockMessage()),
      type: 'message.new',
    };
    (channel as MockChannel).handleEvent('message.new', event);

    const firtChannel = (spy.calls.mostRecent().args[0] as Channel[])[0];

    expect(firtChannel).toBe(channel);
  });

  it('should call custom #customNewMessageHandler, if handler is provided', async () => {
    await init();
    let channel!: Channel;
    service.channels$
      .pipe(first())
      .subscribe((channels) => (channel = channels![1]));
    const spy = jasmine.createSpy();
    service.customNewMessageHandler = spy;
    const event = {
      message: toLocal(mockMessage()),
      type: 'message.new',
    };
    (channel as MockChannel).handleEvent('message.new', event);

    expect(spy).toHaveBeenCalledWith(
      event,
      channel,
      jasmine.any(Function),
      jasmine.any(Function),
      jasmine.any(Function),
      jasmine.any(Function)
    );
  });

  it('should handle if channel visibility changes', async () => {
    await init();
    const channel = getActiveChannel();
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    mockChatClient.activeChannels[channel.cid] = channel;
    spyOn(channel, 'stopWatching');
    channel.handleEvent('channel.hidden', {
      type: 'channel.hidden',
      cid: channel.cid,
    });

    let channels = spy.calls.mostRecent().args[0] as Channel[];

    expect(channels.find((c) => c.cid === channel.cid)).toBeUndefined();
    expect(channel.stopWatching).not.toHaveBeenCalled();

    channel.handleEvent('channel.visible', {
      type: 'channel.visible',
      cid: channel.cid,
    });

    channels = spy.calls.mostRecent().args[0] as Channel[];

    expect(channels.find((c) => c.cid === channel.cid)).not.toBeUndefined();
  });

  it('should handle if channel visibility changes, if custom event handlers are provided', async () => {
    await init();
    const channel = getActiveChannel();
    const visibleSpy = jasmine.createSpy();
    const hiddenSpy = jasmine.createSpy();
    service.customChannelVisibleHandler = visibleSpy;
    service.customChannelHiddenHandler = hiddenSpy;
    const hiddenEvent = {
      type: 'channel.hidden',
      cid: channel.cid,
    };
    channel.handleEvent('channel.hidden', hiddenEvent);

    expect(hiddenSpy).toHaveBeenCalledWith(
      hiddenEvent,
      channel,
      jasmine.any(Function),
      jasmine.any(Function),
      jasmine.any(Function),
      jasmine.any(Function)
    );

    const visibleEvent = {
      type: 'channel.visible',
      cid: channel.cid,
    };
    channel.handleEvent('channel.visible', visibleEvent);

    expect(visibleSpy).toHaveBeenCalledWith(
      visibleEvent,
      channel,
      jasmine.any(Function),
      jasmine.any(Function),
      jasmine.any(Function),
      jasmine.any(Function)
    );
  });

  it('should remove channel from list, if deleted', async () => {
    await init();
    const channel = getActiveChannel();
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    mockChatClient.activeChannels[channel.cid] = channel;
    spyOn(channel, 'stopWatching');
    channel.handleEvent('channel.deleted', {
      type: 'channel.deleted',
      cid: channel.cid,
    });

    const channels = spy.calls.mostRecent().args[0] as Channel[];

    expect(channels.find((c) => c.cid === channel.cid)).toBeUndefined();
    expect(channel.stopWatching).not.toHaveBeenCalled();
    expect(service.activeChannel?.cid).toBe(channels[0].cid);
  });

  it('should call #customChannelDeletedHandler, if channel is deleted and handler is provided', async () => {
    await init();
    const channel = getActiveChannel();
    const spy = jasmine.createSpy();
    service.customChannelDeletedHandler = spy;
    const event = {
      type: 'channel.deleted',
      cid: channel.cid,
    };
    channel.handleEvent('channel.deleted', event);

    expect(spy).toHaveBeenCalledWith(
      event,
      channel,
      jasmine.any(Function),
      jasmine.any(Function),
      jasmine.any(Function),
      jasmine.any(Function)
    );
  });

  it('should update channel in list, if updated', async () => {
    await init();
    const channel = getActiveChannel();
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    const activeChannelSpy = jasmine.createSpy();
    service.activeChannel$.subscribe(activeChannelSpy);
    spy.calls.reset();
    activeChannelSpy.calls.reset();
    // stream-chat updates channel.data
    channel.data!.custom = { ...channel.data!.custom, name: 'New name' };
    channel.handleEvent('channel.updated', {
      type: 'channel.updated',
      cid: channel.cid,
    });

    const channels = spy.calls.mostRecent().args[0] as Channel[];

    const updatedChannel = channels.find((c) => c.cid === channel.cid);

    expect(updatedChannel!.data!.custom!.name).toBe('New name');
    expect(updatedChannel!.data!.own_capabilities).toBeDefined();
    expect(activeChannelSpy).toHaveBeenCalledWith(channel);
  });

  it('should emit changed channel if `capabilities.changed` dispatched', async () => {
    await init();
    const channel = getActiveChannel();
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    channel.data!.own_capabilities = ['send-message'];
    channel.handleEvent('capabilities.changed', {
      type: 'capabilities.changed',
      cid: channel.cid,
    });

    const channels = spy.calls.mostRecent().args[0] as Channel[];

    const updatedChannel = channels.find((c) => c.cid === channel.cid);

    expect(updatedChannel!.data!.own_capabilities).toEqual(['send-message']);
  });

  it('should call #customChannelUpdatedHandler, if updated and handler is provided', async () => {
    await init();
    const channel = getActiveChannel();
    const spy = jasmine.createSpy();
    service.customChannelUpdatedHandler = spy;
    const event = {
      type: 'channel.updated',
      cid: channel.cid,
    };
    channel.handleEvent('channel.updated', event);

    expect(spy).toHaveBeenCalledWith(
      event,
      channel,
      jasmine.any(Function),
      jasmine.any(Function),
      jasmine.any(Function),
      jasmine.any(Function)
    );
  });

  it('should handle if channel is truncated', async () => {
    await init();
    const channel = getActiveChannel();
    await service.setAsActiveParentMessage(
      getLatestValue(service.activeChannelMessages$)[0]
    );
    const channelsSpy = jasmine.createSpy();
    service.channels$.subscribe(channelsSpy);
    channelsSpy.calls.reset();
    const messagesSpy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(messagesSpy);
    const parentMessageIdSpy = jasmine.createSpy();
    service.activeParentMessageId$.subscribe(parentMessageIdSpy);
    parentMessageIdSpy.calls.reset();
    // stream-chat truncates the message paginator
    channel.messagePaginator.setItems([]);
    channel.handleEvent('channel.truncated', {
      type: 'channel.truncated',
      cid: channel.cid,
    });

    expect(channelsSpy).toHaveBeenCalledWith(
      jasmine.arrayContaining([channel])
    );
    expect(messagesSpy).toHaveBeenCalledWith([]);
    expect(parentMessageIdSpy).toHaveBeenCalledWith(undefined);
  });

  it('should call #customChannelTruncatedHandler, if channel is truncated and custom handler is provided', async () => {
    await init();
    const channel = getActiveChannel();
    const spy = jasmine.createSpy();
    service.customChannelTruncatedHandler = spy;
    const event = {
      type: 'channel.truncated',
      cid: channel.cid,
    };
    channel.handleEvent('channel.truncated', event);

    expect(spy).toHaveBeenCalledWith(
      event,
      channel,
      jasmine.any(Function),
      jasmine.any(Function),
      jasmine.any(Function),
      jasmine.any(Function)
    );
  });

  it('should watch for channel events', async () => {
    const channel = generateMockChannels(1)[0];
    const unsubscribeSpy = jasmine.createSpy();
    spyOn(channel, 'on').and.returnValue({ unsubscribe: unsubscribeSpy });
    await init([channel], undefined, undefined, undefined, false);

    expect(channel.on).toHaveBeenCalledWith(jasmine.any(Function));

    service.reset();

    expect(unsubscribeSpy).toHaveBeenCalledWith();
  });

  it('should add the new channel to the top of the list, and start watching it, if user is added to a channel', async () => {
    await init();
    const newChannel = generateMockChannels()[0];
    newChannel.cid = 'messaging:newchannel';
    newChannel.id = 'newchannel';
    mockChatClient.channel.and.returnValue(newChannel);
    spyOn(newChannel, 'watch').and.callThrough();
    spyOn(newChannel, 'on').and.callThrough();
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    events$.next({
      eventType: 'notification.added_to_channel',
      event: {
        type: 'notification.added_to_channel',
        channel: { cid: newChannel.cid, id: newChannel.id, type: 'messaging' },
      } as unknown as Event,
    });
    await settle();

    const channels = spy.calls.mostRecent().args[0] as Channel[];
    const firstChannel = channels[0];

    expect(mockChatClient.channel).toHaveBeenCalledWith(
      'messaging',
      'newchannel'
    );
    expect(firstChannel.cid).toBe(newChannel.cid);
    expect(newChannel.watch).toHaveBeenCalledWith();
    expect(newChannel.on).toHaveBeenCalledWith(jasmine.any(Function));
  });

  it('should add the new channel to the top of the list, and start watching it, if a new message is received from the channel', async () => {
    await init();
    const channel = generateMockChannels()[0];
    channel.cid = 'messaging:channel';
    channel.id = 'channel';
    mockChatClient.channel.and.returnValue(channel);
    spyOn(channel, 'watch').and.callThrough();
    spyOn(channel, 'on').and.callThrough();
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    events$.next({
      eventType: 'notification.message_new',
      event: {
        type: 'notification.message_new',
        channel: { cid: channel.cid, id: channel.id, type: 'messaging' },
      } as unknown as Event,
    });
    await settle();

    const channels = spy.calls.mostRecent().args[0] as Channel[];
    const firstChannel = channels[0];

    expect(firstChannel.cid).toBe(channel.cid);
    expect(channel.watch).toHaveBeenCalledWith();
    expect(channel.on).toHaveBeenCalledWith(jasmine.any(Function));
  });

  it('should add the new channel to the list even if watch request failed, and log the error', async () => {
    await init();
    const channel = generateMockChannels()[0];
    channel.cid = 'messaging:channel';
    channel.id = 'channel';
    mockChatClient.channel.and.returnValue(channel);
    const error = new Error('watch failed');
    spyOn(channel, 'watch').and.rejectWith(error);
    events$.next({
      eventType: 'notification.message_new',
      event: {
        type: 'notification.message_new',
        channel: { cid: channel.cid, id: channel.id, type: 'messaging' },
      } as unknown as Event,
    });
    await settle();

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to add channel to channel list because watch request failed',
      jasmine.objectContaining({ error })
    );
    expect(service.channels[0].cid).toBe(channel.cid);
  });

  it(`shouldn't add channels twice if two notification events were received for the same channel`, async () => {
    await init();
    const channel = generateMockChannels()[0];
    channel.cid = 'messaging:channel';
    channel.id = 'channel';
    mockChatClient.channel.and.returnValue(channel);
    spyOn(channel, 'watch').and.callThrough();
    spyOn(channel, 'on').and.callThrough();
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    const event = {
      channel: { cid: channel.cid, id: channel.id, type: 'messaging' },
    };
    events$.next({
      eventType: 'notification.added_to_channel',
      event: {
        ...event,
        type: 'notification.added_to_channel',
      } as unknown as Event,
    });
    events$.next({
      eventType: 'notification.message_new',
      event: { ...event, type: 'notification.message_new' } as unknown as Event,
    });
    await settle();

    const channels = spy.calls.mostRecent().args[0] as Channel[];

    expect(channels.filter((c) => c.cid === channel.cid).length).toBe(1);
    expect(channel.on).toHaveBeenCalledOnceWith(jasmine.any(Function));
  });

  it('should remove channel form the list if user is removed from channel', async () => {
    await init();
    let channel!: Channel;
    service.channels$
      .pipe(first())
      .subscribe((channels) => (channel = channels![1]));
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    mockChatClient.activeChannels[channel.cid] = channel;
    spyOn(channel, 'stopWatching').and.callThrough();
    spyOn(service, 'setAsActiveChannel');

    events$.next({
      eventType: 'notification.removed_from_channel',
      event: {
        type: 'notification.removed_from_channel',
        channel: { cid: channel.cid, id: channel.id, type: channel.type },
      } as unknown as Event,
    });

    let channels = spy.calls.mostRecent().args[0] as Channel[];

    expect(channels.find((c) => c.cid === channel.cid)).toBeUndefined();
    expect(service.setAsActiveChannel).not.toHaveBeenCalled();
    expect(mockChatClient.channelManager.get).toHaveBeenCalledWith(channel.cid);
    expect(channel.stopWatching).toHaveBeenCalledWith();

    // Check that new messages won't readd the channel to the list
    (channel as MockChannel).handleEvent('message.new', {
      message: toLocal(mockMessage(100)),
      type: 'message.new',
    });

    channels = spy.calls.mostRecent().args[0] as Channel[];

    expect(channels.find((c) => c.cid === channel.cid)).toBeUndefined();
  });

  it('should log a warning if unwatching a removed channel failed', async () => {
    await init();
    const channel = service.channels[1];
    mockChatClient.activeChannels[channel.cid] = channel;
    const error = new Error('stop watching failed');
    spyOn(channel, 'stopWatching').and.rejectWith(error);
    service.removeChannel(channel.cid);
    await settle();

    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to unwatch channel',
      jasmine.objectContaining({ error })
    );
  });

  it('should remove channel form the list if user is removed from channel, and emit new active channel', async () => {
    await init();
    let channel!: Channel;
    let newActiveChannel!: Channel;
    service.channels$.pipe(first()).subscribe((channels) => {
      channel = channels![0];
      newActiveChannel = channels![1];
    });
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    spyOn(service, 'setAsActiveChannel');
    events$.next({
      eventType: 'notification.removed_from_channel',
      event: {
        type: 'notification.removed_from_channel',
        channel: { cid: channel.cid, id: channel.id, type: channel.type },
      } as unknown as Event,
    });

    const channels = spy.calls.mostRecent().args[0] as Channel[];

    expect(channels.find((c) => c.cid === channel.cid)).toBeUndefined();
    expect(service.setAsActiveChannel).toHaveBeenCalledWith(newActiveChannel);
  });

  it('should call custom new message notification handler, if custom handler is provided', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.customNewMessageNotificationHandler = spy;
    let channel!: Channel;
    service.channels$
      .pipe(first())
      .subscribe((channels) => (channel = channels![1]));
    const event = {
      type: 'notification.message_new',
      channel: { cid: channel.cid, id: channel.id, type: channel.type },
    } as unknown as Event;
    const channelsSpy = jasmine.createSpy();
    service.channels$.subscribe(channelsSpy);
    channelsSpy.calls.reset();
    events$.next({
      eventType: 'notification.message_new',
      event: event,
    });

    expect(spy).toHaveBeenCalledWith(
      { eventType: 'notification.message_new', event },
      jasmine.any(Function)
    );

    expect(channelsSpy).not.toHaveBeenCalled();
  });

  it('should call custom added to channel notification handler, if custom handler is provided', async () => {
    await init();
    const spy = jasmine
      .createSpy()
      .and.callFake((_: ClientEvent, setter: (channels: Channel[]) => []) =>
        setter([])
      );
    service.customAddedToChannelNotificationHandler = spy;
    let channel!: Channel;
    service.channels$
      .pipe(first())
      .subscribe((channels) => (channel = channels![1]));
    const event = {
      type: 'notification.added_to_channel',
      channel: { cid: channel.cid, id: channel.id, type: channel.type },
    } as unknown as Event;
    const channelsSpy = jasmine.createSpy();
    service.channels$.subscribe(channelsSpy);
    channelsSpy.calls.reset();
    events$.next({
      eventType: 'notification.added_to_channel',
      event: event,
    });

    expect(spy).toHaveBeenCalledWith(
      { eventType: 'notification.added_to_channel', event },
      jasmine.any(Function)
    );

    expect(channelsSpy).toHaveBeenCalledWith([]);
  });

  it('should call custom removed from channel notification handler, if custom handler is provided', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.customRemovedFromChannelNotificationHandler = spy;
    let channel!: Channel;
    service.channels$
      .pipe(first())
      .subscribe((channels) => (channel = channels![1]));
    const event = {
      type: 'notification.removed_from_channel',
      channel: { cid: channel.cid, id: channel.id, type: channel.type },
    } as unknown as Event;
    const channelsSpy = jasmine.createSpy();
    service.channels$.subscribe(channelsSpy);
    channelsSpy.calls.reset();
    events$.next({
      eventType: 'notification.removed_from_channel',
      event: event,
    });

    expect(spy).toHaveBeenCalledWith(
      { eventType: 'notification.removed_from_channel', event },
      jasmine.any(Function)
    );

    expect(channelsSpy).not.toHaveBeenCalled();
  });

  it('should send message', async () => {
    await init();
    const channel = getActiveChannel();
    spyOn(channel, 'sendMessage').and.callThrough();
    spyOn(channel.messagePaginator, 'ingestItem').and.callThrough();
    const text = 'Hi';
    const attachments = [
      { fallback: 'image.png', url: 'http://url/to/image' },
    ] as unknown as Attachment[];
    const mentionedUsers = [{ id: 'sara', name: 'Sara' }] as UserResponse[];
    const quotedMessageId = 'quotedMessage';
    const customData = {
      isVote: true,
      options: ['A', 'B', 'C'],
    };
    let prevMessageCount!: number;
    service.activeChannelMessages$
      .pipe(first())
      .subscribe((m) => (prevMessageCount = m.length));
    const result = await service.sendMessage(
      text,
      attachments,
      mentionedUsers,
      undefined,
      quotedMessageId,
      customData
    );
    let latestMessage!: StreamMessage;
    let messageCount!: number;
    service.activeChannelMessages$.subscribe((m) => {
      latestMessage = m[m.length - 1];
      messageCount = m.length;
    });

    expect(channel.sendMessage).toHaveBeenCalledWith({
      message: {
        text,
        attachments,
        mentioned_users: ['sara'],
        id: jasmine.any(String),
        parent_id: undefined,
        quoted_message_id: quotedMessageId,
        custom: customData,
        poll_id: undefined,
      },
    });

    const ingestSpy = channel.messagePaginator.ingestItem as jasmine.Spy;
    const preview = ingestSpy.calls.first().args[0] as LocalMessage;

    // optimistic update
    expect(preview).toEqual(
      jasmine.objectContaining({
        text,
        user,
        attachments,
        status: 'sending',
        custom: customData,
        cid: channel.cid,
      })
    );
    expect(preview.created_at).toEqual(jasmine.any(Number));

    expect(ingestSpy.calls.mostRecent().args[0]).toEqual(
      jasmine.objectContaining({ id: preview.id, status: 'received' })
    );

    expect(latestMessage.text).toBe(text);
    expect(latestMessage.id).toBe(preview.id);
    expect(latestMessage.status).toBe('received');
    expect(messageCount).toEqual(prevMessageCount + 1);
    expect(result.id).toBe(preview.id);
    expect(result.status).toBe('received');
  });

  it('should display optimistic and failed messages (stream-chat only accepts messages of the channel)', async () => {
    await init();
    const channel = getActiveChannel();
    mockPaginator(channel).requiredCid = channel.cid;
    let resolveRequest!: () => void;
    spyOn(channel, 'sendMessage').and.returnValue(
      new Promise((_, reject) => {
        resolveRequest = () => reject({ status: 500 });
      })
    );
    const resultPromise = service.sendMessage('optimistic');
    await settle();
    let messages = getLatestValue(service.activeChannelMessages$);

    expect(messages[messages.length - 1].text).toBe('optimistic');
    expect(messages[messages.length - 1].status).toBe('sending');

    resolveRequest();
    const result = await resultPromise;
    messages = getLatestValue(service.activeChannelMessages$);

    expect(result.status).toBe('failed');
    expect(messages[messages.length - 1].id).toBe(result.id);
    expect(messages[messages.length - 1].status).toBe('failed');
  });

  it('should send thread reply', async () => {
    await init();
    const channel = getActiveChannel();
    const parentMessage = getLatestValue(service.activeChannelMessages$)[0];
    await service.setAsActiveParentMessage(parentMessage);
    const thread = mockChatClient.threads.get(parentMessage.id)!;
    spyOn(channel.messagePaginator, 'ingestItem').and.callThrough();
    spyOn(channel, 'sendMessage').and.callThrough();
    const result = await service.sendMessage('Hi', [], [], parentMessage.id);

    expect(channel.sendMessage).toHaveBeenCalledWith({
      message: jasmine.objectContaining({ parent_id: parentMessage.id }),
    });
    expect(channel.messagePaginator.ingestItem).not.toHaveBeenCalled();
    expect(
      thread.messagePaginator.items![thread.messagePaginator.items!.length - 1]
        .id
    ).toBe(result.id);

    const replies = getLatestValue(service.activeThreadMessages$);

    expect(replies[replies.length - 1].id).toBe(result.id);
    expect(result.status).toBe('received');
    expect(result.parent_id).toBe(parentMessage.id);
  });

  it('should send message - #beforeSendMessage hook is provided', async () => {
    await init();
    const channel = getActiveChannel();
    spyOn(channel, 'sendMessage').and.callThrough();
    spyOn(channel.messagePaginator, 'ingestItem').and.callThrough();
    const text = 'Hi';
    const attachments = [
      { fallback: 'image.png', url: 'http://url/to/image' },
    ] as unknown as Attachment[];
    const mentionedUsers = [{ id: 'sara', name: 'Sara' }] as UserResponse[];
    const spy = jasmine.createSpy();
    service.beforeSendMessage = spy;
    spy.and.callFake((i: MessageInput) => {
      i.customData = { custom: 'red' } as unknown as CustomMessageData;
      return i;
    });
    await service.sendMessage(text, attachments, mentionedUsers);

    expect(channel.sendMessage).toHaveBeenCalledWith({
      message: {
        text,
        attachments,
        mentioned_users: ['sara'],
        id: jasmine.any(String),
        parent_id: undefined,
        quoted_message_id: undefined,
        custom: { custom: 'red' } as unknown as CustomMessageData,
        poll_id: undefined,
      },
    });

    expect(channel.messagePaginator.ingestItem).toHaveBeenCalledWith(
      jasmine.objectContaining({ custom: { custom: 'red' }, status: 'sending' })
    );

    spy.and.callFake((i: MessageInput) => {
      i.text = 'censored';
      return Promise.resolve(i);
    });
    await service.sendMessage(text, attachments, mentionedUsers);

    expect(channel.sendMessage).toHaveBeenCalledWith({
      message: {
        text: 'censored',
        attachments,
        mentioned_users: ['sara'],
        id: jasmine.any(String),
        parent_id: undefined,
        quoted_message_id: undefined,
        custom: {},
        poll_id: undefined,
      },
    });

    expect(channel.messagePaginator.ingestItem).toHaveBeenCalledWith(
      jasmine.objectContaining({ text: 'censored', status: 'sending' })
    );
  });

  it('should send action', async () => {
    await init();
    const channel = getActiveChannel();
    const giphy = {
      thumb_url:
        'https://media4.giphy.com/media/Q9GYuPJTT8RomJTRot/giphy.gif?cid=c4b036752at3vu1m2vwt7nvnfumyer5620wbdhosrpmds52e&rid=giphy.gif&ct=g',
      title: 'dogs',
      title_link: 'https://giphy.com/gifs/Q9GYuPJTT8RomJTRot',
      type: 'giphy',
    };
    (spyOn(channel, 'sendAction') as jasmine.Spy).and.resolveTo({
      message: {
        id: 'message-1',
        attachments: [giphy],
      },
    });
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe(
      (m) => (latestMessage = m[m.length - 1])
    );
    await service.sendAction('message-1', { image_action: 'send' });

    expect(channel.sendAction).toHaveBeenCalledWith('message-1', {
      image_action: 'send',
    });
    expect(latestMessage.id).toBe('message-1');
    expect(latestMessage.status).toBe('received');
    expect(latestMessage.attachments[0]).toEqual(
      giphy as unknown as Attachment
    );
  });

  it('should remove message after action, if no message is returned', async () => {
    await init();
    const channel = getActiveChannel();
    (spyOn(channel, 'sendAction') as jasmine.Spy).and.resolveTo({});
    spyOn(channel.messagePaginator, 'removeItem').and.callThrough();
    await service.sendAction('1', { image_action: 'send' });

    expect(channel.messagePaginator.removeItem).toHaveBeenCalledWith({
      id: '1',
    });
    expect(
      service.activeChannelMessages.find((m) => m.id === '1')
    ).toBeUndefined();
  });

  it('should remove thread message after action, if no message is returned', async () => {
    await init();
    const channel = getActiveChannel();
    const parentMessage = getLatestValue(service.activeChannelMessages$)[0];
    await service.setAsActiveParentMessage(parentMessage);
    const thread = mockChatClient.threads.get(parentMessage.id)!;
    (spyOn(channel, 'sendAction') as jasmine.Spy).and.resolveTo({});
    spyOn(thread.messagePaginator, 'removeItem').and.callThrough();
    spyOn(channel.messagePaginator, 'removeItem').and.callThrough();
    await service.sendAction('1', { image_action: 'send' }, parentMessage.id);

    expect(thread.messagePaginator.removeItem).toHaveBeenCalledWith({
      id: '1',
    });
    expect(channel.messagePaginator.removeItem).not.toHaveBeenCalled();
  });

  it('should update message with a partial update', async () => {
    const message = mockMessage();
    mockChatClient.updateMessagePartial.and.resolveTo({
      message: { ...toLocalMessage(message), text: 'Edited text' },
    });
    const result = await service.updateMessagePartial(message, {
      set: { text: 'Edited text' },
      unset: ['custom_field'],
    });

    expect(mockChatClient.updateMessagePartial).toHaveBeenCalledWith(
      { id: message.id },
      { set: { text: 'Edited text' }, unset: ['custom_field'] }
    );
    expect(result.id).toBe(message.id);
    expect(result.text).toBe('Edited text');
    expect(result.created_at).toEqual(message.created_at);
  });

  it('should return the original message if the partial update response has no message', async () => {
    const message = mockMessage();
    mockChatClient.updateMessagePartial.and.resolveTo({});
    const result = await service.updateMessagePartial(message, {
      set: { text: 'Edited text' },
    });

    expect(result).toBe(message);
  });

  it('should display notification if updated message was rejected by moderation', async () => {
    const message = mockMessage();
    mockChatClient.updateMessagePartial.and.resolveTo({
      message: {
        ...toLocalMessage(message),
        type: 'error',
        moderation: { action: 'bounce' },
      },
    });
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    const result = await service.updateMessagePartial(message, {
      set: { text: 'Edited text' },
    });

    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.This message did not meet our content guidelines'
    );
    expect(result).toBe(message);
  });

  it('should resend instead of update if message was bounced', async () => {
    await init();
    const message = mockMessage();
    const channel = getActiveChannel();
    spyOn(channel, 'sendMessage').and.callThrough();
    (message as { type: string }).type = 'error';
    message.moderation = {
      action: 'bounce',
      original_text: 'Ricciardo should retire',
    } as unknown as StreamMessage['moderation'];
    (message as unknown as Record<string, unknown>)['custom_field'] = 'value';
    await service.updateMessagePartial(message, {
      set: { text: 'Edited text' },
      unset: ['custom_field'],
    });

    expect(mockChatClient.updateMessagePartial).not.toHaveBeenCalled();
    expect(channel.sendMessage).toHaveBeenCalledWith({
      message: jasmine.objectContaining({
        id: message.id,
        text: 'Edited text',
      }),
    });
    const sentMessage = (channel.sendMessage as jasmine.Spy).calls.mostRecent()
      .args[0].message as Record<string, unknown>;

    expect(Object.keys(sentMessage)).not.toContain('custom_field');
  });

  it('should update message - #beforeUpdateMessage is provided', async () => {
    const message = mockMessage();
    mockChatClient.updateMessagePartial.and.resolveTo({
      message: toLocalMessage(message),
    });
    const spy = jasmine.createSpy();
    service.beforeUpdateMessage = spy;
    spy.and.callFake((update: UpdateMessagePartialRequest) =>
      Promise.resolve({
        ...update,
        set: { ...update.set, text: 'Testing beforeUpdateMessage hook' },
        unset: ['custom_field'],
      })
    );
    await service.updateMessagePartial(message, {
      set: { text: 'Edited text' },
    });

    expect(spy).toHaveBeenCalledWith({ set: { text: 'Edited text' } }, message);
    expect(mockChatClient.updateMessagePartial).toHaveBeenCalledWith(
      { id: message.id },
      {
        set: { text: 'Testing beforeUpdateMessage hook' },
        unset: ['custom_field'],
      }
    );
  });

  it('should delete message', async () => {
    await init();
    const channel = getActiveChannel();
    spyOn(channel.messagePaginator, 'removeItem');
    const message = mockMessage();
    await service.deleteMessage(message);

    expect(mockChatClient.deleteMessage).toHaveBeenCalledWith({
      id: message.id,
    });
    expect(channel.messagePaginator.removeItem).not.toHaveBeenCalled();
  });

  it('should delete message - local', async () => {
    await init();
    const message = mockMessage();
    const channel = getActiveChannel();
    spyOn(channel.messagePaginator, 'removeItem');
    await service.deleteMessage(message, true);

    expect(mockChatClient.deleteMessage).not.toHaveBeenCalled();
    expect(channel.messagePaginator.removeItem).toHaveBeenCalledWith({
      id: message.id,
    });
  });

  it(`should call #messageDeleteConfirmationHandler is that's provided`, async () => {
    const spy = jasmine.createSpy();
    const message = mockMessage();
    service.messageDeleteConfirmationHandler = spy;
    spy.and.resolveTo(false);
    await service.deleteMessage(message);

    expect(spy).toHaveBeenCalledWith(message);
    expect(mockChatClient.deleteMessage).not.toHaveBeenCalled();

    spy.and.resolveTo(true);
    spy.calls.reset();
    await service.deleteMessage(message);

    expect(spy).toHaveBeenCalledWith(message);
    expect(mockChatClient.deleteMessage).toHaveBeenCalledWith({
      id: message.id,
    });
  });

  it('should resend message', async () => {
    await init();
    const channel = getActiveChannel();
    const items = channel.messagePaginator.items!;
    channel.messagePaginator.ingestItem({
      ...items[items.length - 1],
      status: 'failed',
    });
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe((m) => {
      latestMessage = m[m.length - 1];
    });

    expect(latestMessage.status).toBe('failed');

    spyOn(channel, 'sendMessage').and.callThrough();
    spyOn(channel.messagePaginator, 'ingestItem').and.callThrough();
    await service.resendMessage(latestMessage);

    expect(channel.sendMessage).toHaveBeenCalledWith({
      message: jasmine.objectContaining({
        id: latestMessage.id,
      }),
    });

    const ingestSpy = channel.messagePaginator.ingestItem as jasmine.Spy;

    expect(ingestSpy.calls.first().args[0]).toEqual(
      jasmine.objectContaining({
        id: latestMessage.id,
        status: 'sending',
      })
    );

    expect(ingestSpy.calls.mostRecent().args[0]).toEqual(
      jasmine.objectContaining({
        id: latestMessage.id,
        status: 'received',
      })
    );

    expect(latestMessage.status).toBe('received');
    expect(latestMessage.errorStatusCode).toBeUndefined();
  });

  it('should ignore error if resend failed because message already exists', async () => {
    await init();
    const channel = getActiveChannel();
    const items = channel.messagePaginator.items!;
    channel.messagePaginator.ingestItem({
      ...items[items.length - 1],
      status: 'failed',
    });
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe((m) => {
      latestMessage = m[m.length - 1];
    });
    spyOn(channel, 'sendMessage').and.rejectWith(
      new StreamAPIError(
        'SendMessage failed with error: "a message with ID zitaszuperagetstreamio-9005f6d8-aeb7-42a1-984c-921f94567759 already exists"',
        { code: 4, status: 400, response: undefined }
      )
    );
    spyOn(channel.messagePaginator, 'ingestItem').and.callThrough();
    await service.resendMessage(latestMessage);

    expect(channel.messagePaginator.ingestItem).toHaveBeenCalledWith(
      jasmine.objectContaining({
        status: 'received',
      })
    );

    expect(latestMessage.status).toBe('received');
    expect(latestMessage.errorStatusCode).toBeUndefined();
  });

  it('should set message state while sending', async () => {
    await init();
    const channel = getActiveChannel();
    spyOn(channel, 'sendMessage').and.returnValue(new Promise(() => {}));
    const text = 'Hi';
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe(
      (m) => (latestMessage = m[m.length - 1])
    );
    void service.sendMessage(text);

    expect(latestMessage.text).toBe(text);
    expect(latestMessage.status).toBe('sending');
  });

  it('should set message state after message is sent', async () => {
    await init();
    const text = 'Hi';
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe(
      (m) => (latestMessage = m[m.length - 1])
    );
    await service.sendMessage(text);

    expect(latestMessage.text).toBe(text);
    expect(latestMessage.status).toBe('received');
  });

  // this could happen when a message was added to the local state while offline
  it('should handle message order change', async () => {
    await init();
    const channel = getActiveChannel();
    const items = [...channel.messagePaginator.items!];
    const localMessage = items.splice(items.length - 2, 1)[0];
    items.push(localMessage);
    channel.messagePaginator.setItems(items);
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe(
      (m) => (latestMessage = m[m.length - 1])
    );

    expect(latestMessage.id).toBe(localMessage.id);
  });

  it('should set message state, if an error occured', async () => {
    await init();
    const channel = getActiveChannel();
    spyOn(channel, 'sendMessage').and.callFake(() =>
      Promise.reject({ status: 500 })
    );
    spyOn(channel.messagePaginator, 'ingestItem').and.callThrough();
    const text = 'Hi';
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe(
      (m) => (latestMessage = m[m.length - 1])
    );
    const result = await service.sendMessage(text);

    expect(channel.messagePaginator.ingestItem).toHaveBeenCalledWith(
      jasmine.objectContaining({ status: 'failed' })
    );
    expect(latestMessage.status).toBe('failed');
    expect(latestMessage.errorStatusCode).toBe(500);
    expect(result.status).toBe('failed');
    expect(result.errorStatusCode).toBe(500);

    // resend clears the error status code
    (channel.sendMessage as jasmine.Spy).and.callThrough();
    await service.resendMessage(latestMessage);

    expect(latestMessage.status).toBe('received');
    expect(latestMessage.errorStatusCode).toBeUndefined();
  });

  it('should clear error status code if failed message is deleted locally', async () => {
    await init();
    const channel = getActiveChannel();
    spyOn(channel, 'sendMessage').and.rejectWith({ status: 500 });
    const failedMessage = await service.sendMessage('Hi');

    expect(failedMessage.errorStatusCode).toBe(500);

    await service.deleteMessage(failedMessage, true);

    expect(
      service.activeChannelMessages.find((m) => m.id === failedMessage.id)
    ).toBeUndefined();
    expect(service['errorStatusCodes'].has(failedMessage.id)).toBeFalse();
  });

  it('should add sent message to message list', async () => {
    await init();
    const channel = getActiveChannel();
    (spyOn(channel, 'sendMessage') as jasmine.Spy).and.callFake(() =>
      Promise.resolve({
        message: { id: 'new-message' },
      })
    );
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe(
      (m) => (latestMessage = m[m.length - 1])
    );
    await service.sendMessage('Hi');

    expect(latestMessage.id).toBe('new-message');
  });

  it(`shouldn't duplicate new message`, async () => {
    await init();
    const channel = getActiveChannel();
    await service.sendMessage('Hi');
    let newMessage!: StreamMessage;
    service.activeChannelMessages$.pipe(first()).subscribe((m) => {
      newMessage = m[m.length - 1];
    });
    // stream-chat ingests the message from the message.new event
    channel.messagePaginator.ingestItem(toLocal(newMessage));
    channel.handleEvent('message.new', { message: toLocal(newMessage) });
    let messages!: StreamMessage[];
    service.activeChannelMessages$.pipe(first()).subscribe((m) => {
      messages = m;
    });

    expect(messages.filter((m) => m.id === newMessage.id).length).toEqual(1);
  });

  it('should upload attachments', async () => {
    await init();
    const channel = getActiveChannel();
    (spyOn(channel, 'uploadImage') as jasmine.Spy).and.callFake(
      ({ file }: { file: File }) => {
        switch (file.name) {
          case 'file_error.jpg':
            return Promise.reject(
              apiError(
                'UploadImage failed with error: "File extension .jpg is not supported"'
              )
            );
          case 'file_too_big.jpg':
            return Promise.reject(
              apiError(
                'UploadImage failed with error: "File size is above the size limit (1048576 bytes)"'
              )
            );
          default:
            return Promise.resolve({
              file: 'http://url/to/image',
              duration: '200ms',
            });
        }
      }
    );
    (spyOn(channel, 'uploadFile') as jasmine.Spy).and.callFake(
      ({ file }: { file: File }) => {
        switch (file.name) {
          case 'file_error.pdf':
            return Promise.reject(
              apiError(
                'UploadFile failed with error: "max upload size of 50MB exceeded"',
                22,
                413
              )
            );
          default:
            return Promise.resolve({
              file: 'http://url/to/file',
              duration: '200ms',
              thumb_url:
                file.type && file.type.startsWith('video')
                  ? 'http://url/to/poster'
                  : undefined,
            });
        }
      }
    );
    const file1 = { name: 'food.png' } as File;
    const file2 = { name: 'file_error.jpg' } as File;
    const file3 = { name: 'menu.pdf' } as File;
    const file4 = { name: 'file_error.pdf' } as File;
    const file5 = { name: 'video.mp4', type: 'video/mp4' } as File;
    const file6 = { name: 'file_too_big.jpg', type: 'image/jpg' } as File;
    const attachments = [
      { file: file1, type: 'image', state: 'uploading' },
      { file: file2, type: 'image', state: 'uploading' },
      { file: file3, type: 'file', state: 'uploading' },
      { file: file4, type: 'file', state: 'uploading' },
      { file: file5, type: 'video', state: 'uploading' },
      { file: file6, type: 'image', state: 'uploading' },
    ] as AttachmentUpload[];
    const result = await service.uploadAttachments(attachments);
    const expectedResult: AttachmentUpload[] = [
      {
        file: file1,
        state: 'success',
        url: 'http://url/to/image',
        type: 'image',
        thumb_url: undefined,
      },
      {
        file: file2,
        state: 'error',
        type: 'image',
        errorReason: 'file-extension',
        errorExtraInfo: [{ param: '.jpg' }],
      },
      {
        file: file3,
        state: 'success',
        url: 'http://url/to/file',
        type: 'file',
        thumb_url: undefined,
      },
      {
        file: file4,
        state: 'error',
        type: 'file',
        errorReason: 'file-size',
        errorExtraInfo: [{ param: '50MB' }],
      },
      {
        file: file5,
        state: 'success',
        type: 'video',
        url: 'http://url/to/file',
        thumb_url: 'http://url/to/poster',
      },
      {
        file: file6,
        state: 'error',
        type: 'image',
        errorReason: 'file-size',
        errorExtraInfo: [{ param: '1MB' }],
      },
    ];

    expect(channel.uploadImage).toHaveBeenCalledWith({ file: file1 });
    expect(channel.uploadFile).toHaveBeenCalledWith({ file: file3 });

    expectedResult.forEach((r, i) => {
      expect(r).toEqual(result[i]);
    });
  });

  it('should delete image attachment', async () => {
    await init();
    const channel = getActiveChannel();
    spyOn(channel, 'deleteImage');
    const url = 'http://url/to/image';
    await service.deleteAttachment({
      url,
      type: 'image',
      state: 'success',
      file: {} as any as File,
    });

    expect(channel.deleteImage).toHaveBeenCalledWith({ url });
  });

  it('should delete file attachment', async () => {
    await init();
    const channel = getActiveChannel();
    spyOn(channel, 'deleteFile');
    const url = 'http://url/to/file';
    await service.deleteAttachment({
      url,
      type: 'file',
      state: 'success',
      file: {} as any as File,
    });

    expect(channel.deleteFile).toHaveBeenCalledWith({ url });
  });

  it('should update #readBy array, if active channel is read', async () => {
    await init();
    const channel = getActiveChannel();
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe(
      (messages) => (latestMessage = messages[messages.length - 1])
    );

    expect(latestMessage.readBy.length).toBe(0);

    const user = { id: 'jack', name: 'Jack' } as UserResponse;
    const read = {
      [user.id]: {
        last_read: dateToNs(new Date()),
        user,
        unread_messages: 0,
      },
    } as unknown as Channel['state']['read'];
    // stream-chat updates the read state on message.read events
    channel.state.read = read;
    (channel.state as unknown as MockStateStore<{ read: unknown }>).partialNext(
      { read }
    );

    expect(
      latestMessage.readBy.find((u) => u.id === 'jack')
    ).not.toBeUndefined();
  });

  it('should only update #readBy of the latest message, if read state changes', async () => {
    await init();
    const channel = getActiveChannel();
    const before = getLatestValue(service.activeChannelMessages$);
    const user = { id: 'jack', name: 'Jack' } as UserResponse;
    // jack read every message
    const read = {
      [user.id]: {
        last_read: dateToNs(new Date()),
        user,
        unread_messages: 0,
      },
    } as unknown as Channel['state']['read'];
    channel.state.read = read;
    (channel.state as unknown as MockStateStore<{ read: unknown }>).partialNext(
      { read }
    );
    const after = getLatestValue(service.activeChannelMessages$);

    expect(after).not.toBe(before);
    expect(after[after.length - 1]).not.toBe(before[before.length - 1]);
    expect(after[after.length - 1].readBy.map((u) => u.id)).toEqual(['jack']);
    after.slice(0, -1).forEach((m, i) => expect(m).toBe(before[i]));
  });

  it('should recalculate #readBy, if a channel is activated again (read events received while the channel was inactive)', async () => {
    const channels = generateMockChannels(2);
    await init(channels);
    const [channel, otherChannel] = channels;
    const before = getLatestValue(service.activeChannelMessages$);

    expect(before[before.length - 1].readBy.length).toBe(0);

    service.setAsActiveChannel(otherChannel);
    // jack reads the messages while the channel is inactive
    const user = { id: 'jack', name: 'Jack' } as UserResponse;
    const read = {
      [user.id]: {
        last_read: dateToNs(new Date()),
        user,
        unread_messages: 0,
      },
    } as unknown as Channel['state']['read'];
    channel.state.read = read;
    (channel.state as unknown as MockStateStore<{ read: unknown }>).partialNext(
      { read }
    );
    service.setAsActiveChannel(channel);
    const after = getLatestValue(service.activeChannelMessages$);

    expect(after[after.length - 1].readBy.map((u) => u.id)).toEqual(['jack']);
  });

  it('should update #readBy of every message, if a user is updated', async () => {
    await init();
    const channel = getActiveChannel();
    const user = { id: 'jack', name: 'Jack' } as UserResponse;
    const read = {
      [user.id]: {
        last_read: dateToNs(new Date()),
        user,
        unread_messages: 0,
      },
    } as unknown as Channel['state']['read'];
    channel.state.read = read;
    // Simulate a channel switch, so readBy is calculated for every message
    service.deselectActiveChannel();
    service.setAsActiveChannel(channel);
    const before = getLatestValue(service.activeChannelMessages$);

    expect(before.every((m) => m.readBy[0]?.name === 'Jack')).toBeTrue();

    channel.state.read = {
      [user.id]: { ...read[user.id], user: { ...user, name: 'Jack Updated' } },
    } as unknown as Channel['state']['read'];
    events$.next({
      eventType: 'user.updated',
      event: { type: 'user.updated', user },
    } as unknown as ClientEvent);
    const after = getLatestValue(service.activeChannelMessages$);

    expect(after.every((m) => m.readBy[0]?.name === 'Jack Updated')).toBeTrue();
  });

  it('should update translations, if the translation language changes', async () => {
    await init();
    const channel = getActiveChannel();
    mockChatClient.user = { ...mockChatClient.user, language: 'ja' };
    const translatedMessage = {
      ...toLocal(mockMessage(1)),
      user: { id: 'jack' },
      i18n: { ja_text: 'こんにちは', fr_text: 'Bonjour', language: 'en' },
    } as unknown as LocalMessage;
    const otherMessage = {
      ...toLocal(mockMessage(2)),
      user: { id: 'jack' },
    } as LocalMessage;
    mockPaginator(channel).setItems([translatedMessage, otherMessage]);
    const before = getLatestValue(service.activeChannelMessages$);

    expect(before[0].translation).toBe('こんにちは');

    // the user's language changed
    mockChatClient.user = { ...mockChatClient.user, language: 'fr' };
    events$.next({
      eventType: 'user.updated',
      event: { type: 'user.updated', user: mockChatClient.user },
    } as unknown as ClientEvent);
    const after = getLatestValue(service.activeChannelMessages$);

    expect(after[0].translation).toBe('Bonjour');

    // the user has no language, the auto translation language of the channel changed
    mockChatClient.user = {
      ...mockChatClient.user,
      language: undefined,
    } as unknown as UserResponse;
    channel.data!.auto_translation_language = 'ja';
    channel.handleEvent('channel.updated', {
      type: 'channel.updated',
      cid: channel.cid,
    });

    expect(getLatestValue(service.activeChannelMessages$)[0].translation).toBe(
      'こんにちは'
    );
  });

  it(`shouldn't create new message objects, if the translation language didn't change`, async () => {
    await init();
    const before = getLatestValue(service.activeChannelMessages$);
    events$.next({
      eventType: 'user.updated',
      event: { type: 'user.updated', user: mockChatClient.user },
    } as unknown as ClientEvent);
    const after = getLatestValue(service.activeChannelMessages$);

    expect(after.length).toBe(before.length);
    expect(after.every((m, i) => m === before[i])).toBeTrue();
  });

  it(`should unsubscribe from active channel events, after active channel changed`, async () => {
    await init();
    const spy = jasmine.createSpy('activeMessagesSpy');
    service.activeChannelMessages$.subscribe(spy);
    const pinnedMessagesSpy = jasmine.createSpy();
    service.activeChannelPinnedMessages$.subscribe(pinnedMessagesSpy);
    const paginationStateSpy = jasmine.createSpy();
    service.activeChannelMessagesPaginationState$.subscribe(paginationStateSpy);
    const prevActiveChannel = getActiveChannel();
    const newActiveChannel = generateMockChannels()[1];
    service.setAsActiveChannel(newActiveChannel);
    spy.calls.reset();
    pinnedMessagesSpy.calls.reset();
    paginationStateSpy.calls.reset();
    prevActiveChannel.handleEvent('message.new', {
      message: { ...toLocal(mockMessage(100)), user: { id: 'jill' } },
    });
    prevActiveChannel.messagePaginator.ingestItem(toLocal(mockMessage(100)));
    mockPaginator(prevActiveChannel).state.partialNext({
      hasMoreHead: true,
      isLoading: true,
    });
    prevActiveChannel.pinnedMessagesPaginator.setItems(
      generateMockLocalMessages()
    );
    (
      prevActiveChannel.state as unknown as MockStateStore<{ read: unknown }>
    ).partialNext({ read: {} });

    expect(spy).not.toHaveBeenCalled();
    expect(pinnedMessagesSpy).not.toHaveBeenCalled();
    expect(paginationStateSpy).not.toHaveBeenCalled();
  });

  it('should query members, less than 100 members', async () => {
    await init();
    const channel = generateMockChannels(1)[0];
    channel.cid = 'new-channel';
    channel.state.members = {
      jack: { user: { id: 'jack', name: 'Jack' } },
      john: { user: { id: 'john' } },
      [user.id]: { user },
    } as any as Record<string, ChannelMemberResponse>;
    channel.data = { member_count: 3, own_capabilities: [] } as any;
    service.setAsActiveChannel(channel);
    const result = await service.autocompleteMembers('ja');
    const expectedResult = [
      { user: { id: 'jack', name: 'Jack' } },
      { user: { id: 'john' } },
    ];

    expect(result as unknown).toEqual(expectedResult);
  });

  it('should query members, more than 100 members', async () => {
    await init();
    const channel = generateMockChannels(1)[0];
    channel.cid = 'new-channel';
    (spyOn(channel, 'queryMembers') as jasmine.Spy).and.resolveTo({
      members: [
        { user_id: mockCurrentUser().id },
        { user_id: 'jack' },
      ] as unknown as ChannelMemberResponse[],
      duration: '0ms',
    });
    const users = Array.from({ length: 101 }, (_, i) => ({ id: `${i}` }));
    channel.state.members = {} as any as Record<string, ChannelMemberResponse>;
    users.forEach(
      (u) =>
        (channel.state.members[u.id] = {
          user: u,
        } as unknown as ChannelMemberResponse)
    );
    service.setAsActiveChannel(channel);
    const result = await service.autocompleteMembers('ja');

    expect(channel.queryMembers).toHaveBeenCalledWith({
      payload: {
        filter_conditions: {
          name: { $autocomplete: 'ja' },
        },
      },
    });

    expect(result.length).toBe(1);
  });

  it('should select message to be quoted', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.messageToQuote$.subscribe(spy);
    const message = mockMessage();
    service.selectMessageToQuote(message);

    expect(spy).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: message.id, text: message.text })
    );

    // LocalMessage is converted to StreamMessage, dates stay TimestampNS
    const localMessage = getActiveChannel().messagePaginator.items![0];
    service.selectMessageToQuote(localMessage);

    expect(spy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        id: localMessage.id,
        created_at: localMessage.created_at,
      })
    );
  });

  it('should deselect message to be quoted', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.messageToQuote$.subscribe(spy);
    service.selectMessageToQuote(undefined);

    expect(spy).toHaveBeenCalledWith(undefined);
  });

  it('should notify channel if typing started', async () => {
    await init();
    const channel = getActiveChannel();
    spyOn(channel, 'keystroke');
    await service.typingStarted();

    expect(channel.keystroke).toHaveBeenCalledWith(undefined);
  });

  it('should notify channel if typing stopped', async () => {
    await init();
    const channel = getActiveChannel();
    spyOn(channel, 'stopTyping');
    await service.typingStopped();

    expect(channel.stopTyping).toHaveBeenCalledWith(undefined);
  });

  it('should emit users that are currently typing', async () => {
    await init();
    const usersTypingInChannelSpy = jasmine.createSpy();
    const usersTypingInThreadSpy = jasmine.createSpy();
    service.usersTypingInChannel$.subscribe(usersTypingInChannelSpy);
    service.usersTypingInThread$.subscribe((e) => {
      usersTypingInThreadSpy(e);
    });
    const channel = getActiveChannel();
    usersTypingInThreadSpy.calls.reset();
    usersTypingInChannelSpy.calls.reset();
    channel.handleEvent('typing.start', {
      type: 'typing.start',
      user: { id: 'sara' },
    });

    expect(usersTypingInChannelSpy).toHaveBeenCalledWith([{ id: 'sara' }]);
    expect(usersTypingInThreadSpy).not.toHaveBeenCalled();

    usersTypingInThreadSpy.calls.reset();
    usersTypingInChannelSpy.calls.reset();
    channel.handleEvent('typing.start', {
      type: 'typing.start',
      user: { id: 'john' },
    });

    expect(usersTypingInChannelSpy).toHaveBeenCalledWith([
      { id: 'sara' },
      { id: 'john' },
    ]);

    expect(usersTypingInThreadSpy).not.toHaveBeenCalled();

    usersTypingInThreadSpy.calls.reset();
    usersTypingInChannelSpy.calls.reset();
    channel.handleEvent('typing.stop', {
      type: 'typing.stop',
      user: { id: 'sara' },
    });

    expect(usersTypingInChannelSpy).toHaveBeenCalledWith([{ id: 'john' }]);
    expect(usersTypingInThreadSpy).not.toHaveBeenCalled();

    usersTypingInThreadSpy.calls.reset();
    usersTypingInChannelSpy.calls.reset();
    channel.handleEvent('typing.start', {
      type: 'typing.start',
      user,
    });

    expect(usersTypingInChannelSpy).not.toHaveBeenCalled();
    expect(usersTypingInThreadSpy).not.toHaveBeenCalled();
  });

  it('should emit users that are currently typing in the active thread', async () => {
    await init();
    const parentMessage = getLatestValue(service.activeChannelMessages$)[0];
    await service.setAsActiveParentMessage(parentMessage);
    const usersTypingInThreadSpy = jasmine.createSpy();
    service.usersTypingInThread$.subscribe(usersTypingInThreadSpy);
    usersTypingInThreadSpy.calls.reset();
    const channel = getActiveChannel();
    channel.handleEvent('typing.start', {
      type: 'typing.start',
      user: { id: 'sara' },
      parent_id: parentMessage.id,
    });

    expect(usersTypingInThreadSpy).toHaveBeenCalledWith([{ id: 'sara' }]);

    usersTypingInThreadSpy.calls.reset();
    channel.handleEvent('typing.start', {
      type: 'typing.start',
      user: { id: 'john' },
      parent_id: 'other-thread',
    });

    expect(usersTypingInThreadSpy).not.toHaveBeenCalled();
  });

  it('should emit the date of latest messages sent by the user by channels', async () => {
    await init();
    const activeChannel = getActiveChannel();
    const createdAt = new Date();
    const newMessage = {
      ...toLocal(mockMessage()),
      cid: 'channel1',
      created_at: dateToNs(createdAt),
      user_id: user.id,
    };
    const spy = jasmine.createSpy();
    service.latestMessageDateByUserByChannels$.subscribe(spy);
    activeChannel.handleEvent('message.new', {
      message: newMessage,
    });

    expect(spy).toHaveBeenCalledWith({
      channel1: nsToDate(dateToNs(createdAt)),
    });
  });

  it('should call custom #customFileUploadRequest and #customImageUploadRequest if provided', async () => {
    await init();
    const channel = getActiveChannel();
    const customImageUploadRequest = jasmine
      .createSpy()
      .and.callFake((file: File) => {
        switch (file.name) {
          case 'file_error.jpg':
            return Promise.reject(new Error());
          default:
            return Promise.resolve({ file: 'http://url/to/image' });
        }
      });
    const customFileUploadRequest = jasmine
      .createSpy()
      .and.callFake((file: File) => {
        switch (file.name) {
          case 'file_error.pdf':
            return Promise.reject(new Error());
          default:
            return Promise.resolve({
              file: 'http://url/to/pdf',
              thumb_url: undefined,
            });
        }
      });
    service.customImageUploadRequest = customImageUploadRequest;
    service.customFileUploadRequest = customFileUploadRequest;
    spyOn(channel, 'uploadImage');
    spyOn(channel, 'uploadFile');
    const file1 = { name: 'food.png' } as File;
    const file2 = { name: 'file_error.jpg' } as File;
    const file3 = { name: 'menu.pdf' } as File;
    const file4 = { name: 'file_error.pdf' } as File;
    const attachments = [
      { file: file1, type: 'image', state: 'uploading' },
      { file: file2, type: 'image', state: 'uploading' },
      { file: file3, type: 'file', state: 'uploading' },
      { file: file4, type: 'file', state: 'uploading' },
    ] as AttachmentUpload[];
    const result = await service.uploadAttachments(attachments);
    const expectedResult: AttachmentUpload[] = [
      {
        file: file1,
        state: 'success',
        url: 'http://url/to/image',
        type: 'image',
        thumb_url: undefined,
      },
      {
        file: file2,
        state: 'error',
        type: 'image',
        errorReason: 'unknown',
        errorExtraInfo: undefined,
      },
      {
        file: file3,
        state: 'success',
        url: 'http://url/to/pdf',
        type: 'file',
        thumb_url: undefined,
      },
      {
        file: file4,
        state: 'error',
        type: 'file',
        errorReason: 'unknown',
        errorExtraInfo: undefined,
      },
    ];

    expect(customImageUploadRequest).toHaveBeenCalledWith(file1, channel);
    expect(customFileUploadRequest).toHaveBeenCalledWith(file3, channel);
    expect(channel.uploadImage).not.toHaveBeenCalled();
    expect(channel.uploadFile).not.toHaveBeenCalled();

    expectedResult.forEach((r, i) => {
      expect(r).toEqual(result[i]);
    });
  });

  it('should call custom #customImageDeleteRequest if provided', async () => {
    await init();
    const channel = getActiveChannel();
    const customImageDeleteRequest = jasmine.createSpy();
    service.customImageDeleteRequest = customImageDeleteRequest;
    spyOn(channel, 'deleteImage');
    const url = 'http://url/to/image';
    await service.deleteAttachment({
      url,
      type: 'image',
      state: 'success',
      file: {} as any as File,
    });

    expect(customImageDeleteRequest).toHaveBeenCalledWith(url, channel);
    expect(channel.deleteImage).not.toHaveBeenCalled();
  });

  it('should call custom #customFileDeleteRequest if provided', async () => {
    await init();
    const channel = getActiveChannel();
    const customFileDeleteRequest = jasmine.createSpy();
    service.customFileDeleteRequest = customFileDeleteRequest;
    spyOn(channel, 'deleteFile');
    const url = 'http://url/to/file';
    await service.deleteAttachment({
      url,
      type: 'file',
      state: 'success',
      file: {} as any as File,
    });

    expect(customFileDeleteRequest).toHaveBeenCalledWith(url, channel);
    expect(channel.deleteFile).not.toHaveBeenCalled();
  });

  it('should reset state after connection recovered', async () => {
    await init();
    mockChatClient.queryChannels.calls.reset();
    events$.next({ eventType: 'connection.recovered' } as ClientEvent);

    expect(mockChatClient.queryChannelsAndHydrate).toHaveBeenCalledWith(
      jasmine.objectContaining({ filter_conditions: filters })
    );
  });

  it(`shouldn't do duplicate state reset after connection recovered`, async () => {
    await init();
    mockChatClient.queryChannels.calls.reset();
    events$.next({ eventType: 'connection.recovered' } as ClientEvent);
    events$.next({ eventType: 'connection.recovered' } as ClientEvent);

    expect(mockChatClient.queryChannelsAndHydrate).toHaveBeenCalledTimes(1);
  });

  it('should reset pagination options after reconnect', async () => {
    await init(undefined, undefined, { limit: 20 });
    await service.loadMoreChannels();
    mockChatClient.queryChannels.calls.reset();
    events$.next({ eventType: 'connection.recovered' } as ClientEvent);

    expect(mockChatClient.queryChannelsAndHydrate).toHaveBeenCalledWith({
      limit: 20,
      state: true,
      presence: true,
      watch: true,
      message_limit: 25,
      filter_conditions: filters,
      sort: [{ field: 'last_message_at', direction: -1 }],
    });
  });

  it('should keep active thread open and reselect message to quote after connection recovered', async () => {
    await init();
    const channel = getActiveChannel();
    const messages = getLatestValue(service.activeChannelMessages$);
    await service.setAsActiveParentMessage(messages[0]);
    service.selectMessageToQuote(messages[1]);
    const parentMessageIdSpy = jasmine.createSpy();
    service.activeParentMessageId$.subscribe(parentMessageIdSpy);
    const messageToQuoteSpy = jasmine.createSpy();
    service.messageToQuote$.subscribe(messageToQuoteSpy);
    parentMessageIdSpy.calls.reset();
    messageToQuoteSpy.calls.reset();
    // stream-chat reloads the active channel
    const items = [...channel.messagePaginator.items!];
    items[1] = { ...items[1], text: 'updated while offline' };
    channel.messagePaginator.setItems(items);
    mockChatClient.queryChannels.and.resolveTo(service.channels);
    events$.next({ eventType: 'connection.recovered' } as ClientEvent);
    await settle();

    // stream-chat reloads the activated thread, so it can stay open
    expect(parentMessageIdSpy).not.toHaveBeenCalledWith(undefined);
    expect(service['activeThread']?.id).toBe(messages[0].id);
    expect(messageToQuoteSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        id: messages[1].id,
        text: 'updated while offline',
      })
    );
  });

  it('should load message into state', async () => {
    await init();
    const jumpToMessageIdSpy = jasmine.createSpy();
    service.jumpToMessage$.subscribe(jumpToMessageIdSpy);
    jumpToMessageIdSpy.calls.reset();
    const messagesSpy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(messagesSpy);
    messagesSpy.calls.reset();
    const paginator = mockPaginator(getActiveChannel());
    spyOn(paginator, 'jumpToMessage').and.callThrough();
    const messageId = '1232121123';
    const response = service.jumpToMessage(messageId);

    expect(service.isMessageLoadingInProgress).toBeTrue();

    await response;

    expect(paginator.jumpToMessage).toHaveBeenCalledWith(messageId, {
      pageSize: 25,
      suppressFocusSignal: true,
    });

    expect(jumpToMessageIdSpy).toHaveBeenCalledWith({
      id: messageId,
      parentId: undefined,
    });

    expect(messagesSpy).toHaveBeenCalledWith(
      jasmine.arrayContaining([jasmine.objectContaining({ id: messageId })])
    );
    expect(service.isMessageLoadingInProgress).toBeFalse();
  });

  it('should jump to latest message', async () => {
    await init();
    const jumpToMessageIdSpy = jasmine.createSpy();
    service.jumpToMessage$.subscribe(jumpToMessageIdSpy);
    jumpToMessageIdSpy.calls.reset();
    const paginator = mockPaginator(getActiveChannel());
    spyOn(paginator, 'jumpToTheLatestMessage').and.callThrough();
    spyOn(paginator, 'jumpToMessage').and.callThrough();
    await service.jumpToMessage('latest');

    expect(paginator.jumpToTheLatestMessage).toHaveBeenCalledWith({
      suppressFocusSignal: true,
    });
    expect(paginator.jumpToMessage).not.toHaveBeenCalled();
    expect(jumpToMessageIdSpy).toHaveBeenCalledWith({
      id: 'latest',
      parentId: undefined,
    });
  });

  it(`should display error notification if message couldn't be loaded`, async () => {
    await init();
    const jumpToMessageIdSpy = jasmine.createSpy();
    service.jumpToMessage$.subscribe(jumpToMessageIdSpy);
    jumpToMessageIdSpy.calls.reset();
    const messagesSpy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(messagesSpy);
    messagesSpy.calls.reset();
    const paginator = mockPaginator(getActiveChannel());
    const error = apiError('GetOrCreateChannel failed with error: "error"');
    spyOn(paginator, 'jumpToMessage').and.rejectWith(error);
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    const messageId = '1232121123';
    await expectAsync(service.jumpToMessage(messageId)).toBeRejectedWith(error);

    expect(jumpToMessageIdSpy).not.toHaveBeenCalled();
    expect(messagesSpy).not.toHaveBeenCalled();
    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Message not found'
    );
    expect(service.isMessageLoadingInProgress).toBeFalse();
  });

  it(`should display error notification if message couldn't be loaded - paginator doesn't throw API errors`, async () => {
    await init();
    const jumpToMessageIdSpy = jasmine.createSpy();
    service.jumpToMessage$.subscribe(jumpToMessageIdSpy);
    jumpToMessageIdSpy.calls.reset();
    const paginator = mockPaginator(getActiveChannel());
    // By default (throwErrors: false) the stream-chat paginator records the error and resolves to false
    spyOn(paginator, 'jumpToMessage').and.callFake(() => {
      paginator.state.partialNext({
        lastQueryError: apiError(
          'GetOrCreateChannel failed with error: "error"',
          -1,
          500
        ),
      });
      return Promise.resolve(false);
    });
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    await expectAsync(service.jumpToMessage('1232121123')).toBeRejected();

    expect(jumpToMessageIdSpy).not.toHaveBeenCalled();
    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Message not found'
    );
    expect(service.isMessageLoadingInProgress).toBeFalse();
  });

  it(`should display error notification if message wasn't found`, async () => {
    await init();
    const jumpToMessageIdSpy = jasmine.createSpy();
    service.jumpToMessage$.subscribe(jumpToMessageIdSpy);
    jumpToMessageIdSpy.calls.reset();
    const paginator = mockPaginator(getActiveChannel());
    paginator.loadAround = () => undefined;
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    await expectAsync(service.jumpToMessage('not-found')).toBeRejected();

    expect(jumpToMessageIdSpy).not.toHaveBeenCalled();
    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Message not found'
    );
    expect(service.isMessageLoadingInProgress).toBeFalse();
  });

  it('should jump to thread message', async () => {
    await init();
    const jumpToMessageIdSpy = jasmine.createSpy();
    service.jumpToMessage$.subscribe(jumpToMessageIdSpy);
    jumpToMessageIdSpy.calls.reset();
    const channelPaginator = mockPaginator(getActiveChannel());
    spyOn(channelPaginator, 'jumpToMessage').and.callThrough();
    const parentMessage = channelPaginator.items![5];
    const messageId = 'thread-reply';
    await service.jumpToMessage(messageId, parentMessage.id);
    const thread = mockChatClient.threads.get(parentMessage.id)!;

    // parent message is already loaded
    expect(channelPaginator.jumpToMessage).not.toHaveBeenCalled();
    expect(getLatestValue(service.activeParentMessageId$)).toBe(
      parentMessage.id
    );
    expect(thread.messagePaginator.messageFocusSignal.getLatestValue()).toEqual(
      { signal: { messageId } }
    );
    expect(
      getLatestValue(service.activeThreadMessages$).find(
        (m) => m.id === messageId
      )
    ).toBeDefined();
    expect(jumpToMessageIdSpy).toHaveBeenCalledWith({
      id: messageId,
      parentId: parentMessage.id,
    });
  });

  it('should jump to thread message - parent message not loaded', async () => {
    await init();
    const channel = getActiveChannel();
    const channelPaginator = mockPaginator(channel);
    spyOn(channelPaginator, 'jumpToMessage').and.callThrough();
    const parentMessageId = 'parent-message';
    const messageId = 'thread-reply';
    await service.jumpToMessage(messageId, parentMessageId);

    expect(channelPaginator.jumpToMessage).toHaveBeenCalledWith(
      parentMessageId,
      { pageSize: 25, suppressFocusSignal: true }
    );
    expect(getLatestValue(service.activeParentMessageId$)).toBe(
      parentMessageId
    );
    expect(getLatestValue(service.activeParentMessage$)?.id).toBe(
      parentMessageId
    );
    expect(getLatestValue(service.jumpToMessage$)).toEqual({
      id: messageId,
      parentId: parentMessageId,
    });
  });

  it('should jump to first unread message', async () => {
    await init();
    const jumpToMessageIdSpy = jasmine.createSpy();
    service.jumpToMessage$.subscribe(jumpToMessageIdSpy);
    jumpToMessageIdSpy.calls.reset();
    const paginator = mockPaginator(getActiveChannel());
    spyOn(paginator, 'jumpToTheFirstUnreadMessage').and.callFake(() => {
      paginator.messageFocusSignal.next({ signal: { messageId: '10' } });
      return Promise.resolve(true);
    });

    const result = await service.jumpToFirstUnreadMessage();

    expect(result).toBeTrue();
    expect(paginator.jumpToTheFirstUnreadMessage).toHaveBeenCalledWith({
      pageSize: 25,
    });
    expect(jumpToMessageIdSpy).toHaveBeenCalledWith({ id: '10' });
    expect(service.isMessageLoadingInProgress).toBeFalse();
  });

  it('should jump to first unread message - unsuccessful', async () => {
    expect(await service.jumpToFirstUnreadMessage()).toBeFalse();

    await init();
    const jumpToMessageIdSpy = jasmine.createSpy();
    service.jumpToMessage$.subscribe(jumpToMessageIdSpy);
    jumpToMessageIdSpy.calls.reset();
    const result = await service.jumpToFirstUnreadMessage();

    expect(result).toBeFalse();
    expect(jumpToMessageIdSpy).not.toHaveBeenCalled();
    expect(service.isMessageLoadingInProgress).toBeFalse();
  });

  it('should jump to first unread message - error', async () => {
    await init();
    const paginator = mockPaginator(getActiveChannel());
    const error = apiError('GetOrCreateChannel failed with error: "error"');
    spyOn(paginator, 'jumpToTheFirstUnreadMessage').and.rejectWith(error);
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');

    await expectAsync(service.jumpToFirstUnreadMessage()).toBeRejectedWith(
      error
    );

    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Message not found'
    );
    expect(service.isMessageLoadingInProgress).toBeFalse();
  });

  it(`should jump to first unread message - error, paginator doesn't throw API errors`, async () => {
    await init();
    const paginator = mockPaginator(getActiveChannel());
    const error = apiError(
      'GetOrCreateChannel failed with error: "error"',
      -1,
      500
    );
    spyOn(paginator, 'jumpToTheFirstUnreadMessage').and.callFake(() => {
      paginator.state.partialNext({ lastQueryError: error });
      return Promise.resolve(false);
    });
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');

    await expectAsync(service.jumpToFirstUnreadMessage()).toBeRejectedWith(
      error
    );

    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Message not found'
    );
    expect(service.isMessageLoadingInProgress).toBeFalse();
  });

  it(`shouldn't display error notification if there is no unread message to jump to`, async () => {
    await init();
    const paginator = mockPaginator(getActiveChannel());
    // An error of an earlier query shouldn't be reported again
    paginator.state.partialNext({
      lastQueryError: apiError('earlier error', -1, 500),
    });
    spyOn(paginator, 'jumpToTheFirstUnreadMessage').and.resolveTo(false);
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');

    expect(await service.jumpToFirstUnreadMessage()).toBeFalse();
    expect(notificationService.addTemporaryNotification).not.toHaveBeenCalled();
    expect(service.isMessageLoadingInProgress).toBeFalse();
  });

  it('should set active parent message', async () => {
    await init();
    const channel = getActiveChannel();
    const parentMessage = getLatestValue(service.activeChannelMessages$)[3];
    const ensureSpy = spyOn(mockChatClient.threads, 'ensure').and.callThrough();
    const threadMessagesSpy = jasmine.createSpy();
    service.activeThreadMessages$.subscribe(threadMessagesSpy);
    await service.setAsActiveParentMessage(parentMessage);
    const thread = mockChatClient.threads.get(parentMessage.id)!;

    expect(ensureSpy).toHaveBeenCalledWith({
      channel,
      parentMessage: channel.messagePaginator.getItem(parentMessage.id)!,
    });
    expect(getLatestValue(service.activeParentMessageId$)).toBe(
      parentMessage.id
    );
    expect(getLatestValue(service.activeParentMessage$)?.id).toBe(
      parentMessage.id
    );
    expect(thread.state.getLatestValue().active).toBeTrue();
    expect(
      (threadMessagesSpy.calls.mostRecent().args[0] as StreamMessage[]).map(
        (m) => m.id
      )
    ).toEqual(thread.messagePaginator.items!.map((m) => m.id));

    // thread paginator changes are emitted
    threadMessagesSpy.calls.reset();
    const newReply = {
      ...toLocal(mockMessage(100)),
      parent_id: parentMessage.id,
    };
    thread.messagePaginator.ingestItem(newReply);

    const replies = threadMessagesSpy.calls.mostRecent()
      .args[0] as StreamMessage[];

    expect(replies[replies.length - 1].id).toBe(newReply.id);
    // thread replies don't have readBy
    expect(replies[replies.length - 1].readBy).toEqual([]);

    // same thread selected twice
    ensureSpy.calls.reset();
    await service.setAsActiveParentMessage(parentMessage);

    expect(ensureSpy).not.toHaveBeenCalled();

    // deselect
    threadMessagesSpy.calls.reset();
    await service.setAsActiveParentMessage(undefined);

    expect(thread.state.getLatestValue().active).toBeFalse();
    expect(threadMessagesSpy).toHaveBeenCalledWith([]);
    expect(getLatestValue(service.activeParentMessageId$)).toBeUndefined();

    threadMessagesSpy.calls.reset();
    thread.messagePaginator.ingestItem({
      ...toLocal(mockMessage(101)),
      parent_id: parentMessage.id,
    });

    expect(threadMessagesSpy).not.toHaveBeenCalled();
  });

  it('should reuse existing thread instance', async () => {
    await init();
    const channel = getActiveChannel();
    const parentMessage = getLatestValue(service.activeChannelMessages$)[3];
    const thread = mockChatClient.threads.ensure({
      channel,
      parentMessage: channel.messagePaginator.getItem(parentMessage.id)!,
    });
    const ensureSpy = spyOn(mockChatClient.threads, 'ensure').and.callThrough();
    spyOn(thread, 'activate').and.callThrough();
    await service.setAsActiveParentMessage(parentMessage);

    expect(ensureSpy).not.toHaveBeenCalled();
    expect(thread.activate).toHaveBeenCalledWith();
  });

  it('should reload thread if it has stale state', async () => {
    await init();
    const channel = getActiveChannel();
    const parentMessage = getLatestValue(service.activeChannelMessages$)[3];
    const thread: MockThread = mockChatClient.threads.ensure({
      channel,
      parentMessage: channel.messagePaginator.getItem(parentMessage.id)!,
    });
    thread.hasStaleState = true;
    const callOrder: string[] = [];
    spyOn(thread, 'reload').and.callFake(() => {
      callOrder.push('reload');
      return Promise.resolve();
    });
    spyOn(thread, 'activate').and.callFake(() => {
      callOrder.push('activate');
      return () => {};
    });
    await service.setAsActiveParentMessage(parentMessage);

    expect(callOrder).toEqual(['reload', 'activate']);
  });

  it('should display error if thread reload failed', async () => {
    await init();
    const channel = getActiveChannel();
    const parentMessage = getLatestValue(service.activeChannelMessages$)[3];
    const thread: MockThread = mockChatClient.threads.ensure({
      channel,
      parentMessage: channel.messagePaginator.getItem(parentMessage.id)!,
    });
    thread.hasStaleState = true;
    const error = apiError('GetThread failed with error: "error"');
    spyOn(thread, 'reload').and.rejectWith(error);
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    await service.setAsActiveParentMessage(parentMessage);

    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Error loading messages'
    );
    expect(
      getLatestValue(service.activeThreadMessagesPaginationState$)
    ).toEqual(jasmine.objectContaining({ isLoading: false, error }));
  });

  it('should emit parent message from thread, if parent message is not in the channel message list', async () => {
    await init();
    const parentMessage = mockMessage(999);
    await service.setAsActiveParentMessage(parentMessage);

    const activeParentMessage = getLatestValue(service.activeParentMessage$);

    expect(activeParentMessage?.id).toBe(parentMessage.id);
    expect(activeParentMessage?.created_at).toEqual(parentMessage.created_at);
  });

  it('should release active thread on channel switch', async () => {
    await init();
    const parentMessage = getLatestValue(service.activeChannelMessages$)[3];
    await service.setAsActiveParentMessage(parentMessage);
    const thread = mockChatClient.threads.get(parentMessage.id)!;

    expect(thread.state.getLatestValue().active).toBeTrue();

    service.setAsActiveChannel(service.channels[1]);

    expect(thread.state.getLatestValue().active).toBeFalse();
    expect(getLatestValue(service.activeThreadMessages$)).toEqual([]);
  });

  it('should pin message', async () => {
    await init();
    const message = mockMessage();
    await service.pinMessage(message);

    expect(mockChatClient.pinMessage).toHaveBeenCalledWith({ id: message.id });
  });

  it('should display error notification if pinning was unsuccesful', async () => {
    await init();
    const message = mockMessage();
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification').and.callThrough();
    const error = apiError('UpdateMessagePartial failed with error: "error"');
    mockChatClient.pinMessage.and.rejectWith(error);

    await expectAsync(service.pinMessage(message)).toBeRejectedWith(error);

    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Error pinning message'
    );
  });

  it('should unpin message', async () => {
    await init();
    const message = mockMessage();
    await service.unpinMessage(message);

    expect(mockChatClient.unpinMessage).toHaveBeenCalledWith({
      id: message.id,
    });
  });

  it('should display error notification if unpinning was unsuccesful', async () => {
    await init();
    const message = mockMessage();
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification').and.callThrough();
    const error = apiError('UpdateMessagePartial failed with error: "error"');
    mockChatClient.unpinMessage.and.rejectWith(error);

    await expectAsync(service.unpinMessage(message)).toBeRejectedWith(error);

    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Error removing message pin'
    );
  });

  it('should keep active channel if active channel is not present after state reconnect', async () => {
    await init();
    const activeChannel = getActiveChannel();
    const channels = service.channels.filter(
      (c) => c.cid !== activeChannel.cid
    );
    mockChatClient.queryChannels.and.resolveTo(channels);
    const spy = jasmine.createSpy();
    service.activeChannel$.subscribe(spy);
    spy.calls.reset();
    spyOn(service, 'deselectActiveChannel').and.callThrough();
    events$.next({ eventType: 'connection.recovered' } as ClientEvent);
    await settle();

    // The active channel is activated, so stream-chat reloads it after reconnect
    expect(service.deselectActiveChannel).not.toHaveBeenCalled();
    expect(service.activeChannel).toBe(activeChannel);
    expect(service.channels).toContain(activeChannel);
  });

  it(`shouldn't deselect active channel if active channel is present after state reconnect`, async () => {
    await init();
    const channels = service.channels;
    const activeChannel = channels[0] as MockChannel;
    const spy = jasmine.createSpy();
    service.activeChannel$.subscribe(spy);
    spy.calls.reset();
    const messagesSpy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(messagesSpy);
    messagesSpy.calls.reset();
    mockChatClient.queryChannels.and.resolveTo(channels);
    spyOn(service, 'deselectActiveChannel').and.callThrough();
    events$.next({ eventType: 'connection.recovered' } as ClientEvent);
    // stream-chat reloads the active channel
    const newMessage = {
      ...toLocal(mockMessage(100)),
      text: 'new message received while offline',
    };
    activeChannel.messagePaginator.ingestItem(newMessage);
    await settle();

    expect(spy).not.toHaveBeenCalled();
    expect(service.deselectActiveChannel).not.toHaveBeenCalled();
    expect(messagesSpy).toHaveBeenCalledWith(
      jasmine.arrayContaining([
        jasmine.objectContaining({ id: newMessage.id, text: newMessage.text }),
      ])
    );
  });

  it('should add new channel to channel list', () => {
    const channelsSpy = jasmine.createSpy();
    service.channels$.subscribe(channelsSpy);
    channelsSpy.calls.reset();

    const newChannel = generateMockChannels(1)[0];
    newChannel.cid = 'my-new-channel';
    spyOn(service as any, 'watchForChannelEvents').and.callThrough();
    service.setAsActiveChannel(newChannel);

    expect(channelsSpy).toHaveBeenCalledWith(
      jasmine.arrayContaining([newChannel])
    );

    //eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect((service as any).watchForChannelEvents).toHaveBeenCalledWith(
      newChannel
    );
  });

  it('should do nothing if same channel is selected twice', () => {
    const activeChannel = generateMockChannels()[0];

    service.setAsActiveChannel(activeChannel);

    const spy = jasmine.createSpy();
    service.activeChannel$.subscribe(spy);
    spy.calls.reset();
    spyOn(activeChannel, 'activate').and.callThrough();
    service.setAsActiveChannel(activeChannel);

    expect(spy).not.toHaveBeenCalled();
    expect(activeChannel.activate).not.toHaveBeenCalled();
  });

  it('should set last read message id', () => {
    const activeChannel = generateMockChannels()[0];
    activeChannel.id = 'next-active-channel';
    activeChannel.state.read[user.id] = {
      last_read: dateToNs(new Date()),
      last_read_message_id: 'last-read-message-id',
      unread_messages: 5,
      user: user,
    } as unknown as Channel['state']['read'][string];

    service.setAsActiveChannel(activeChannel);

    expect(service.activeChannelLastReadMessageId).toBe('last-read-message-id');
    expect(service.activeChannelUnreadCount).toBe(5);
  });

  it(`should set last read message id to undefined if it's the last message`, () => {
    const activeChannel = generateMockChannels()[0];
    activeChannel.id = 'next-active-channel';
    activeChannel.state.read[user.id] = {
      last_read: dateToNs(new Date()),
      last_read_message_id: 'last-read-message-id',
      unread_messages: 0,
      user: user,
    } as unknown as Channel['state']['read'][string];
    const items = [...activeChannel.messagePaginator.items!];
    items[items.length - 1] = {
      ...items[items.length - 1],
      id: 'last-read-message-id',
    };
    activeChannel.messagePaginator.setItems(items);

    service.setAsActiveChannel(activeChannel);

    expect(service.activeChannelLastReadMessageId).toBe(undefined);
    expect(service.activeChannelUnreadCount).toBe(0);
  });

  it('should be able to select empty channel as active channel', () => {
    const channel = generateMockChannels()[0];
    channel.id = 'new-empty-channel';
    channel.messagePaginator.setItems([]);

    service.setAsActiveChannel(channel);

    const spy = jasmine.createSpy();
    service.activeChannel$.subscribe(spy);

    expect(spy).toHaveBeenCalledWith(channel);
    expect(service.activeChannelLastReadMessageId).toBeUndefined();
    expect(service.activeChannelUnreadCount).toBe(0);
    expect(getLatestValue(service.activeChannelMessages$)).toEqual([]);
  });

  it('should update user references on `user.updated` event', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.activeChannel$.subscribe(spy);
    const channelsSpy = jasmine.createSpy();
    service.channels$.subscribe(channelsSpy);
    const activeChannel = getActiveChannel();
    // stream-chat updates the user references
    activeChannel.state.members['jack'].user!.name = 'John';
    spy.calls.reset();
    channelsSpy.calls.reset();
    events$.next({ eventType: 'user.updated' } as ClientEvent);

    const updatedChannel = spy.calls.mostRecent().args[0] as Channel;

    expect(updatedChannel.state.members['jack'].user!.name).toBe('John');
    expect(channelsSpy).toHaveBeenCalledWith(
      jasmine.arrayContaining([activeChannel])
    );
  });

  it('should load message reactions', async () => {
    await init();
    const message = service.activeChannelMessages[0];
    const mockReactions = [
      { type: 'wow', user: { id: 'jack' } },
    ] as ReactionResponse[];
    mockChatClient.getReactions.and.resolveTo({
      reactions: mockReactions,
      duration: '',
    });
    const reactions = await service.getMessageReactions(message.id);

    expect(mockChatClient.getReactions).toHaveBeenCalledWith(
      { id: message.id },
      jasmine.objectContaining({ offset: 0, limit: 300 })
    );

    expect(reactions).toEqual(mockReactions);
  });

  it('should load message reactions - multiple pages', async () => {
    await init();
    const message = service.activeChannelMessages[0];
    const mockReactionsFirstPage = new Array(300)
      .fill(null)
      .map(() => ({ type: 'wow', user: { id: 'jack' } })) as ReactionResponse[];
    const mockReactionsSecondPage = new Array(1)
      .fill(null)
      .map(() => ({ type: 'wow', user: { id: 'jack' } })) as ReactionResponse[];
    let counter = 0;
    mockChatClient.getReactions.and.callFake(() => {
      if (counter === 0) {
        counter++;
        return Promise.resolve({
          reactions: mockReactionsFirstPage,
          duration: '',
        });
      } else {
        return Promise.resolve({
          reactions: mockReactionsSecondPage,
          duration: '',
        });
      }
    });
    const reactions = await service.getMessageReactions(message.id);

    expect(mockChatClient.getReactions).toHaveBeenCalledWith(
      { id: message.id },
      jasmine.objectContaining({ offset: 300 })
    );
    expect(reactions).toEqual([
      ...mockReactionsFirstPage,
      ...mockReactionsSecondPage,
    ]);
  });

  it('should load message reactions - but no more than 1200', async () => {
    await init();
    const message = service.activeChannelMessages[0];
    const mockReactionsPage = new Array(300)
      .fill(null)
      .map(() => ({ type: 'wow', user: { id: 'jack' } })) as ReactionResponse[];
    mockChatClient.getReactions.and.resolveTo({
      reactions: mockReactionsPage,
      duration: '',
    });
    const reactions = await service.getMessageReactions(message.id);

    expect(reactions.length).toEqual(1200);
  });

  it('should load message reactions - error', async () => {
    await init();
    const message = service.activeChannelMessages[0];
    const error = apiError('GetReactions failed with error: "error"');
    mockChatClient.getReactions.and.rejectWith(error);
    const notificationService = TestBed.inject(NotificationService);
    const notificationSpy = jasmine.createSpy();
    notificationService.notifications$.subscribe(notificationSpy);
    notificationSpy.calls.reset();

    await expectAsync(service.getMessageReactions(message.id)).toBeRejectedWith(
      error
    );

    expect(notificationSpy).toHaveBeenCalledWith([
      jasmine.objectContaining({ text: 'streamChat.Error loading reactions' }),
    ]);
  });

  it('should mark message as unread', async () => {
    await init();
    const activeChannel = getActiveChannel();
    const message = service.activeChannelMessages[0];

    spyOn(activeChannel, 'markUnread').and.resolveTo();
    await service.markMessageUnread(message.id);

    expect(activeChannel.markUnread).toHaveBeenCalledWith({
      message_id: message.id,
    });
  });

  it('should mark message as unread - error', async () => {
    await init();
    const activeChannel = getActiveChannel();
    const message = service.activeChannelMessages[0];

    let error = apiError('You made a mistake');
    spyOn(activeChannel, 'markUnread').and.callFake(() =>
      Promise.reject(error)
    );
    const spy = jasmine.createSpy();
    const notificationService = TestBed.inject(NotificationService);
    notificationService.notifications$.subscribe(spy);
    await expectAsync(service.markMessageUnread(message.id)).toBeRejectedWith(
      error
    );

    expect(spy).toHaveBeenCalledWith([
      jasmine.objectContaining({
        text: 'streamChat.Error marking message as unread',
        type: 'error',
      }),
    ]);

    error = apiError(
      'MarkUnread failed with error: "Either the message with ID "zitaszuperagetstreamio-c710c117-5a8e-4769-a43d-f6add79d8520" does not exist, or it is older than last 100 channel messages."'
    );
    spy.calls.reset();
    await expectAsync(service.markMessageUnread(message.id)).toBeRejectedWith(
      error
    );

    expect(spy).toHaveBeenCalledWith(
      jasmine.arrayContaining([
        jasmine.objectContaining({
          text: 'streamChat.Error, only the first {{count}} message can be marked as unread',
          type: 'error',
          translateParams: { count: '100' },
        }),
      ])
    );
  });

  it('should react to notification.mark_unread events', async () => {
    await init();
    events$.next({
      eventType: 'notification.mark_unread',
      event: {
        type: 'notification.mark_unread',
        channel_id: service.activeChannel?.id,
        unread_messages: 12,
        last_read_message_id: 'last-read-message',
      } as unknown as Event,
    });

    expect(service.activeChannelLastReadMessageId).toBe('last-read-message');
    expect(service.activeChannelUnreadCount).toBe(12);

    events$.next({
      eventType: 'notification.mark_unread',
      event: {
        type: 'notification.mark_unread',
        channel_id: 'not-active-channel',
        unread_messages: 20,
        last_read_message_id: 'different id',
      } as unknown as Event,
    });

    expect(service.activeChannelLastReadMessageId).toBe('last-read-message');
    expect(service.activeChannelUnreadCount).toBe(12);
  });

  it('should halt marking the channel as read if an unread call was made in that session', async () => {
    await init();
    await waitForMarkReadThrottle();
    const activeChannel = getActiveChannel();
    spyOn(activeChannel, 'markReadViaReporter');

    await service.markMessageUnread('message-id');
    activeChannel.handleEvent('message.new', {
      message: toLocal(mockMessage(100)),
    });

    expect(activeChannel.markReadViaReporter).not.toHaveBeenCalled();

    service.deselectActiveChannel();
    service.setAsActiveChannel(activeChannel);

    expect(activeChannel.markReadViaReporter).toHaveBeenCalledWith();
  });

  it('channel list setter should respect channel order', async () => {
    await init();
    const currentChannels = service.channels;
    const newChannel = generateMockChannels()[0];
    const newChannels = [currentChannels[0], newChannel, currentChannels[1]];
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    spy.calls.reset();

    service['channelListSetter'](newChannels);

    expect(spy).toHaveBeenCalledOnceWith(newChannels);
  });

  it('channel list setter should watch for channel events', async () => {
    await init();
    const currentChannels = service.channels;
    const newChannel = generateMockChannels()[0];
    newChannel.cid = 'new-channel';
    const unsubscribeSpy = jasmine.createSpy();
    spyOn(newChannel, 'on').and.returnValue({ unsubscribe: unsubscribeSpy });
    const newChannels = [currentChannels[0], newChannel, currentChannels[1]];

    service['channelListSetter'](newChannels);

    expect(newChannel.on).toHaveBeenCalledWith(jasmine.any(Function));
  });

  it('channel list setter should stop watching removed channels', async () => {
    await init();
    const [keptChannel, removedChannel] = service.channels;
    mockChatClient.activeChannels[removedChannel.cid] = removedChannel;
    spyOn(removedChannel, 'stopWatching').and.resolveTo();
    const unsubscribeSpy = jasmine.createSpy();
    service['channelSubscriptions'][removedChannel.cid] = unsubscribeSpy;

    service['channelListSetter']([keptChannel]);

    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
    expect(service['channelSubscriptions'][removedChannel.cid]).toBeUndefined();
    expect(removedChannel.stopWatching).toHaveBeenCalledTimes(1);
  });

  it(`channel list setter shouldn't stop watching removed channels, if #shouldStopWatchingRemovedChannels is false`, async () => {
    await init();
    const [keptChannel, removedChannel] = service.channels;
    mockChatClient.activeChannels[removedChannel.cid] = removedChannel;
    spyOn(removedChannel, 'stopWatching').and.resolveTo();
    const unsubscribeSpy = jasmine.createSpy();
    service['channelSubscriptions'][removedChannel.cid] = unsubscribeSpy;

    service['channelListSetter']([keptChannel], false);

    expect(unsubscribeSpy).not.toHaveBeenCalled();
    expect(removedChannel.stopWatching).not.toHaveBeenCalled();
  });

  it('should watch for channel events again, if a removed channel is added back to the list', async () => {
    await init();
    const channel = service.channels[1];
    service.removeChannel(channel.cid);
    spyOn(channel, 'on').and.callThrough();

    service['channelListSetter']([...service.channels, channel]);

    expect(channel.on).toHaveBeenCalledWith(jasmine.any(Function));
  });

  it('init with custom query', async () => {
    const mockChannels = generateMockChannels();
    const customQuery = jasmine
      .createSpy()
      .and.resolveTo({ channels: mockChannels, hasMorePage: true });
    const result = await service.initWithCustomQuery(customQuery, {
      shouldSetActiveChannel: false,
      messagePageSize: 30,
    });
    const hasMoreSpy = jasmine.createSpy();
    service.hasMoreChannels$.subscribe(hasMoreSpy);

    expect(result).toBe(mockChannels);
    expect(customQuery).toHaveBeenCalledWith('first-page');
    expect(service['shouldSetActiveChannel']).toBeFalse();
    expect(service['messagePageSize']).toBe(30);
    expect(mockChatClient.config.setConfig).toHaveBeenCalledWith('channel', {
      messagePaginator: { pageSize: 30 },
    });
    expect(mockChatClient.config.setConfig).toHaveBeenCalledWith('thread', {
      messagePaginator: { pageSize: 30 },
    });
    expect(mockChatClient.threads.registerSubscriptions).toHaveBeenCalledWith();
    expect(hasMoreSpy).toHaveBeenCalledWith(true);

    customQuery.calls.reset();
    hasMoreSpy.calls.reset();
    const nextPage = generateMockChannels(5);
    customQuery.and.resolveTo({
      channels: [...mockChannels, ...nextPage],
      hasMorePage: false,
    });

    await service.loadMoreChannels();

    expect(customQuery).toHaveBeenCalledWith('next-page');
    expect(hasMoreSpy).toHaveBeenCalledWith(false);
  });

  it('should throttle mark read API calls', async () => {
    await init();
    // wait for mark read throttle time
    await waitForMarkReadThrottle();

    const activeChannel = getActiveChannel();
    spyOn(activeChannel, 'markReadViaReporter');

    activeChannel.handleEvent('message.new', {
      message: toLocal(mockMessage(100)),
    });

    expect(activeChannel.markReadViaReporter).toHaveBeenCalledTimes(1);

    activeChannel.handleEvent('message.new', {
      message: toLocal(mockMessage(101)),
    });

    expect(activeChannel.markReadViaReporter).toHaveBeenCalledTimes(1);

    // wait for mark read throttle time
    await waitForMarkReadThrottle();

    expect(activeChannel.markReadViaReporter).toHaveBeenCalledTimes(2);
  });

  it('should throttle mark read API calls - channel change', async () => {
    await init();
    // wait for mark read throttle time
    await waitForMarkReadThrottle();

    const activeChannel = getActiveChannel();
    spyOn(activeChannel, 'markReadViaReporter');

    activeChannel.handleEvent('message.new', {
      message: toLocal(mockMessage(100)),
    });

    expect(activeChannel.markReadViaReporter).toHaveBeenCalledTimes(1);

    activeChannel.handleEvent('message.new', {
      message: toLocal(mockMessage(101)),
    });

    expect(activeChannel.markReadViaReporter).toHaveBeenCalledTimes(1);

    service.setAsActiveChannel(service.channels[1]);

    expect(activeChannel.markReadViaReporter).toHaveBeenCalledTimes(2);
  });

  it('should throttle mark read API calls - reset', async () => {
    await init();
    // wait for mark read throttle time
    await waitForMarkReadThrottle();

    const activeChannel = getActiveChannel();
    spyOn(activeChannel, 'markReadViaReporter');

    activeChannel.handleEvent('message.new', {
      message: toLocal(mockMessage(100)),
    });

    expect(activeChannel.markReadViaReporter).toHaveBeenCalledTimes(1);

    activeChannel.handleEvent('message.new', {
      message: toLocal(mockMessage(101)),
    });

    expect(activeChannel.markReadViaReporter).toHaveBeenCalledTimes(1);

    service.reset();

    expect(activeChannel.markReadViaReporter).toHaveBeenCalledTimes(2);
  });
});
