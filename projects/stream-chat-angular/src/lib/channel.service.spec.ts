import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { first } from 'rxjs/operators';
import {
  Channel,
  ChannelMemberResponse,
  ChannelOptions,
  ChannelSort,
  Event,
  SendMessageAPIResponse,
  UserResponse,
} from 'stream-chat';
import { ChannelService } from './channel.service';
import { ChatClientService, Notification } from './chat-client.service';
import {
  generateMockChannels,
  MockChannel,
  mockCurrentUser,
  mockMessage,
} from './mocks';
import { AttachmentUpload, StreamMessage } from './types';

describe('ChannelService', () => {
  let service: ChannelService;
  let mockChatClient: {
    queryChannels: jasmine.Spy;
    channel: jasmine.Spy;
    updateMessage: jasmine.Spy;
    deleteMessage: jasmine.Spy;
    userID: string;
  };
  let notification$: Subject<Notification>;
  let connectionState$: Subject<'online' | 'offline'>;
  let init: (
    c?: Channel[],
    sort?: ChannelSort,
    options?: ChannelOptions,
    mockChannelQuery?: Function,
    shouldSetActiveChannel?: boolean
  ) => Promise<Channel[]>;
  let user: UserResponse;
  const filters = { type: 'messaging' };

  beforeEach(() => {
    user = mockCurrentUser();
    connectionState$ = new Subject<'online' | 'offline'>();
    mockChatClient = {
      queryChannels: jasmine
        .createSpy()
        .and.returnValue(generateMockChannels()),
      channel: jasmine.createSpy(),
      updateMessage: jasmine.createSpy(),
      deleteMessage: jasmine.createSpy(),
      userID: user.id,
    };
    notification$ = new Subject();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ChatClientService,
          useValue: {
            chatClient: { ...mockChatClient, user },
            notification$,
            connectionState$,
          },
        },
      ],
    });
    service = TestBed.inject(ChannelService);
    init = (
      channels?: Channel[],
      sort?: ChannelSort,
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

  it('should use provided sort params', async () => {
    const sort: ChannelSort = { last_message_at: -1 };
    await init(undefined, sort);

    expect(mockChatClient.queryChannels).toHaveBeenCalledWith(
      jasmine.any(Object),
      sort,
      jasmine.any(Object)
    );
  });

  it('should use provided options params', async () => {
    const options: ChannelOptions = { offset: 5 };
    await init(undefined, undefined, options);

    expect(mockChatClient.queryChannels).toHaveBeenCalledWith(
      jasmine.any(Object),
      jasmine.any(Object),
      options
    );
  });

  it('should use provided filter params', async () => {
    await init();

    expect(mockChatClient.queryChannels).toHaveBeenCalledWith(
      filters,
      jasmine.any(Object),
      jasmine.any(Object)
    );
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
    const expectedResult = generateMockChannels();
    const result = await init(expectedResult);

    expect(result as any as MockChannel[]).toEqual(expectedResult);
  });

  it('should return the result of the init - error', async () => {
    const error = 'there was an error';

    await expectAsync(
      init(undefined, undefined, undefined, () =>
        mockChatClient.queryChannels.and.rejectWith(error)
      )
    ).toBeRejectedWith(error);
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
    messagesSpy.calls.reset();
    activeChannelSpy.calls.reset();
    channelsSpy.calls.reset();
    messageToQuoteSpy.calls.reset();
    latestMessagesSpy.calls.reset();
    service.reset();

    expect(messagesSpy).toHaveBeenCalledWith([]);
    expect(channelsSpy).toHaveBeenCalledWith(undefined);
    expect(activeChannelSpy).toHaveBeenCalledWith(undefined);
    expect(messageToQuoteSpy).toHaveBeenCalledWith(undefined);
    expect(latestMessagesSpy).toHaveBeenCalledWith({});
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

  it('should load more channels', async () => {
    await init();
    mockChatClient.queryChannels.calls.reset();
    await service.loadMoreChannels();

    expect(mockChatClient.queryChannels).toHaveBeenCalledWith(
      jasmine.any(Object),
      jasmine.any(Object),
      jasmine.any(Object)
    );
  });

  it('should set active channel', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.activeChannel$.subscribe(spy);
    const mockChannels = generateMockChannels();

    let result = spy.calls.mostRecent().args[0] as Channel;

    expect(result.cid).toBe(mockChannels[0].cid);

    const messagesSpy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(messagesSpy);
    messagesSpy.calls.reset();
    const messageToQuoteSpy = jasmine.createSpy();
    service.messageToQuote$.subscribe(messageToQuoteSpy);
    messageToQuoteSpy.calls.reset();
    const newActiveChannel = mockChannels[1];
    spyOn(newActiveChannel, 'markRead');
    service.setAsActiveChannel(newActiveChannel);
    result = spy.calls.mostRecent().args[0] as Channel;

    expect(result.cid).toBe(newActiveChannel.cid);
    expect(messagesSpy).toHaveBeenCalledWith(jasmine.any(Object));
    expect(newActiveChannel.markRead).toHaveBeenCalledWith();
    expect(messageToQuoteSpy).toHaveBeenCalledWith(undefined);
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
    /* eslint-disable jasmine/new-line-before-expect */
    service.activeChannelMessages$.subscribe((messages) => {
      messages.forEach((m) => expect(m.readBy).not.toBeUndefined());
    });
    /* eslint-enable jasmine/new-line-before-expect */
  });

  it('should load more messages', async () => {
    await init();
    let activeChannel!: Channel;
    service.activeChannel$.subscribe((c) => (activeChannel = c as Channel));
    spyOn(activeChannel, 'query').and.callThrough();
    await service.loadMoreMessages();

    expect(activeChannel.query).toHaveBeenCalledWith(jasmine.any(Object));

    const arg = (activeChannel.query as jasmine.Spy).calls.mostRecent()
      .args[0] as { messages: { id_lt: string } };
    const latestMessage = activeChannel.state.messages[0];

    expect(arg.messages.id_lt).toEqual(latestMessage.id);
  });

  it('should add reaction', async () => {
    await init();
    let activeChannel!: Channel;
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
    let activeChannel!: Channel;
    service.activeChannel$.subscribe((c) => (activeChannel = c!));
    spyOn(activeChannel, 'deleteReaction');
    const messageId = 'id';
    const reactionType = 'wow';
    await service.removeReaction(messageId, reactionType);

    expect(activeChannel.deleteReaction).toHaveBeenCalledWith(
      messageId,
      reactionType
    );
  });

  it('should watch for new message events', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(spy);
    const prevCount = (spy.calls.mostRecent().args[0] as Channel[]).length;
    spy.calls.reset();
    let activeChannel!: Channel;
    service.activeChannel$.subscribe((c) => (activeChannel = c!));
    const newMessage = mockMessage();
    activeChannel.state.messages.push(newMessage);
    spyOn(activeChannel, 'markRead');
    (activeChannel as MockChannel).handleEvent('message.new', newMessage);

    const newCount = (spy.calls.mostRecent().args[0] as StreamMessage[]).length;

    expect(newCount).toBe(prevCount + 1);
    expect(activeChannel.markRead).toHaveBeenCalledWith();
  });

  it(`shouldn't make "markRead" call, if user dosen't have 'read-events' capability`, async () => {
    await init();
    let activeChannel!: Channel;
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
    let activeChannel!: Channel;
    service.activeChannel$.subscribe((c) => (activeChannel = c!));
    const message =
      activeChannel.state.messages[activeChannel.state.messages.length - 1];
    message.text = 'updated';
    (activeChannel as MockChannel).handleEvent('message.updated', { message });

    const messages = spy.calls.mostRecent().args[0] as StreamMessage[];
    const updatedMessage = messages[messages.length - 1];

    expect(updatedMessage.text).toBe('updated');
  });

  it('should watch for message deleted events', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(spy);
    spy.calls.reset();
    let activeChannel!: Channel;
    service.activeChannel$.subscribe((c) => (activeChannel = c!));
    const message = {
      ...activeChannel.state.messages[activeChannel.state.messages.length - 1],
    };
    message.deleted_at = new Date().toISOString();
    (activeChannel as MockChannel).handleEvent('message.deleted', { message });

    expect(spy).toHaveBeenCalledWith(jasmine.arrayContaining([message]));
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
      message: mockMessage(),
      type: 'message.new',
    } as any as Event;
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
      message: mockMessage(),
      type: 'message.new',
    } as any as Event;
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
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    (channel as MockChannel).handleEvent('channel.hidden', {
      type: 'channel.hidden',
      channel,
    });

    let channels = spy.calls.mostRecent().args[0] as Channel[];

    expect(channels.find((c) => c.cid === channel.cid)).toBeUndefined();

    (channel as MockChannel).handleEvent('channel.hidden', {
      type: 'channel.visible',
      channel,
    });

    channels = spy.calls.mostRecent().args[0] as Channel[];

    expect(channels.find((c) => c.cid === channel.cid)).not.toBeUndefined();
  });

  it('should handle if channel visibility changes, if custom event handlers are provided', async () => {
    await init();
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const visibleSpy = jasmine.createSpy();
    const hiddenSpy = jasmine.createSpy();
    service.customChannelVisibleHandler = visibleSpy;
    service.customChannelHiddenHandler = hiddenSpy;
    const hiddenEvent = {
      type: 'channel.hidden',
      channel,
    } as any as Event;
    (channel as MockChannel).handleEvent('channel.hidden', hiddenEvent);

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
      channel,
    } as any as Event;
    (channel as MockChannel).handleEvent('channel.hidden', visibleEvent);

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
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    (channel as MockChannel).handleEvent('channel.deleted', {
      type: 'channel.deleted',
      channel,
    });

    const channels = spy.calls.mostRecent().args[0] as Channel[];

    expect(channels.find((c) => c.cid === channel.cid)).toBeUndefined();
  });

  it('should call #customChannelDeletedHandler, if channel is deleted and handler is provided', async () => {
    await init();
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const spy = jasmine.createSpy();
    service.customChannelDeletedHandler = spy;
    const event = {
      type: 'channel.deleted',
      channel,
    } as any as Event;
    (channel as MockChannel).handleEvent('channel.deleted', event);

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
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    (channel as MockChannel).handleEvent('channel.updated', {
      type: 'channel.updated',
      channel: {
        cid: channel.cid,
        name: 'New name',
      },
    });

    const channels = spy.calls.mostRecent().args[0] as Channel[];

    expect(channels.find((c) => c.cid === channel.cid)!.data!.name).toBe(
      'New name'
    );
  });

  it('should call #customChannelUpdatedHandler, if updated and handler is provided', async () => {
    await init();
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const spy = jasmine.createSpy();
    service.customChannelUpdatedHandler = spy;
    const event = {
      type: 'channel.updated',
      channel: {
        cid: channel.cid,
        name: 'New name',
      },
    } as any as Event;
    (channel as MockChannel).handleEvent('channel.updated', event);

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
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const channelsSpy = jasmine.createSpy();
    service.channels$.subscribe(channelsSpy);
    const messagesSpy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(messagesSpy);
    (channel as MockChannel).handleEvent('channel.truncated', {
      type: 'channel.truncated',
      channel: {
        cid: channel.cid,
        name: 'New name',
      },
    });

    const channels = channelsSpy.calls.mostRecent().args[0] as Channel[];

    expect(
      channels.find((c) => c.cid === channel.cid)!.state.messages.length
    ).toBe(0);

    expect(messagesSpy).toHaveBeenCalledWith([]);
  });

  it('should call #customChannelTruncatedHandler, if channel is truncated and custom handler is provided', async () => {
    await init();
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const spy = jasmine.createSpy();
    service.customChannelTruncatedHandler = spy;
    const event = {
      type: 'channel.truncated',
      channel: {
        cid: channel.cid,
        name: 'New name',
      },
    } as any as Event;
    (channel as MockChannel).handleEvent('channel.truncated', event);

    expect(spy).toHaveBeenCalledWith(
      event,
      channel,
      jasmine.any(Function),
      jasmine.any(Function),
      jasmine.any(Function),
      jasmine.any(Function)
    );
  });

  it('should watch for reaction events', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(spy);
    const message = (spy.calls.mostRecent().args[0] as StreamMessage[])[0];
    spy.calls.reset();
    let activeChannel!: Channel;
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

  it('should watch for channel events', async () => {
    const channel = generateMockChannels(1)[0];
    spyOn(channel, 'on').and.callThrough();
    await init([channel]);

    expect(channel.on).toHaveBeenCalledWith(jasmine.any(Function));
  });

  it('should add the new channel to the top of the list, and start watching it, if user is added to a channel', fakeAsync(async () => {
    await init();
    const newChannel = generateMockChannels()[0];
    newChannel.cid = 'newchannel';
    newChannel.id = 'newchannel';
    newChannel.type = 'messaging';
    mockChatClient.channel.and.returnValue(newChannel);
    spyOn(newChannel, 'watch').and.callThrough();
    spyOn(newChannel, 'on').and.callThrough();
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    notification$.next({
      eventType: 'notification.added_to_channel',
      event: { channel: newChannel } as any as Event,
    });
    tick();

    const channels = spy.calls.mostRecent().args[0] as Channel[];
    const firstChannel = channels[0];

    expect(firstChannel.cid).toBe(newChannel.cid);
    expect(newChannel.watch).toHaveBeenCalledWith();
    expect(newChannel.on).toHaveBeenCalledWith(jasmine.any(Function));
  }));

  it('should add the new channel to the top of the list, and start watching it, if a new message is received from the channel', fakeAsync(async () => {
    await init();
    const channel = generateMockChannels()[0];
    channel.cid = 'channel';
    channel.id = 'channel';
    channel.type = 'messaging';
    mockChatClient.channel.and.returnValue(channel);
    spyOn(channel, 'watch').and.callThrough();
    spyOn(channel, 'on').and.callThrough();
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    notification$.next({
      eventType: 'notification.message_new',
      event: { channel: channel } as any as Event,
    });
    tick();

    const channels = spy.calls.mostRecent().args[0] as Channel[];
    const firstChannel = channels[0];

    expect(firstChannel.cid).toBe(channel.cid);
    expect(channel.watch).toHaveBeenCalledWith();
    expect(channel.on).toHaveBeenCalledWith(jasmine.any(Function));
  }));

  it('should remove channel form the list if user is removed from channel', async () => {
    await init();
    let channel!: Channel;
    service.channels$
      .pipe(first())
      .subscribe((channels) => (channel = channels![1]));
    const spy = jasmine.createSpy();
    service.channels$.subscribe(spy);
    spyOn(service, 'setAsActiveChannel');
    notification$.next({
      eventType: 'notification.removed_from_channel',
      event: { channel: channel } as any as Event,
    });

    const channels = spy.calls.mostRecent().args[0] as Channel[];

    expect(channels.find((c) => c.cid === channel.cid)).toBeUndefined();
    expect(service.setAsActiveChannel).not.toHaveBeenCalled();
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
    notification$.next({
      eventType: 'notification.removed_from_channel',
      event: { channel: channel } as any as Event,
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
    const event = { channel: channel } as any as Event;
    const channelsSpy = jasmine.createSpy();
    service.channels$.subscribe(channelsSpy);
    channelsSpy.calls.reset();
    notification$.next({
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
      .and.callFake((_: Notification, setter: (channels: Channel[]) => []) =>
        setter([])
      );
    service.customAddedToChannelNotificationHandler = spy;
    let channel!: Channel;
    service.channels$
      .pipe(first())
      .subscribe((channels) => (channel = channels![1]));
    const event = { channel: channel } as any as Event;
    const channelsSpy = jasmine.createSpy();
    service.channels$.subscribe(channelsSpy);
    channelsSpy.calls.reset();
    notification$.next({
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
    const event = { channel: channel } as any as Event;
    const channelsSpy = jasmine.createSpy();
    service.channels$.subscribe(channelsSpy);
    channelsSpy.calls.reset();
    notification$.next({
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
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'sendMessage').and.callThrough();
    spyOn(channel.state, 'addMessageSorted').and.callThrough();
    const text = 'Hi';
    const attachments = [{ fallback: 'image.png', url: 'url/to/image' }];
    const mentionedUsers = [{ id: 'sara', name: 'Sara' }];
    const quotedMessageId = 'quotedMessage';
    let prevMessageCount!: number;
    service.activeChannelMessages$
      .pipe(first())
      .subscribe((m) => (prevMessageCount = m.length));
    await service.sendMessage(
      text,
      attachments,
      mentionedUsers,
      undefined,
      quotedMessageId
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
    });

    expect(channel.state.addMessageSorted).toHaveBeenCalledWith(
      jasmine.objectContaining({ text, user, attachments }),
      true
    );

    expect(latestMessage.text).toBe(text);
    expect(messageCount).toEqual(prevMessageCount + 1);
  });

  it('should send action', async () => {
    await init();
    let channel!: Channel;
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
    } as any as SendMessageAPIResponse);
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe(
      (m) => (latestMessage = m[m.length - 1])
    );
    await service.sendAction('message-1', { image_action: 'send' });

    expect(latestMessage.attachments![0]).toBe(giphy);
  });

  it('should remove message after action, if no message is returned', async () => {
    await init();
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'sendAction').and.resolveTo(
      {} as any as SendMessageAPIResponse
    );
    spyOn(channel.state, 'removeMessage');
    await service.sendAction('1', { image_action: 'send' });

    expect(channel.state.removeMessage).toHaveBeenCalledWith({ id: '1' });
  });

  it('should update message', () => {
    const message = mockMessage();
    void service.updateMessage(message);

    expect(mockChatClient.updateMessage).toHaveBeenCalledWith(message);
  });

  it('should delete message', () => {
    const message = mockMessage();
    void service.deleteMessage(message);

    expect(mockChatClient.deleteMessage).toHaveBeenCalledWith(message.id);
  });

  it('should resend message', async () => {
    await init();
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe((m) => {
      latestMessage = m[m.length - 1];
    });
    latestMessage.status = 'failed';
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'sendMessage').and.callThrough();
    spyOn(channel.state, 'addMessageSorted').and.callThrough();
    await service.resendMessage(latestMessage);

    expect(channel.sendMessage).toHaveBeenCalledWith(
      jasmine.objectContaining({
        id: latestMessage.id,
      })
    );

    expect(channel.state.addMessageSorted).toHaveBeenCalledWith(
      jasmine.objectContaining({
        status: 'sending',
        errorStatusCode: undefined,
      }),
      true
    );

    expect(latestMessage.status).toBe('sending');
  });

  it('should set message state while sending', async () => {
    await init();
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'sendMessage');
    const text = 'Hi';
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe(
      (m) => (latestMessage = m[m.length - 1])
    );
    void service.sendMessage(text);

    expect(latestMessage.status).toBe('sending');
  });

  it('should set message state after message is sent', async () => {
    await init();
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'sendMessage');
    const text = 'Hi';
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe(
      (m) => (latestMessage = m[m.length - 1])
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
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const localMessage = channel.state.messages.splice(
      channel.state.messages.length - 2,
      1
    )[0];
    channel.state.messages.push(localMessage);
    (channel as MockChannel).handleEvent('message.new', localMessage);
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe(
      (m) => (latestMessage = m[m.length - 1])
    );

    expect(latestMessage.id).toBe(localMessage.id);
  });

  it('should set message state, if an error occured', async () => {
    await init();
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'sendMessage').and.callFake(() =>
      Promise.reject({ status: 500 })
    );
    const text = 'Hi';
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe(
      (m) => (latestMessage = m[m.length - 1])
    );
    await service.sendMessage(text);

    expect(latestMessage.status).toBe('failed');
    expect(latestMessage.errorStatusCode).toBe(500);
  });

  it('should add sent message to message list', async () => {
    await init();
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'sendMessage').and.callFake(() =>
      Promise.resolve({
        message: { id: 'new-message' },
      } as SendMessageAPIResponse)
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
    let channel!: Channel;
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
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'sendImage').and.callFake((file: File) => {
      switch (file.name) {
        case 'file_error.jpg':
          return Promise.reject(new Error());
        default:
          return Promise.resolve({ file: 'url/to/image', duration: '200ms' });
      }
    });
    spyOn(channel, 'sendFile').and.callFake((file: File) => {
      switch (file.name) {
        case 'file_error.pdf':
          return Promise.reject(new Error());
        default:
          return Promise.resolve({ file: 'url/to/pdf', duration: '200ms' });
      }
    });
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
    const expectedResult = [
      {
        file: file1,
        state: 'success',
        url: 'url/to/image',
        type: 'image',
      },
      { file: file2, state: 'error', type: 'image' },
      {
        file: file3,
        state: 'success',
        url: 'url/to/pdf',
        type: 'file',
      },
      { file: file4, state: 'error', type: 'file' },
    ];

    expectedResult.forEach((r, i) => {
      expect(r).toEqual(result[i]);
    });
  });

  it('should delete image attachment', async () => {
    await init();
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'deleteImage');
    const url = 'url/to/image';
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
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'deleteFile');
    const url = 'url/to/file';
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
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    let latestMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe(
      (messages) => (latestMessage = messages[messages.length - 1])
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
      latestMessage.readBy.find((u) => u.id === 'jack')
    ).not.toBeUndefined();
  });

  it(`should unsubscribe from active channel events, after active channel changed`, async () => {
    await init();
    const spy = jasmine.createSpy('activeMessagesSpy');
    service.activeChannelMessages$.subscribe(spy);
    let prevActiveChannel!: Channel;
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
    channel.state.members = {
      jack: { user: { id: 'jack', name: 'Jack' } },
      john: { user: { id: 'john' } },
      [user.id]: { user },
    } as any as Record<string, ChannelMemberResponse>;
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
    spyOn(channel, 'queryMembers').and.callThrough();
    const users = Array.from({ length: 101 }, (_, i) => ({ id: `${i}` }));
    channel.state.members = {} as any as Record<string, ChannelMemberResponse>;
    users.forEach((u) => (channel.state.members[u.id] = { user: u }));
    service.setAsActiveChannel(channel);
    const result = await service.autocompleteMembers('ja');

    expect(channel.queryMembers).toHaveBeenCalledWith(
      jasmine.objectContaining({
        name: { $autocomplete: 'ja' },
      })
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
    let channel!: Channel;
    service.activeChannel$.subscribe((c) => (channel = c!));
    spyOn(channel, 'keystroke');
    await service.typingStarted();

    expect(channel.keystroke).toHaveBeenCalledWith(undefined);
  });

  it('should notify channel if typing stopped', async () => {
    await init();
    let channel!: Channel;
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
    let activeChannel!: Channel;
    service.activeChannel$
      .pipe(first())
      .subscribe((c) => (activeChannel = c as Channel));
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
});
