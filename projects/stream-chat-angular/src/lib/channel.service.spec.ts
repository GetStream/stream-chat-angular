import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { first } from 'rxjs/operators';
import { Channel, Event, StreamChat, UserResponse } from 'stream-chat';
import { ChannelService } from './channel.service';
import { ChatClientService, Notification } from './chat-client.service';
import {
  generateMockChannels,
  MockChannel,
  mockCurrentUser,
  mockMessage,
  Spied,
} from './mocks';
import { StreamMessage } from './types';

describe('ChannelService', () => {
  let service: ChannelService;
  let mockChatClient: Spied<StreamChat>;
  let notification$: Subject<Notification>;
  let init: (c?: Channel[]) => Promise<void>;
  let user: UserResponse;

  beforeEach(() => {
    mockChatClient = {} as Spied<StreamChat> & StreamChat;
    mockChatClient.queryChannels = jasmine
      .createSpy()
      .and.returnValue(generateMockChannels());
    mockChatClient.channel = jasmine.createSpy();
    user = mockCurrentUser();
    notification$ = new Subject();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ChatClientService,
          useValue: { chatClient: { ...mockChatClient, user }, notification$ },
        },
      ],
    });
    service = TestBed.inject(ChannelService);
    init = async (channels?: Channel[]) => {
      mockChatClient.queryChannels.and.returnValue(
        channels || generateMockChannels()
      );

      await service.init();
    };
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
    service.setAsActiveChannel(mockChannels[1]);
    result = spy.calls.mostRecent().args[0] as Channel;

    expect(result.cid).toBe(mockChannels[1].cid);
    expect(messagesSpy).toHaveBeenCalledWith(jasmine.any(Object));
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

  it('should watch for message events', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(spy);
    const prevCount = (spy.calls.mostRecent().args[0] as Channel[]).length;
    spy.calls.reset();
    let activeChannel!: Channel;
    service.activeChannel$.subscribe((c) => (activeChannel = c!));
    (activeChannel as MockChannel).handleEvent('message.new', mockMessage());

    const newCount = (spy.calls.mostRecent().args[0] as Channel[]).length;

    expect(newCount).toBe(prevCount + 1);
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
    (activeChannel as MockChannel).handleEvent('reaction.new', message);

    expect(spy).toHaveBeenCalledWith(jasmine.any(Object));

    spy.calls.reset();
    (activeChannel as MockChannel).handleEvent('reaction.updated', message);

    expect(spy).toHaveBeenCalledWith(jasmine.any(Object));

    spy.calls.reset();
    (activeChannel as MockChannel).handleEvent('reaction.deleted', message);

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

  it('should add the new channel to the top of the list, and start watching it, if user a new message is received from the channel', fakeAsync(async () => {
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
    let prevMessageCount!: number;
    service.activeChannelMessages$
      .pipe(first())
      .subscribe((m) => (prevMessageCount = m.length));
    await service.sendMessage(text, attachments);
    let latestMessage!: StreamMessage;
    let messageCount!: number;
    service.activeChannelMessages$.subscribe((m) => {
      latestMessage = m[m.length - 1];
      messageCount = m.length;
    });

    expect(channel.sendMessage).toHaveBeenCalledWith({
      text,
      attachments,
      id: jasmine.any(String),
    });

    expect(channel.state.addMessageSorted).toHaveBeenCalledWith(
      jasmine.objectContaining({ text, user, attachments }),
      true
    );

    expect(latestMessage.text).toBe(text);
    expect(messageCount).toEqual(prevMessageCount + 1);
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
    (channel as MockChannel).handleEvent('message.new', {
      id: latestMessage.id,
    });

    expect(latestMessage.status).toBe('received');
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

  it('should upload images', async () => {
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
    const file1 = { name: 'food.png' } as File;
    const file2 = { name: 'file_error.jpg' } as File;
    const attachments = [file1, file2];
    const result = await service.uploadAttachments(attachments);
    const expectedResult = [
      {
        file: file1,
        state: 'success',
        url: 'url/to/image',
      },
      { file: file2, state: 'error' },
    ];

    expectedResult.forEach((r, i) => {
      expect(r).toEqual(result[i]);
    });
  });

  it('should delete attachment', async () => {
    await init();
    let channel!: Channel;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    spyOn(channel, 'deleteImage');
    const url = 'url/to/image';
    await service.deleteAttachment(url);

    expect(channel.deleteImage).toHaveBeenCalledWith(url);
  });
});
