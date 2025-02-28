import { fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { first, take } from 'rxjs/operators';
import {
  Channel,
  ChannelMemberResponse,
  ChannelOptions,
  ChannelResponse,
  ChannelSort,
  Event,
  FormatMessageResponse,
  Message,
  ReactionResponse,
  SendMessageAPIResponse,
  UserResponse,
} from 'stream-chat';
import { ChannelService } from './channel.service';
import { ChatClientService, ClientEvent } from './chat-client.service';
import {
  generateMockChannels,
  generateMockMessages,
  MockChannel,
  mockCurrentUser,
  mockMessage,
} from './mocks';
import { NotificationService } from './notification.service';
import {
  AttachmentUpload,
  DefaultStreamChatGenerics,
  MessageInput,
  StreamMessage,
} from './types';

describe('ChannelService', () => {
  let service: ChannelService;
  let mockChatClient: {
    dispatchEvent: (event: Event) => void;
    queryChannels: jasmine.Spy;
    channel: jasmine.Spy;
    updateMessage: jasmine.Spy;
    deleteMessage: jasmine.Spy;
    userID: string;
    pinMessage: jasmine.Spy;
    unpinMessage: jasmine.Spy;
    logger: () => void;
    activeChannels: { [key: string]: Channel<DefaultStreamChatGenerics> };
    on: (eventType: string, callback: (event: Event) => void) => void;
  };
  let events$: Subject<ClientEvent>;
  let connectionState$: Subject<'online' | 'offline'>;
  let init: (
    c?: Channel<DefaultStreamChatGenerics>[],
    sort?: ChannelSort<DefaultStreamChatGenerics>,
    options?: ChannelOptions,
    mockChannelQuery?: Function,
    shouldSetActiveChannel?: boolean,
  ) => Promise<Channel<DefaultStreamChatGenerics>[]>;
  let user: UserResponse;
  const filters = { type: 'messaging' };

  beforeEach(() => {
    user = mockCurrentUser();
    connectionState$ = new Subject<'online' | 'offline'>();
    const eventHandlers: { [key: string]: (event: Event) => void } = {};
    mockChatClient = {
      queryChannels: jasmine
        .createSpy()
        .and.returnValue(generateMockChannels()),
      channel: jasmine.createSpy(),
      updateMessage: jasmine.createSpy(),
      deleteMessage: jasmine.createSpy(),
      userID: user.id,
      pinMessage: jasmine.createSpy(),
      unpinMessage: jasmine.createSpy(),
      activeChannels: {},
      logger: () => undefined,
      on: (eventType: string, callback: (event: Event) => void) => {
        eventHandlers[eventType] = callback;
        return { unsubscribe: () => delete eventHandlers[eventType] };
      },
      dispatchEvent: (event: Event) => {
        eventHandlers[event.type]?.(event);
      },
    };
    events$ = new Subject();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ChatClientService,
          useValue: {
            chatClient: { ...mockChatClient, user },
            events$,
            connectionState$,
          },
        },
        NotificationService,
      ],
    });
    service = TestBed.inject(ChannelService);
    init = async (
      channels?: Channel<DefaultStreamChatGenerics>[],
      sort?: ChannelSort<DefaultStreamChatGenerics>,
      options?: ChannelOptions,
      mockChannelQuery?: Function,
      shouldSetActiveChannel?: boolean,
    ) => {
      if (mockChannelQuery) {
        mockChannelQuery();
      } else {
        mockChatClient.queryChannels.and.returnValue(
          channels || generateMockChannels(),
        );
      }

      return service.init(
        { filters, sort, options },
        { shouldSetActiveChannel },
      );
    };
  });

  it('should use provided sort params', async () => {
    const sort: ChannelSort = { last_message_at: -1 };
    await init(undefined, sort);

    expect(mockChatClient.queryChannels).toHaveBeenCalledWith(
      jasmine.any(Object),
      sort,
      jasmine.any(Object),
      jasmine.any(Object),
    );
  });

  it('should use provided options params', async () => {
    const options: ChannelOptions = { limit: 5 };
    await init(undefined, undefined, options);

    expect(mockChatClient.queryChannels).toHaveBeenCalledWith(
      jasmine.any(Object),
      jasmine.any(Object),
      jasmine.objectContaining(options),
      jasmine.any(Object),
    );
  });

  it('should use provided filter params', async () => {
    await init();

    expect(mockChatClient.queryChannels).toHaveBeenCalledWith(
      filters,
      jasmine.any(Object),
      jasmine.any(Object),
      jasmine.any(Object),
    );
  });

  it('should emit #channels$', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    const mockChannels = generateMockChannels();

    const result = spy.calls.mostRecent().args[0] as Channel[];

    expect(result.length).toBe(mockChannels.length);

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
    const error = 'there was an error';

    await expectAsync(
      init(undefined, undefined, undefined, () =>
        mockChatClient.queryChannels.and.rejectWith(error),
      ),
    ).toBeRejectedWith(error);

    expect(notificationSpy).toHaveBeenCalledWith(
      jasmine.arrayContaining([
        jasmine.objectContaining({
          type: 'error',
          text: 'streamChat.Error loading channels',
        }),
      ]),
    );
  });

  it('should handle errors during channel load', fakeAsync(() => {
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    const activeChannelSpy = jasmine.createSpy();
    service.activeChannel$.subscribe(activeChannelSpy);

    try {
      void init(undefined, undefined, undefined, () =>
        mockChatClient.queryChannels.and.rejectWith('there was an error'),
      );
      tick();
      // eslint-disable-next-line no-empty
    } catch (error) {}

    const channels = generateMockChannels();
    mockChatClient.queryChannels.and.resolveTo(channels);
    spy.calls.reset();
    activeChannelSpy.calls.reset();
    const notificationService = TestBed.inject(NotificationService);
    const notificationSpy = jasmine.createSpy();
    notificationService.notifications$.subscribe(notificationSpy);
    notificationSpy.calls.reset();
    events$.next({ eventType: 'connection.recovered' } as ClientEvent);

    tick();
    flush();

    expect(spy).toHaveBeenCalledWith(channels);
    expect(activeChannelSpy).toHaveBeenCalledWith(channels[0]);
    expect(notificationSpy).toHaveBeenCalledWith([]);
  }));

  it('should emit channel query state correctly', async () => {
    const spy = jasmine.createSpy();
    service.channelQueryState$.subscribe(spy);

    await init();

    let calls = spy.calls.all();

    /* eslint-disable  @typescript-eslint/no-unsafe-member-access */
    expect(calls[1].args[0].state).toBe('in-progress');

    expect(calls[2].args[0].state).toBe('success');

    spy.calls.reset();

    await expectAsync(
      init(undefined, undefined, undefined, () =>
        mockChatClient.queryChannels.and.rejectWith('there was an error'),
      ),
    ).toBeRejected();

    calls = spy.calls.all();

    expect(calls[0].args[0]?.state).toBe('in-progress');

    expect(calls[1].args[0]).toEqual({
      state: 'error',
      error: 'there was an error',
    });

    /* eslint-enable  @typescript-eslint/no-unsafe-member-access */
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
      eventType: 'message.new',
      event: {
        channel: {
          id: 'channel',
        } as ChannelResponse<DefaultStreamChatGenerics>,
      } as Event<DefaultStreamChatGenerics>,
    });

    expect(channelsSpy).not.toHaveBeenCalled();
  });

  it('should deselect active channel', async () => {
    await init();
    let activeChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(take(1)).subscribe((c) => (activeChannel = c!));
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
    service.isMessageLoadingInProgress = true;
    messagesSpy.calls.reset();
    activeChannelSpy.calls.reset();
    messageToQuoteSpy.calls.reset();
    latestMessagesSpy.calls.reset();
    jumpToMessageSpy.calls.reset();
    pinnedMessagesSpy.calls.reset();
    typingUsersSpy.calls.reset();
    typingUsersInThreadSpy.calls.reset();
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
    expect(service.activeChannelLastReadMessageId).toBeUndefined();
    expect(service.activeChannelUnreadCount).toBeUndefined();

    messagesSpy.calls.reset();
    (activeChannel as MockChannel).handleEvent('message.new', mockMessage());

    expect(messagesSpy).not.toHaveBeenCalled();
    expect(service.isMessageLoadingInProgress).toBeFalse();
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
    expect(
      // @ts-expect-error we know channelManager exists, TS doesn't
      service.channelManager?.state?.getLatestValue().pagination?.options
        .offset,
    ).toEqual(service.channels.length);

    mockChatClient.queryChannels.calls.reset();
    const existingChannel = service.channels[0];
    const newChannel = generateMockChannels(1)[0];
    newChannel.cid = 'this-channel-is-not-yet-loaded';
    mockChatClient.queryChannels.and.resolveTo([existingChannel, newChannel]);
    const prevChannelCount = service.channels.length;
    await service.loadMoreChannels();

    expect(mockChatClient.queryChannels).toHaveBeenCalledWith(
      jasmine.any(Object),
      jasmine.any(Object),
      jasmine.any(Object),
      jasmine.any(Object),
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
    spyOn(newActiveChannel, 'markRead');
    const pinnedMessages = generateMockMessages();
    newActiveChannel.state.pinnedMessages = pinnedMessages;
    service.setAsActiveChannel(newActiveChannel);
    result = spy.calls.mostRecent().args[0] as Channel;

    expect(result.cid).toBe(newActiveChannel.cid);
    expect(messagesSpy).toHaveBeenCalledWith(jasmine.any(Object));
    expect(newActiveChannel.markRead).toHaveBeenCalledWith();
    expect(messageToQuoteSpy).toHaveBeenCalledWith(undefined);
    expect(pinnedMessagesSpy).toHaveBeenCalledWith(pinnedMessages);
    expect(typingUsersSpy).toHaveBeenCalledWith([]);
    expect(typingUsersInThreadSpy).toHaveBeenCalledWith([]);
  });

  it('should emit #activeChannelMessages$', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(spy);
    const messages = generateMockChannels()[0].state.messages;

    const result = spy.calls.mostRecent().args[0] as StreamMessage[];
    result.forEach((m, i) => {
      expect(m.id).toEqual(messages[i].id);
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
    let activeChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe(
      (c) => (activeChannel = c as Channel<DefaultStreamChatGenerics>),
    );
    spyOn(activeChannel, 'query').and.callThrough();
    await service.loadMoreMessages();

    expect(activeChannel.query).toHaveBeenCalledWith(jasmine.any(Object));

    const arg = (activeChannel.query as jasmine.Spy).calls.mostRecent()
      .args[0] as { messages: { id_lt: string } };
    const oldestMessage = activeChannel.state.messages[0];

    expect(arg.messages.id_lt).toEqual(oldestMessage.id);
  });

  it('should load more newer messages', async () => {
    await init();
    let activeChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe(
      (c) => (activeChannel = c as Channel<DefaultStreamChatGenerics>),
    );
    activeChannel.state.latestMessages = [];
    spyOn(activeChannel, 'query').and.callThrough();
    await service.loadMoreMessages('newer');

    expect(activeChannel.query).toHaveBeenCalledWith(jasmine.any(Object));

    const arg = (activeChannel.query as jasmine.Spy).calls.mostRecent()
      .args[0] as { messages: { id_gt: string } };
    const lastMessage =
      activeChannel.state.messages[activeChannel.state.messages.length - 1];

    expect(arg.messages.id_gt).toEqual(lastMessage.id);
  });

  it(`shouldn't load more newer messages if already at the latest messages`, async () => {
    await init();
    let activeChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe(
      (c) => (activeChannel = c as Channel<DefaultStreamChatGenerics>),
    );
    spyOn(activeChannel, 'query').and.callThrough();
    await service.loadMoreMessages('newer');

    expect(activeChannel.query).not.toHaveBeenCalled();

    await service.loadMoreMessages('older');

    expect(activeChannel.query).toHaveBeenCalledWith(jasmine.any(Object));
  });

  it('should add reaction', async () => {
    await init();
    let activeChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (activeChannel = c!));
    spyOn(activeChannel, 'sendReaction');
    const messageId = 'id';
    const reactionType = 'wow';
    await service.addReaction(messageId, reactionType);

    expect(activeChannel.sendReaction).toHaveBeenCalledWith(messageId, {
      type: reactionType,
    });
  });

  it('should remove reaction', async () => {
    await init();
    let activeChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (activeChannel = c!));
    spyOn(activeChannel, 'deleteReaction');
    const messageId = 'id';
    const reactionType = 'wow';
    await service.removeReaction(messageId, reactionType);

    expect(activeChannel.deleteReaction).toHaveBeenCalledWith(
      messageId,
      reactionType,
    );
  });

  it('should watch for new message events', async () => {
    await init();
    // wait for mark read throttle time
    await new Promise((resolve) => {
      setTimeout(resolve, service['markReadThrottleTime']);
    });
    const spy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(spy);
    const prevCount = (spy.calls.mostRecent().args[0] as Channel[]).length;
    spy.calls.reset();
    let activeChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (activeChannel = c!));
    const newMessage = mockMessage();
    activeChannel.state.messages.push(newMessage);
    spyOn(activeChannel, 'markRead');
    (activeChannel as MockChannel).handleEvent('message.new', newMessage);

    const newCount = (spy.calls.mostRecent().args[0] as StreamMessage[]).length;

    expect(newCount).toBe(prevCount + 1);
    expect(activeChannel.markRead).toHaveBeenCalledWith();
  });

  it('should pause read events', async () => {
    await init();
    service.shouldMarkActiveChannelAsRead = false;
    let activeChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (activeChannel = c!));
    const newMessage = mockMessage();
    activeChannel.state.messages.push(newMessage);
    spyOn(activeChannel, 'markRead');
    (activeChannel as MockChannel).handleEvent('message.new', newMessage);

    expect(activeChannel.markRead).not.toHaveBeenCalledWith();

    service.setAsActiveChannel(activeChannel);

    expect(activeChannel.markRead).not.toHaveBeenCalledWith();

    service.shouldMarkActiveChannelAsRead = true;

    expect(activeChannel.markRead).toHaveBeenCalledWith();
  });

  it(`shouldn't make "markRead" call, if user dosen't have 'read-events' capability`, async () => {
    await init();
    let activeChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (activeChannel = c!));
    const capabilites = activeChannel.data?.own_capabilities as string[];
    capabilites.splice(capabilites.indexOf('read-events'), 1);
    const newMessage = mockMessage();
    activeChannel.state.messages.push(newMessage);
    spyOn(activeChannel, 'markRead');
    (activeChannel as MockChannel).handleEvent('message.new', newMessage);

    expect(activeChannel.markRead).not.toHaveBeenCalledWith();

    service.setAsActiveChannel(activeChannel);

    expect(activeChannel.markRead).not.toHaveBeenCalledWith();
  });

  it('should watch for message update events', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(spy);
    spy.calls.reset();
    const pinnedMessagesSpy = jasmine.createSpy();
    service.activeChannelPinnedMessages$.subscribe(pinnedMessagesSpy);
    pinnedMessagesSpy.calls.reset();
    let activeChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (activeChannel = c!));
    const pinnedMessages = generateMockMessages();
    activeChannel.state.pinnedMessages = pinnedMessages;
    const message =
      activeChannel.state.messages[activeChannel.state.messages.length - 1];
    message.text = 'updated';
    (activeChannel as MockChannel).handleEvent('message.updated', { message });

    const messages = spy.calls.mostRecent().args[0] as StreamMessage[];
    const updatedMessage = messages[messages.length - 1];

    expect(updatedMessage.text).toBe('updated');

    expect(pinnedMessagesSpy).toHaveBeenCalledWith(pinnedMessages);
  });

  it('should watch for message deleted events', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(spy);
    spy.calls.reset();
    let activeChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (activeChannel = c!));
    const message =
      activeChannel.state.messages[activeChannel.state.messages.length - 1];
    message.deleted_at = new Date();
    (activeChannel as MockChannel).handleEvent('message.deleted', { message });

    expect(spy).toHaveBeenCalledWith(jasmine.arrayContaining([message]));

    spy.calls.reset();
    activeChannel.state.messages.splice(
      activeChannel.state.messages.findIndex((m) => m.id === message.id),
    );
    (activeChannel as MockChannel).handleEvent('message.deleted', {
      message,
      type: 'message.deleted',
    });

    expect(spy).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalledWith(jasmine.arrayContaining([message]));
  });

  it('should move channel to the top of the list', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.channels$
      .pipe(first())
      .subscribe((channels) => (channel = channels![1]));
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    mockChatClient.channel.and.returnValue(channel);
    const event = {
      message: mockMessage(),
      type: 'message.new',
      channel_type: channel.type,
      channel_id: channel.id,
    } as any as Event<DefaultStreamChatGenerics>;
    mockChatClient.dispatchEvent(event);

    const firstChannel = (spy.calls.mostRecent().args[0] as Channel[])[0];

    expect(firstChannel).toBe(channel);
  });

  it('should handle if channel visibility changes', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    spyOn(channel, 'stopWatching');
    mockChatClient.channel.and.returnValue(channel);
    mockChatClient.dispatchEvent({
      type: 'channel.hidden',
      cid: channel.cid,
      channel_type: channel.type,
      channel_id: channel.id,
    });

    let channels = spy.calls.mostRecent().args[0] as Channel[];

    expect(channels.find((c) => c.cid === channel.cid)).toBeUndefined();
    expect(channel.stopWatching).not.toHaveBeenCalledWith();

    // @ts-expect-error white-box testing so we can wait for event handler promise to run
    await service.channelManager?.channelVisibleHandler({
      type: 'channel.visible',
      cid: channel.cid,
      channel_type: channel.type,
      channel_id: channel.id,
    });

    channels = spy.calls.mostRecent().args[0] as Channel[];

    expect(channels.find((c) => c.cid === channel.cid)).not.toBeUndefined();
  });

  it('should remove channel from list, if deleted', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    mockChatClient.channel.and.returnValue(channel);
    spyOn(channel, 'stopWatching');
    mockChatClient.dispatchEvent({
      type: 'channel.deleted',
      cid: channel.cid,
    });

    const channels = spy.calls.mostRecent().args[0] as Channel[];

    expect(channels.find((c) => c.cid === channel.cid)).toBeUndefined();
    expect(channel.stopWatching).not.toHaveBeenCalledWith();
  });

  it('should emit changed active channel if `capabilities.changed` dispatched', async () => {
    await init();
    const channel = service.activeChannel!;
    const spy = jasmine.createSpy();
    service.activeChannel$.subscribe(spy);
    spy.calls.reset();
    channel.data = { ...channel.data!, own_capabilities: ['send-message'] };
    (channel as MockChannel).handleEvent('capabilities.changed', {
      type: 'capabilities.changed',
      cid: channel.cid,
    });

    expect(spy).toHaveBeenCalledWith(channel);
  });

  it('should watch for reaction events', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(spy);
    const message = (spy.calls.mostRecent().args[0] as StreamMessage[])[0];
    spy.calls.reset();
    let activeChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (activeChannel = c!));
    (activeChannel as MockChannel).handleEvent('reaction.new', { message });

    expect(spy).toHaveBeenCalledWith(jasmine.any(Object));

    spy.calls.reset();
    (activeChannel as MockChannel).handleEvent('reaction.updated', { message });

    expect(spy).toHaveBeenCalledWith(jasmine.any(Object));

    spy.calls.reset();
    (activeChannel as MockChannel).handleEvent('reaction.deleted', { message });

    expect(spy).toHaveBeenCalledWith(jasmine.any(Object));
  });

  it('should add the new channel to the top of the list, and start watching it, if user is added to a channel', fakeAsync(async () => {
    await init();
    flush();
    const newChannel = generateMockChannels()[0];
    newChannel.cid = 'newchannel';
    newChannel.id = 'newchannel';
    newChannel.type = 'messaging';
    mockChatClient.channel.and.returnValue(newChannel);
    spyOn(newChannel, 'watch').and.callThrough();
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    mockChatClient.dispatchEvent({
      type: 'notification.added_to_channel',
      channel: newChannel,
    } as any as Event<DefaultStreamChatGenerics>);
    tick();

    const channels = spy.calls.mostRecent().args[0] as Channel[];
    const firstChannel = channels[0];

    expect(firstChannel.cid).toBe(newChannel.cid);
    expect(newChannel.watch).toHaveBeenCalled();
  }));

  it('should add the new channel to the top of the list, and start watching it, if a new message is received from the channel', fakeAsync(async () => {
    await init();
    const channel = generateMockChannels()[0];
    channel.cid = 'channel';
    channel.id = 'channel';
    channel.type = 'messaging';
    mockChatClient.channel.and.returnValue(channel);
    spyOn(channel, 'watch').and.callThrough();
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    mockChatClient.dispatchEvent({
      type: 'notification.message_new',
      channel: channel,
    } as any as Event<DefaultStreamChatGenerics>);
    tick();
    flush();

    const channels = spy.calls.mostRecent().args[0] as Channel[];
    const firstChannel = channels[0];

    expect(firstChannel.cid).toBe(channel.cid);
    expect(channel.watch).toHaveBeenCalled();
  }));

  it(`shouldn't add channels twice if two notification events were received for the same channel`, fakeAsync(async () => {
    await init();
    const channel = generateMockChannels()[0];
    channel.cid = 'channel';
    channel.id = 'channel';
    channel.type = 'messaging';
    mockChatClient.channel.and.returnValue(channel);
    spyOn(channel, 'watch').and.callThrough();
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    mockChatClient.dispatchEvent({
      channel: channel,
      type: 'notification.added_to_channel',
    } as any as Event<DefaultStreamChatGenerics>);
    mockChatClient.dispatchEvent({
      channel: channel,
      type: 'notification.added_to_channel',
    } as any as Event<DefaultStreamChatGenerics>);
    tick();
    flush();

    const channels = spy.calls.mostRecent().args[0] as Channel[];

    expect(channels.filter((c) => c.cid === channel.cid).length).toBe(1);
  }));

  it('should remove channel form the list if user is removed from channel', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.channels$
      .pipe(first())
      .subscribe((channels) => (channel = channels![1]));
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    mockChatClient.activeChannels[channel.cid] = channel;
    spyOn(service, 'setAsActiveChannel');

    mockChatClient.dispatchEvent({
      channel: channel,
      type: 'notification.removed_from_channel',
    } as any as Event<DefaultStreamChatGenerics>);

    let channels = spy.calls.mostRecent().args[0] as Channel[];

    expect(channels.find((c) => c.cid === channel.cid)).toBeUndefined();
    expect(service.setAsActiveChannel).not.toHaveBeenCalled();

    mockChatClient.dispatchEvent({
      id: 'new-message',
      type: 'message.new',
      cid: channel.cid,
      channel_type: channel.type,
      channel_id: channel.id,
    } as any as Event<DefaultStreamChatGenerics>);

    channels = spy.calls.mostRecent().args[0] as Channel[];

    expect(channels.find((c) => c.cid === channel.cid)).toBeUndefined();
  });

  it('should remove channel form the list if user is removed from channel, deselect active channel', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.channels$.pipe(first()).subscribe((channels) => {
      channel = channels![0];
    });
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    spyOn(service, 'deselectActiveChannel');
    mockChatClient.dispatchEvent({
      type: 'notification.removed_from_channel',
      cid: channel.cid,
    });
    const channels = spy.calls.mostRecent().args[0] as Channel[];

    expect(channels.find((c) => c.cid === channel.cid)).toBeUndefined();
    expect(service.deselectActiveChannel).toHaveBeenCalled();
  });

  it('should send message', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'sendMessage').and.callThrough();
    spyOn(channel.state, 'addMessageSorted').and.callThrough();
    const text = 'Hi';
    const attachments = [{ fallback: 'image.png', url: 'http://url/to/image' }];
    const mentionedUsers = [{ id: 'sara', name: 'Sara' }];
    const quotedMessageId = 'quotedMessage';
    const customData = {
      isVote: true,
      options: ['A', 'B', 'C'],
    };
    let prevMessageCount!: number;
    service.activeChannelMessages$
      .pipe(first())
      .subscribe((m) => (prevMessageCount = m.length));
    await service.sendMessage(
      text,
      attachments,
      mentionedUsers,
      undefined,
      quotedMessageId,
      customData,
    );
    let latestMessage!: StreamMessage;
    let messageCount!: number;
    service.activeChannelMessages$.subscribe((m) => {
      latestMessage = m[m.length - 1];
      messageCount = m.length;
    });

    expect(channel.sendMessage).toHaveBeenCalledWith({
      text,
      attachments,
      mentioned_users: ['sara'],
      id: jasmine.any(String),
      parent_id: undefined,
      quoted_message_id: quotedMessageId,
      isVote: true,
      options: ['A', 'B', 'C'],
    });

    expect(channel.state.addMessageSorted).toHaveBeenCalledWith(
      jasmine.objectContaining({ text, user, attachments }),
      true,
    );

    expect(latestMessage.text).toBe(text);
    expect(messageCount).toEqual(prevMessageCount + 1);
  });

  it('should send message - #beforeSendMessage hook is provided', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'sendMessage').and.callThrough();
    spyOn(channel.state, 'addMessageSorted').and.callThrough();
    const text = 'Hi';
    const attachments = [{ fallback: 'image.png', url: 'http://url/to/image' }];
    const mentionedUsers = [{ id: 'sara', name: 'Sara' }];
    const spy = jasmine.createSpy();
    service.beforeSendMessage = spy;
    spy.and.callFake((i: MessageInput) => {
      i.customData = { custom: 'red' };
      return i;
    });
    await service.sendMessage(text, attachments, mentionedUsers);

    expect(channel.sendMessage).toHaveBeenCalledWith({
      text,
      attachments,
      mentioned_users: ['sara'],
      id: jasmine.any(String),
      parent_id: undefined,
      quoted_message_id: undefined,
      custom: 'red',
    });

    expect(channel.state.addMessageSorted).toHaveBeenCalledWith(
      jasmine.objectContaining({ custom: 'red' }),
      true,
    );

    spy.and.callFake((i: MessageInput) => {
      i.text = 'censored';
      return Promise.resolve(i);
    });
    await service.sendMessage(text, attachments, mentionedUsers);

    expect(channel.sendMessage).toHaveBeenCalledWith({
      text: 'censored',
      attachments,
      mentioned_users: ['sara'],
      id: jasmine.any(String),
      parent_id: undefined,
      quoted_message_id: undefined,
    });

    expect(channel.state.addMessageSorted).toHaveBeenCalledWith(
      jasmine.objectContaining({ text: 'censored' }),
      true,
    );
  });

  it('should send action', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const giphy = {
      thumb_url:
        'https://media4.giphy.com/media/Q9GYuPJTT8RomJTRot/giphy.gif?cid=c4b036752at3vu1m2vwt7nvnfumyer5620wbdhosrpmds52e&rid=giphy.gif&ct=g',
      title: 'dogs',
      title_link: 'https://giphy.com/gifs/Q9GYuPJTT8RomJTRot',
      type: 'giphy',
    };
    spyOn(channel, 'sendAction').and.resolveTo({
      message: {
        id: 'message-1',
        attachments: [giphy],
      },
    } as any as SendMessageAPIResponse<DefaultStreamChatGenerics>);
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe(
      (m) => (latestMessage = m[m.length - 1]),
    );
    await service.sendAction('message-1', { image_action: 'send' });

    expect(latestMessage.attachments![0]).toBe(giphy);
  });

  it('should remove message after action, if no message is returned', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'sendAction').and.resolveTo(
      {} as any as SendMessageAPIResponse<DefaultStreamChatGenerics>,
    );
    spyOn(channel.state, 'removeMessage');
    await service.sendAction('1', { image_action: 'send' });

    expect(channel.state.removeMessage).toHaveBeenCalledWith({
      id: '1',
      parent_id: undefined,
    });
  });

  it('should update message', () => {
    const message = mockMessage();
    // @ts-expect-error we exclude this
    delete message.readBy;
    void service.updateMessage(message);

    expect(mockChatClient.updateMessage).toHaveBeenCalledWith(message);
  });

  it('should resend instead of update if message was bounced', async () => {
    await init();
    const message = mockMessage();
    const channel = service.activeChannel!;
    spyOn(channel, 'sendMessage');
    message.moderation_details = {
      original_text: 'Ricciardo should retire',
      action: 'MESSAGE_RESPONSE_ACTION_BOUNCE',
      harms: [
        {
          name: 'hammurabi_filter',
          phrase_list_ids: [139],
        },
      ],
      error_msg: 'this message did not meet our content guidelines',
    };
    void service.updateMessage(message);

    expect(mockChatClient.updateMessage).not.toHaveBeenCalledWith();
    expect(channel.sendMessage).not.toHaveBeenCalledWith(message as Message);
  });

  it('should update message - #beforeUpdateMessage is provided', async () => {
    const message = mockMessage();
    mockChatClient.updateMessage.and.resolveTo({ message });
    const spy = jasmine.createSpy();
    service.beforeUpdateMessage = spy;
    spy.and.callFake((m: StreamMessage) => {
      m.text = 'Testing beforeUpdateMessage hook';
      return Promise.resolve(m);
    });
    await service.updateMessage(message);

    expect(mockChatClient.updateMessage).toHaveBeenCalledWith(
      jasmine.objectContaining({ text: 'Testing beforeUpdateMessage hook' }),
    );
  });

  it('should remove translation object and readyBy before updating message', () => {
    const message = mockMessage();
    // @ts-expect-error we exclude this
    delete message.readBy;
    void service.updateMessage({
      ...message,
      i18n: { en_text: 'Translation', language: 'en' },
      readBy: [],
    });

    expect(mockChatClient.updateMessage).toHaveBeenCalledWith(message);
  });

  it('should delete message', async () => {
    await init();
    const channel = service.activeChannel;
    spyOn(channel!.state, 'removeMessage');
    const message = mockMessage();
    void service.deleteMessage(message);

    expect(mockChatClient.deleteMessage).toHaveBeenCalledWith(message.id);
    expect(channel!.state.removeMessage).not.toHaveBeenCalled();
  });

  it('should delete message - local', async () => {
    await init();
    const message = mockMessage();
    const channel = service.activeChannel;
    spyOn(channel!.state, 'removeMessage');
    void service.deleteMessage(message, true);

    expect(mockChatClient.deleteMessage).not.toHaveBeenCalledWith();
    expect(channel!.state.removeMessage).toHaveBeenCalledWith({
      id: message.id,
      parent_id: undefined,
    });
  });

  it(`should call #messageDeleteConfirmationHandler is that's provided`, async () => {
    const spy = jasmine.createSpy();
    const message = mockMessage();
    service.messageDeleteConfirmationHandler = spy;
    spy.and.resolveTo(false);
    await service.deleteMessage(message);

    expect(spy).toHaveBeenCalledWith(message);
    expect(mockChatClient.deleteMessage).not.toHaveBeenCalledWith(message.id);

    spy.and.resolveTo(true);
    spy.calls.reset();
    await service.deleteMessage(message);

    expect(spy).toHaveBeenCalledWith(message);
    expect(mockChatClient.deleteMessage).toHaveBeenCalledWith(message.id);
  });

  it('should resend message', async () => {
    await init();
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe((m) => {
      latestMessage = m[m.length - 1];
    });
    latestMessage.status = 'failed';
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'sendMessage').and.callThrough();
    spyOn(channel.state, 'addMessageSorted').and.callThrough();
    await service.resendMessage(latestMessage);

    expect(channel.sendMessage).toHaveBeenCalledWith(
      jasmine.objectContaining({
        id: latestMessage.id,
      }),
    );

    expect(channel.state.addMessageSorted).toHaveBeenCalledWith(
      jasmine.objectContaining({
        status: 'sending',
        errorStatusCode: undefined,
      }),
      true,
    );

    expect(channel.state.addMessageSorted).toHaveBeenCalledWith(
      jasmine.objectContaining({
        status: 'received',
      }),
      true,
    );

    expect(latestMessage.status).toBe('received');
  });

  it('should ignore error if resend failed because message already exists', async () => {
    await init();
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe((m) => {
      latestMessage = m[m.length - 1];
    });
    latestMessage.status = 'failed';
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'sendMessage').and.rejectWith({
      code: 4,
      status: 400,
      response: {
        data: {
          message:
            'SendMessage failed with error: "a message with ID zitaszuperagetstreamio-9005f6d8-aeb7-42a1-984c-921f94567759 already exists"',
        },
      },
    });
    spyOn(channel.state, 'addMessageSorted').and.callThrough();
    await service.resendMessage(latestMessage);

    expect(channel.state.addMessageSorted).toHaveBeenCalledWith(
      jasmine.objectContaining({
        status: 'received',
      }),
      true,
    );

    expect(latestMessage.status).toBe('received');
  });

  it('should set message state while sending', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'sendMessage');
    const text = 'Hi';
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe(
      (m) => (latestMessage = m[m.length - 1]),
    );
    void service.sendMessage(text);

    expect(latestMessage.status).toBe('sending');
  });

  it('should set message state after message is sent', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'sendMessage');
    const text = 'Hi';
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe(
      (m) => (latestMessage = m[m.length - 1]),
    );
    await service.sendMessage(text);
    channel.state.messages.push({
      id: latestMessage.id,
    } as any as StreamMessage);
    (channel as MockChannel).handleEvent('message.new', {
      id: latestMessage.id,
    });

    expect(latestMessage.status).toBe('received');
  });

  // this could happen when a message was added to the local state while offline
  it('should handle message order change', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const localMessage = channel.state.messages.splice(
      channel.state.messages.length - 2,
      1,
    )[0];
    channel.state.messages.push(localMessage);
    (channel as MockChannel).handleEvent('message.new', localMessage);
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe(
      (m) => (latestMessage = m[m.length - 1]),
    );

    expect(latestMessage.id).toBe(localMessage.id);
  });

  it('should set message state, if an error occured', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'sendMessage').and.callFake(() =>
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      Promise.reject({ status: 500 }),
    );
    const text = 'Hi';
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe(
      (m) => (latestMessage = m[m.length - 1]),
    );
    await service.sendMessage(text);

    expect(latestMessage.status).toBe('failed');
    expect(latestMessage.errorStatusCode).toBe(500);
  });

  it('should add sent message to message list', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'sendMessage').and.callFake(() =>
      Promise.resolve({
        message: { id: 'new-message' },
      } as SendMessageAPIResponse<DefaultStreamChatGenerics>),
    );
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe(
      (m) => (latestMessage = m[m.length - 1]),
    );
    await service.sendMessage('Hi');

    expect(latestMessage.id).toBe('new-message');
  });

  it(`shouldn't duplicate new message`, async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    await service.sendMessage('Hi');
    let newMessageId!: string;
    service.activeChannelMessages$.pipe(first()).subscribe((m) => {
      newMessageId = m[m.length - 1].id;
    });
    (channel as MockChannel).handleEvent('message.new', { id: newMessageId });
    let messages!: StreamMessage[];
    service.activeChannelMessages$.pipe(first()).subscribe((m) => {
      messages = m;
    });

    expect(messages.filter((m) => m.id === newMessageId).length).toEqual(1);
  });

  it('should upload attachments', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'sendImage').and.callFake((file: File) => {
      switch (file.name) {
        case 'file_error.jpg':
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          return Promise.reject({
            response: {
              data: {
                code: 4,
                message:
                  'UploadImage failed with error: "File extension .jpg is not supported"',
              },
            },
          });
        case 'file_too_big.jpg':
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          return Promise.reject({
            response: {
              data: {
                code: 4,
                message:
                  'UploadImage failed with error: "File size is above the size limit (1048576 bytes)"',
              },
            },
          });
        default:
          return Promise.resolve({
            file: 'http://url/to/image',
            duration: '200ms',
          });
      }
    });
    spyOn(channel, 'sendFile').and.callFake(
      (file: File, _: string, type: string) => {
        switch (file.name) {
          case 'file_error.pdf':
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            return Promise.reject({
              response: {
                data: {
                  code: 22,
                  message:
                    'UploadFile failed with error: "max upload size of 50MB exceeded"',
                },
              },
            });
          default:
            return Promise.resolve({
              file: 'http://url/to/file',
              duration: '200ms',
              thumb_url:
                type && type.startsWith('video')
                  ? 'http://url/to/poster'
                  : undefined,
            });
        }
      },
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

    expectedResult.forEach((r, i) => {
      expect(r).toEqual(result[i]);
    });
  });

  it('should delete image attachment', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'deleteImage');
    const url = 'http://url/to/image';
    await service.deleteAttachment({
      url,
      type: 'image',
      state: 'success',
      file: {} as any as File,
    });

    expect(channel.deleteImage).toHaveBeenCalledWith(url);
  });

  it('should delete file attachment', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'deleteFile');
    const url = 'http://url/to/file';
    await service.deleteAttachment({
      url,
      type: 'file',
      state: 'success',
      file: {} as any as File,
    });

    expect(channel.deleteFile).toHaveBeenCalledWith(url);
  });

  it('should update #readBy array, if active channel is read', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe(
      (messages) => (latestMessage = messages[messages.length - 1]),
    );

    expect(latestMessage.readBy.length).toBe(0);

    const user = { id: 'jack', name: 'Jack' } as UserResponse;
    channel.state.read = {
      [user.id]: { last_read: new Date(), user, unread_messages: 0 },
    };
    (channel as MockChannel).handleEvent('message.read', {
      user,
    });

    expect(
      latestMessage.readBy.find((u) => u.id === 'jack'),
    ).not.toBeUndefined();
  });

  it(`should unsubscribe from active channel events, after active channel changed`, async () => {
    await init();
    const spy = jasmine.createSpy('activeMessagesSpy');
    service.activeChannelMessages$.subscribe(spy);
    let prevActiveChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$
      .pipe(first())
      .subscribe((c) => (prevActiveChannel = c!));
    const newActiveChannel = generateMockChannels()[1];
    service.setAsActiveChannel(newActiveChannel);
    spy.calls.reset();
    (prevActiveChannel as MockChannel).handleEvent('message.new', {
      user: { id: 'jill' },
    });
    (prevActiveChannel as MockChannel).handleEvent('reaction.new', {
      message: mockMessage(),
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it('should query members, less than 100 members', async () => {
    await init();
    const channel = generateMockChannels(1)[0];
    channel.cid = 'new-channel';
    channel.state.members = {
      jack: { user: { id: 'jack', name: 'Jack' } },
      john: { user: { id: 'john' } },
      [user.id]: { user },
    } as any as Record<
      string,
      ChannelMemberResponse<DefaultStreamChatGenerics>
    >;
    service.setAsActiveChannel(channel);
    const result = await service.autocompleteMembers('ja');
    const expectedResult = [
      { user: { id: 'jack', name: 'Jack' } },
      { user: { id: 'john' } },
    ];

    expect(result).toEqual(expectedResult);
  });

  it('should query members, more than 100 members', async () => {
    await init();
    const channel = generateMockChannels(1)[0];
    channel.cid = 'new-channel';
    spyOn(channel, 'queryMembers').and.resolveTo({
      members: [
        { user_id: mockCurrentUser().id },
        { user_id: 'jack' },
      ] as unknown as ChannelMemberResponse<DefaultStreamChatGenerics>[],
      duration: '0ms',
    });
    const users = Array.from({ length: 101 }, (_, i) => ({ id: `${i}` }));
    channel.state.members = {} as any as Record<
      string,
      ChannelMemberResponse<DefaultStreamChatGenerics>
    >;
    users.forEach((u) => (channel.state.members[u.id] = { user: u }));
    service.setAsActiveChannel(channel);
    const result = await service.autocompleteMembers('ja');

    expect(channel.queryMembers).toHaveBeenCalledWith(
      jasmine.objectContaining({
        name: { $autocomplete: 'ja' },
      }),
    );

    expect(result.length).toBe(1);
  });

  it('should select message to be quoted', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.messageToQuote$.subscribe(spy);
    const message = mockMessage();
    service.selectMessageToQuote(message);

    expect(spy).toHaveBeenCalledWith(message);
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
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (channel = c!));
    spyOn(channel, 'keystroke');
    await service.typingStarted();

    expect(channel.keystroke).toHaveBeenCalledWith(undefined);
  });

  it('should notify channel if typing stopped', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (channel = c!));
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
    let channel!: MockChannel;
    service.activeChannel$.subscribe((c) => (channel = c as MockChannel));
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

  it('should emit the date of latest messages sent by the user by channels', async () => {
    await init();
    let activeChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$
      .pipe(first())
      .subscribe(
        (c) => (activeChannel = c as Channel<DefaultStreamChatGenerics>),
      );
    const newMessage = mockMessage();
    newMessage.cid = 'channel1';
    newMessage.created_at = new Date();
    newMessage.user_id = user.id;
    const spy = jasmine.createSpy();
    service.latestMessageDateByUserByChannels$.subscribe(spy);
    (activeChannel as MockChannel).handleEvent('message.new', {
      message: newMessage,
    });

    expect(spy).toHaveBeenCalledWith({ channel1: newMessage.created_at });
  });

  it('should call custom #customFileUploadRequest and #customImageUploadRequest if provided', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
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
    spyOn(channel, 'sendImage');
    spyOn(channel, 'sendFile');
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

    expect(channel.sendImage).not.toHaveBeenCalled();
    expect(channel.sendFile).not.toHaveBeenCalled();

    expectedResult.forEach((r, i) => {
      expect(r).toEqual(result[i]);
    });
  });

  it('should call custom #customImageDeleteRequest if provided', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
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
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
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
    const spy = jasmine.createSpy();
    service.shouldRecoverState$.subscribe(spy);
    spy.calls.reset();
    await init();
    mockChatClient.queryChannels.calls.reset();
    events$.next({ eventType: 'connection.recovered' } as ClientEvent);

    expect(mockChatClient.queryChannels).toHaveBeenCalledWith(
      jasmine.any(Object),
      jasmine.any(Object),
      jasmine.any(Object),
      jasmine.any(Object),
    );

    expect(spy).not.toHaveBeenCalled();
  });

  it(`shouldn't do duplicate state reset after connection recovered`, async () => {
    await init();
    mockChatClient.queryChannels.calls.reset();
    events$.next({ eventType: 'connection.recovered' } as ClientEvent);
    events$.next({ eventType: 'connection.recovered' } as ClientEvent);

    expect(mockChatClient.queryChannels).toHaveBeenCalledTimes(1);
  });

  it('should reset pagination options after reconnect', async () => {
    await init(undefined, undefined, { limit: 20 });
    mockChatClient.queryChannels.calls.reset();
    events$.next({ eventType: 'connection.recovered' } as ClientEvent);

    expect(mockChatClient.queryChannels).toHaveBeenCalledWith(
      jasmine.any(Object),
      jasmine.any(Object),
      {
        limit: 20,
        state: true,
        presence: true,
        watch: true,
        message_limit: 25,
      },
      jasmine.any(Object),
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
    const messageId = '1232121123';
    const response = service.jumpToMessage(messageId);

    expect(service.isMessageLoadingInProgress).toBeTrue();

    await response;

    expect(jumpToMessageIdSpy).toHaveBeenCalledWith({
      id: messageId,
      parentId: undefined,
    });

    expect(messagesSpy).toHaveBeenCalledWith(
      jasmine.arrayContaining([jasmine.objectContaining({ id: messageId })]),
    );
    expect(service.isMessageLoadingInProgress).toBeFalse();
  });

  it(`should display error notification if message couldn't be loaded`, async () => {
    await init();
    const jumpToMessageIdSpy = jasmine.createSpy();
    service.jumpToMessage$.subscribe(jumpToMessageIdSpy);
    jumpToMessageIdSpy.calls.reset();
    const messagesSpy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(messagesSpy);
    messagesSpy.calls.reset();
    let activeChannel: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (activeChannel = c!));
    const error = new Error();
    spyOn(activeChannel!.state, 'loadMessageIntoState').and.rejectWith(error);
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    const messageId = '1232121123';
    await expectAsync(service.jumpToMessage(messageId)).toBeRejectedWith(error);

    expect(jumpToMessageIdSpy).not.toHaveBeenCalled();
    expect(messagesSpy).not.toHaveBeenCalled();
    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Message not found',
    );
    expect(service.isMessageLoadingInProgress).toBeFalse();
  });

  it('should pin message', async () => {
    await init();
    const message = mockMessage();
    void service.pinMessage(message);

    expect(mockChatClient.pinMessage).toHaveBeenCalledWith(message);
  });

  it('should display error notification if pinning was unsuccesful', async () => {
    await init();
    const message = mockMessage();
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification').and.callThrough();
    const error = new Error('error');
    mockChatClient.pinMessage.and.rejectWith(error);

    await expectAsync(service.pinMessage(message)).toBeRejectedWith(error);

    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Error pinning message',
    );
  });

  it('should unpin message', async () => {
    await init();
    const message = mockMessage();
    void service.unpinMessage(message);

    expect(mockChatClient.unpinMessage).toHaveBeenCalledWith(message);
  });

  it('should display error notification if unpinning was unsuccesful', async () => {
    await init();
    const message = mockMessage();
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification').and.callThrough();
    const error = new Error('error');
    mockChatClient.unpinMessage.and.rejectWith(error);

    await expectAsync(service.unpinMessage(message)).toBeRejectedWith(error);

    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Error removing message pin',
    );
  });

  it('should relaod active channel if active channel is not present after state reconnect', fakeAsync(async () => {
    await init();
    flush();
    let activeChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (activeChannel = c!));
    let channels!: Channel<DefaultStreamChatGenerics>[];
    service.channels$.subscribe((c) => (channels = c!));
    channels = channels.filter((c) => c.id !== activeChannel.id);
    spyOn(activeChannel, 'watch');
    mockChatClient.queryChannels.and.resolveTo(channels);
    events$.next({ eventType: 'connection.recovered' } as ClientEvent);
    tick();
    flush();
    const spy = jasmine.createSpy();
    service.activeChannel$.subscribe(spy);

    expect(spy).toHaveBeenCalledWith(activeChannel);
    expect(activeChannel.watch).toHaveBeenCalledWith();
  }));

  it(`should reselect active channel if active channel is present after state reconnect, new messages are fetched`, fakeAsync(async () => {
    await init();
    let channels!: Channel<DefaultStreamChatGenerics>[];
    service.channels$.subscribe((c) => (channels = c!));
    const activeChannel = channels[0];
    const messagesSpy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(messagesSpy);
    messagesSpy.calls.reset();
    mockChatClient.queryChannels.and.resolveTo(channels);
    const newMessage = generateMockMessages()[0];
    newMessage.text = 'new message received while offline';
    activeChannel.state.messages.push(newMessage);
    events$.next({ eventType: 'connection.recovered' } as ClientEvent);
    tick();
    flush();

    expect(service.activeChannel).toBe(activeChannel);
    expect(messagesSpy).toHaveBeenCalledWith(
      jasmine.arrayContaining([newMessage]),
    );
  }));

  it('should add new channel to channel list', async () => {
    await init();
    const channelsSpy = jasmine.createSpy();
    service.channels$.subscribe(channelsSpy);
    channelsSpy.calls.reset();

    const newChannel = generateMockChannels(1)[0];
    newChannel.cid = 'my-new-channel';
    service.setAsActiveChannel(newChannel);

    expect(channelsSpy).toHaveBeenCalledWith(
      jasmine.arrayContaining([newChannel]),
    );
  });

  it('should do nothing if same channel is selected twice', async () => {
    await init();
    const activeChannel = generateMockChannels()[0];

    service.setAsActiveChannel(activeChannel);

    const spy = jasmine.createSpy();
    service.activeChannel$.subscribe(spy);
    spy.calls.reset();
    service.setAsActiveChannel(activeChannel);

    expect(spy).not.toHaveBeenCalled();
  });

  it('should set last read message id', async () => {
    await init();
    const activeChannel = generateMockChannels()[1];
    activeChannel.id = 'next-active-channel';
    activeChannel.state.read[user.id] = {
      last_read: new Date(),
      last_read_message_id: 'last-read-message-id',
      unread_messages: 5,
      user: user,
    };

    service.setAsActiveChannel(activeChannel);

    expect(service.activeChannelLastReadMessageId).toBe('last-read-message-id');
    expect(service.activeChannelUnreadCount).toBe(5);
  });

  it(`should set last read message id to undefined if it's the last message`, async () => {
    await init();
    const activeChannel = generateMockChannels()[0];
    activeChannel.id = 'next-active-channel';
    activeChannel.state.read[user.id] = {
      last_read: new Date(),
      last_read_message_id: 'last-read-message-id',
      unread_messages: 0,
      user: user,
    };
    activeChannel.state.latestMessages = [
      {
        id: 'last-read-message-id',
      } as any as FormatMessageResponse<DefaultStreamChatGenerics>,
    ];

    service.setAsActiveChannel(activeChannel);

    expect(service.activeChannelLastReadMessageId).toBe(undefined);
    expect(service.activeChannelUnreadCount).toBe(0);
  });

  it('should be able to select empty channel as active channel', async () => {
    await init();
    const channel = generateMockChannels()[1];
    channel.id = 'new-empty-channel';
    channel.state.messages = [];
    channel.state.latestMessages = [];

    service.setAsActiveChannel(channel);

    const spy = jasmine.createSpy();
    service.activeChannel$.subscribe(spy);

    expect(spy).toHaveBeenCalledWith(channel);
    expect(service.activeChannelLastReadMessageId).toBeUndefined();
    expect(service.activeChannelUnreadCount).toBe(0);
  });

  it('should update user references on `user.updated` event', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.activeChannel$.subscribe(spy);
    let activeChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(take(1)).subscribe((c) => (activeChannel = c!));
    activeChannel.state.members['jack'].user!.name = 'John';
    mockChatClient.activeChannels[activeChannel.cid] = activeChannel;
    spy.calls.reset();
    events$.next({ eventType: 'user.updated' } as ClientEvent);

    const updatedChannel = spy.calls.mostRecent()
      .args[0] as Channel<DefaultStreamChatGenerics>;

    expect(updatedChannel.state.members['jack'].user!.name).toBe('John');
  });

  it('should load message reactions', async () => {
    await init();
    const activeChannel = service.activeChannel!;
    const message = service.activeChannelMessages[0];
    const mockReactions = [
      { type: 'wow', user: { id: 'jack' } },
    ] as ReactionResponse[];
    spyOn(activeChannel, 'getReactions').and.resolveTo({
      reactions: mockReactions,
      duration: '',
    });
    const reactions = await service.getMessageReactions(message.id);

    expect(activeChannel.getReactions).toHaveBeenCalledWith(
      message.id,
      jasmine.anything(),
    );

    expect(reactions).toEqual(mockReactions);
  });

  it('should load message reactions - multiple pages', async () => {
    await init();
    const activeChannel = service.activeChannel!;
    const message = service.activeChannelMessages[0];
    const mockReactionsFirstPage = new Array(300)
      .fill(null)
      .map(() => ({ type: 'wow', user: { id: 'jack' } })) as ReactionResponse[];
    const mockReactionsSecondPage = new Array(1)
      .fill(null)
      .map(() => ({ type: 'wow', user: { id: 'jack' } })) as ReactionResponse[];
    let counter = 0;
    spyOn(activeChannel, 'getReactions').and.callFake(() => {
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

    expect(reactions).toEqual([
      ...mockReactionsFirstPage,
      ...mockReactionsSecondPage,
    ]);
  });

  it('should load message reactions - but no more than 1200', async () => {
    await init();
    const activeChannel = service.activeChannel!;
    const message = service.activeChannelMessages[0];
    const mockReactionsPage = new Array(300)
      .fill(null)
      .map(() => ({ type: 'wow', user: { id: 'jack' } })) as ReactionResponse[];
    spyOn(activeChannel, 'getReactions').and.resolveTo({
      reactions: mockReactionsPage,
      duration: '',
    });
    const reactions = await service.getMessageReactions(message.id);

    expect(reactions.length).toEqual(1200);
  });

  it('should load message reactions - error', async () => {
    await init();
    const activeChannel = service.activeChannel!;
    const message = service.activeChannelMessages[0];
    const error = new Error('Reactions loading failed');
    spyOn(activeChannel, 'getReactions').and.rejectWith(error);
    const notificationService = TestBed.inject(NotificationService);
    const notificationSpy = jasmine.createSpy();
    notificationService.notifications$.subscribe(notificationSpy);
    notificationSpy.calls.reset();

    await expectAsync(service.getMessageReactions(message.id)).toBeRejectedWith(
      error,
    );

    expect(notificationSpy).toHaveBeenCalledWith([
      jasmine.objectContaining({ text: 'streamChat.Error loading reactions' }),
    ]);
  });

  it('should mark message as unread', async () => {
    await init();
    const activeChannel = service.activeChannel!;
    const message = service.activeChannelMessages[0];

    spyOn(activeChannel, 'markUnread').and.resolveTo();
    await service.markMessageUnread(message.id);

    expect(activeChannel.markUnread).toHaveBeenCalledWith({
      message_id: message.id,
    });
  });

  it('should mark message as unread - error', async () => {
    await init();
    const activeChannel = service.activeChannel!;
    const message = service.activeChannelMessages[0];

    const error = {
      response: {
        data: { code: 4, StatusCode: 400, message: 'You made a mistake' },
      },
    };
    spyOn(activeChannel, 'markUnread').and.rejectWith(error);
    const spy = jasmine.createSpy();
    const notificationService = TestBed.inject(NotificationService);
    notificationService.notifications$.subscribe(spy);
    await expectAsync(service.markMessageUnread(message.id)).toBeRejectedWith(
      error,
    );

    expect(spy).toHaveBeenCalledWith([
      jasmine.objectContaining({
        text: 'streamChat.Error marking message as unread',
        type: 'error',
      }),
    ]);

    error.response.data.message =
      'MarkUnread failed with error: "Either the message with ID "zitaszuperagetstreamio-c710c117-5a8e-4769-a43d-f6add79d8520" does not exist, or it is older than last 100 channel messages."';
    spy.calls.reset();
    await expectAsync(service.markMessageUnread(message.id)).toBeRejectedWith(
      error,
    );

    expect(spy).toHaveBeenCalledWith(
      jasmine.arrayContaining([
        jasmine.objectContaining({
          text: 'streamChat.Error, only the first {{count}} message can be marked as unread',
          type: 'error',
          translateParams: { count: '100' },
        }),
      ]),
    );
  });

  it('should react to notification.mark_unread events', async () => {
    await init();
    events$.next({
      eventType: 'notification.mark_unread',
      event: {
        channel_id: service.activeChannel?.id,
        unread_messages: 12,
        last_read_message_id: 'last-read-message',
      } as Event<DefaultStreamChatGenerics>,
    });

    expect(service.activeChannelLastReadMessageId).toBe('last-read-message');
    expect(service.activeChannelUnreadCount).toBe(12);

    events$.next({
      eventType: 'notification.mark_unread',
      event: {
        channel_id: 'not-active-channel',
        unread_messages: 20,
        last_read_message_id: 'different id',
      } as Event<DefaultStreamChatGenerics>,
    });

    expect(service.activeChannelLastReadMessageId).toBe('last-read-message');
    expect(service.activeChannelUnreadCount).toBe(12);
  });

  it('should halt marking the channel as read if an unread call was made in that session', async () => {
    await init();
    const activeChannel = service.activeChannel!;
    spyOn(activeChannel, 'markRead');

    await service.markMessageUnread('message-id');
    (activeChannel as MockChannel).handleEvent('message.new', mockMessage());

    expect(activeChannel.markRead).not.toHaveBeenCalled();

    service.deselectActiveChannel();
    service.setAsActiveChannel(activeChannel);

    expect(activeChannel.markRead).toHaveBeenCalledWith();
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

    expect(result).toEqual(mockChannels);
    expect(customQuery).toHaveBeenCalledWith('first-page');
    expect(service['shouldSetActiveChannel']).toBeFalse();
    expect(service['messagePageSize']).toBe(30);
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
    await new Promise((resolve) => {
      setTimeout(resolve, service['markReadThrottleTime']);
    });

    const activeChannel = service.activeChannel!;
    spyOn(activeChannel, 'markRead');

    (activeChannel as MockChannel).handleEvent('message.new', mockMessage());

    expect(activeChannel.markRead).toHaveBeenCalledTimes(1);

    (activeChannel as MockChannel).handleEvent('message.new', mockMessage());

    expect(activeChannel.markRead).toHaveBeenCalledTimes(1);

    // wait for mark read throttle time
    await new Promise((resolve) => {
      setTimeout(resolve, service['markReadThrottleTime']);
    });

    expect(activeChannel.markRead).toHaveBeenCalledTimes(2);
  });

  it('should throttle mark read API calls - channel change', async () => {
    await init();
    // wait for mark read throttle time
    await new Promise((resolve) => {
      setTimeout(resolve, service['markReadThrottleTime']);
    });

    const activeChannel = service.activeChannel!;
    spyOn(activeChannel, 'markRead');

    (activeChannel as MockChannel).handleEvent('message.new', mockMessage());

    expect(activeChannel.markRead).toHaveBeenCalledTimes(1);

    (activeChannel as MockChannel).handleEvent('message.new', mockMessage());

    expect(activeChannel.markRead).toHaveBeenCalledTimes(1);

    service.setAsActiveChannel(service.channels[1]);

    expect(activeChannel.markRead).toHaveBeenCalledTimes(2);
  });

  it('should throttle mark read API calls - reset', async () => {
    await init();
    // wait for mark read throttle time
    await new Promise((resolve) => {
      setTimeout(resolve, service['markReadThrottleTime']);
    });

    const activeChannel = service.activeChannel!;
    spyOn(activeChannel, 'markRead');

    (activeChannel as MockChannel).handleEvent('message.new', mockMessage());

    expect(activeChannel.markRead).toHaveBeenCalledTimes(1);

    (activeChannel as MockChannel).handleEvent('message.new', mockMessage());

    expect(activeChannel.markRead).toHaveBeenCalledTimes(1);

    service.reset();

    expect(activeChannel.markRead).toHaveBeenCalledTimes(2);
  });

  it('should signal if state recovery is needed - initial load', async () => {
    const spy = jasmine.createSpy();
    service.shouldRecoverState$.subscribe(spy);

    expect(spy).toHaveBeenCalledWith(false);
    spy.calls.reset();
    const error = 'there was an error';

    await expectAsync(
      init(undefined, undefined, undefined, () =>
        mockChatClient.queryChannels.and.rejectWith(error),
      ),
    ).toBeRejectedWith(error);

    expect(spy).toHaveBeenCalledWith(true);

    spy.calls.reset();
    mockChatClient.queryChannels.and.resolveTo([]);
    await service.recoverState();

    expect(spy).toHaveBeenCalledWith(false);
  });

  it('should signal if state recovery is needed - failed state recover after connection.recovered', fakeAsync(() => {
    void init();
    tick();
    const spy = jasmine.createSpy();
    service.shouldRecoverState$.subscribe(spy);
    spy.calls.reset();
    mockChatClient.queryChannels.and.rejectWith(
      new Error('there was an error'),
    );
    events$.next({ eventType: 'connection.recovered' } as ClientEvent);

    tick();
    flush();

    expect(spy).toHaveBeenCalledWith(true);

    spy.calls.reset();
    mockChatClient.queryChannels.and.resolveTo([]);
    void service.recoverState();
    tick();
    flush();

    expect(spy).toHaveBeenCalledWith(false);
  }));
});
