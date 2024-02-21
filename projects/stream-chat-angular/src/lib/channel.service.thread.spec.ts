import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { first } from 'rxjs/operators';
import {
  Channel,
  ChannelOptions,
  ChannelSort,
  Event,
  GetRepliesAPIResponse,
  SendMessageAPIResponse,
  UserResponse,
} from 'stream-chat';
import { ChannelService } from './channel.service';
import { ChatClientService, ClientEvent } from './chat-client.service';
import {
  generateMockChannels,
  MockChannel,
  mockCurrentUser,
  mockMessage,
} from './mocks';
import { NotificationService } from './notification.service';
import { DefaultStreamChatGenerics, StreamMessage } from './types';

describe('ChannelService - threads', () => {
  let service: ChannelService;
  let mockChatClient: {
    queryChannels: jasmine.Spy;
    channel: jasmine.Spy;
    updateMessage: jasmine.Spy;
    deleteMessage: jasmine.Spy;
    userID: string;
  };
  let events$: Subject<ClientEvent>;
  let connectionState$: Subject<'online' | 'offline'>;
  let init: (
    c?: Channel<DefaultStreamChatGenerics>[],
    sort?: ChannelSort<DefaultStreamChatGenerics>,
    options?: ChannelOptions
  ) => Promise<void>;
  let user: UserResponse<DefaultStreamChatGenerics>;
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
      options?: ChannelOptions
    ) => {
      mockChatClient.queryChannels.and.returnValue(
        channels || generateMockChannels()
      );

      await service.init(filters, sort, options);
    };
  });

  it('should reset active parent message and thread messages after channel changed', async () => {
    await init();
    const mockChannels = generateMockChannels();
    const messagesSpy = jasmine.createSpy();
    const activeParentMessageIdSpy = jasmine.createSpy();
    const activeParentMessageSpy = jasmine.createSpy();
    service.activeThreadMessages$.subscribe(messagesSpy);
    service.activeParentMessageId$.subscribe(activeParentMessageIdSpy);
    service.activeParentMessage$.subscribe(activeParentMessageSpy);
    messagesSpy.calls.reset();
    activeParentMessageIdSpy.calls.reset();
    activeParentMessageSpy.calls.reset();
    const newActiveChannel = mockChannels[1];
    service.setAsActiveChannel(newActiveChannel);

    expect(messagesSpy).toHaveBeenCalledWith([]);
    expect(activeParentMessageIdSpy).toHaveBeenCalledWith(undefined);
    expect(activeParentMessageSpy).toHaveBeenCalledWith(undefined);
  });

  it('should set active parent message and emit thread messages', async () => {
    await init();
    const messagesSpy = jasmine.createSpy();
    const activeParentMessageIdSpy = jasmine.createSpy();
    const activeParentMessageSpy = jasmine.createSpy();
    service.activeThreadMessages$.subscribe(messagesSpy);
    service.activeParentMessageId$.subscribe(activeParentMessageIdSpy);
    service.activeParentMessage$.subscribe(activeParentMessageSpy);
    messagesSpy.calls.reset();
    activeParentMessageIdSpy.calls.reset();
    activeParentMessageSpy.calls.reset();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (channel = c!));
    let parentMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe((m) => (parentMessage = m[0]));
    const replies = [mockMessage(), mockMessage(), mockMessage()];
    spyOn(channel, 'getReplies').and.resolveTo({
      messages: replies,
    } as any as GetRepliesAPIResponse<DefaultStreamChatGenerics>);
    await service.setAsActiveParentMessage(parentMessage);

    expect(messagesSpy).toHaveBeenCalledWith(replies);
    expect(activeParentMessageIdSpy).toHaveBeenCalledWith(parentMessage.id);
    expect(activeParentMessageSpy).toHaveBeenCalledWith(parentMessage);
  });

  it('should remove active parent message and reset thread messages', async () => {
    await init();
    let parentMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe((m) => (parentMessage = m[0]));
    const message = mockMessage();
    message.parent_id = parentMessage.id;
    await service.setAsActiveParentMessage(parentMessage);
    await service.jumpToMessage(message.id, message.parent_id);
    service.selectMessageToQuote(message);
    const messagesSpy = jasmine.createSpy();
    const activeParentMessageIdSpy = jasmine.createSpy();
    const activeParentMessageSpy = jasmine.createSpy();
    const messageToQuoteSpy = jasmine.createSpy();
    const jumpToMessageSpy = jasmine.createSpy();
    service.activeThreadMessages$.subscribe(messagesSpy);
    service.activeParentMessageId$.subscribe(activeParentMessageIdSpy);
    service.activeParentMessage$.subscribe(activeParentMessageSpy);
    service.messageToQuote$.subscribe(messageToQuoteSpy);
    service.jumpToMessage$.subscribe(jumpToMessageSpy);
    messagesSpy.calls.reset();
    activeParentMessageIdSpy.calls.reset();
    activeParentMessageSpy.calls.reset();
    messageToQuoteSpy.calls.reset();
    jumpToMessageSpy.calls.reset();
    await service.setAsActiveParentMessage(undefined);

    expect(messagesSpy).toHaveBeenCalledWith([]);
    expect(activeParentMessageIdSpy).toHaveBeenCalledWith(undefined);
    expect(activeParentMessageSpy).toHaveBeenCalledWith(undefined);
    expect(messageToQuoteSpy).toHaveBeenCalledWith(undefined);
    expect(jumpToMessageSpy).toHaveBeenCalledWith({
      id: undefined,
      parentId: undefined,
    });
  });

  it('should handle if selected parent message is removed from message list', async () => {
    await init();
    let parentMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe((m) => (parentMessage = m[0]));
    parentMessage.id = 'parentMessage';
    service.activeParentMessage$.subscribe();
    await service.setAsActiveParentMessage(parentMessage);
    spyOn(service, 'setAsActiveParentMessage').and.callThrough();
    await service.jumpToMessage('message-very-far-away');

    expect(service.setAsActiveParentMessage).toHaveBeenCalledWith(undefined);
  });

  it(`shouldn't deselect message to quote, if not a thread reply`, async () => {
    await init();
    const messageToQuoteSpy = jasmine.createSpy();
    service.messageToQuote$.subscribe(messageToQuoteSpy);
    const parentMessage = mockMessage();
    parentMessage.id = 'parentMessage';
    const messageToQuote = mockMessage();
    messageToQuote.parent_id = undefined;
    await service.setAsActiveParentMessage(parentMessage);
    service.selectMessageToQuote(messageToQuote);
    messageToQuoteSpy.calls.reset();
    await service.setAsActiveParentMessage(undefined);

    expect(messageToQuoteSpy).not.toHaveBeenCalled();
  });

  it(`shouldn't deselect jump-to-message, if not a thread reply`, async () => {
    await init();
    const jumpToMessageSpy = jasmine.createSpy();
    service.jumpToMessage$.subscribe(jumpToMessageSpy);
    const parentMessage = mockMessage();
    parentMessage.id = 'parentMessage';
    const messageToJump = mockMessage();
    messageToJump.parent_id = undefined;
    await service.setAsActiveParentMessage(parentMessage);
    await service.jumpToMessage(messageToJump.id, messageToJump.parent_id);
    jumpToMessageSpy.calls.reset();
    await service.setAsActiveParentMessage(undefined);

    expect(jumpToMessageSpy).not.toHaveBeenCalled();
  });

  it('should reset', async () => {
    await init();
    const messagesSpy = jasmine.createSpy();
    const activeParentMessageIdSpy = jasmine.createSpy();
    const activeParentMessageSpy = jasmine.createSpy();
    service.activeThreadMessages$.subscribe(messagesSpy);
    service.activeParentMessageId$.subscribe(activeParentMessageIdSpy);
    service.activeParentMessage$.subscribe(activeParentMessageSpy);
    messagesSpy.calls.reset();
    activeParentMessageIdSpy.calls.reset();
    activeParentMessageSpy.calls.reset();
    service.reset();

    expect(messagesSpy).toHaveBeenCalledWith([]);
    expect(activeParentMessageIdSpy).toHaveBeenCalledWith(undefined);
    expect(activeParentMessageSpy).toHaveBeenCalledWith(undefined);
  });

  it('should deselect thread after reconnect', fakeAsync(async () => {
    await init();
    let parentMessage!: StreamMessage;
    service.activeChannelMessages$.subscribe((m) => (parentMessage = m[0]));
    await service.setAsActiveParentMessage(parentMessage);
    const spy = jasmine.createSpy();
    service.activeParentMessage$.subscribe(spy);
    spy.calls.reset();
    events$.next({ eventType: 'connection.recovered' } as ClientEvent);
    tick();

    expect(spy).toHaveBeenCalledWith(undefined);
  }));

  it('should not add readBy field to messages', async () => {
    await init();
    const messagesSpy = jasmine.createSpy();
    service.activeThreadMessages$.subscribe(messagesSpy);
    messagesSpy.calls.reset();
    const message = mockMessage();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (channel = c!));
    const replies = [mockMessage(), mockMessage(), mockMessage()];
    spyOn(channel, 'getReplies').and.resolveTo({
      messages: replies,
    } as any as GetRepliesAPIResponse<DefaultStreamChatGenerics>);
    await service.setAsActiveParentMessage(message);
    let threadMessages!: StreamMessage[];
    service.activeThreadMessages$.subscribe((m) => (threadMessages = m));

    expect(threadMessages.length).toBeGreaterThan(0);
    threadMessages.forEach((m) => expect(m.readBy).toBeDefined());
  });

  it('should load more older messages', async () => {
    await init();
    const messagesSpy = jasmine.createSpy();
    service.activeThreadMessages$.subscribe(messagesSpy);
    messagesSpy.calls.reset();
    const parentMessage = mockMessage();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (channel = c!));
    const replies = [mockMessage(), mockMessage(), mockMessage()];
    spyOn(channel, 'getReplies').and.resolveTo({
      messages: replies,
    } as any as GetRepliesAPIResponse<DefaultStreamChatGenerics>);
    replies[0].id = 'firstreply';
    await service.setAsActiveParentMessage(parentMessage);
    let threadMessages!: StreamMessage[];
    (channel.getReplies as jasmine.Spy).calls.reset();
    channel.state.threads = {
      [parentMessage.id]: [...replies, mockMessage(), mockMessage()],
    };
    await service.loadMoreThreadReplies();
    service.activeThreadMessages$.subscribe((m) => (threadMessages = m));

    expect(channel.getReplies).toHaveBeenCalledWith(parentMessage.id, {
      limit: 25,
      id_lt: replies[0].id,
    });

    expect(threadMessages.length).toBe(5);
  });

  it('should do nothing if we want to load newer messages', async () => {
    await init();
    const messagesSpy = jasmine.createSpy();
    service.activeThreadMessages$.subscribe(messagesSpy);
    messagesSpy.calls.reset();
    const parentMessage = mockMessage();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (channel = c!));
    const replies = [mockMessage(), mockMessage(), mockMessage()];
    spyOn(channel, 'getReplies').and.resolveTo({
      messages: replies,
    } as any as GetRepliesAPIResponse<DefaultStreamChatGenerics>);
    replies[0].id = 'firstreply';
    await service.setAsActiveParentMessage(parentMessage);
    (channel.getReplies as jasmine.Spy).calls.reset();
    channel.state.threads = {
      [parentMessage.id]: [mockMessage(), mockMessage(), ...replies],
    };
    await service.loadMoreThreadReplies('newer');

    expect(channel.getReplies).not.toHaveBeenCalled();
  });

  it('should watch for new message events', async () => {
    await init();
    const spy = jasmine.createSpy();
    const parentMessage = mockMessage();
    await service.setAsActiveParentMessage(parentMessage);
    service.activeThreadMessages$.subscribe(spy);
    const prevCount = (spy.calls.mostRecent().args[0] as Channel[]).length;
    spy.calls.reset();
    let activeChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (activeChannel = c!));
    const newMessage = mockMessage();
    newMessage.parent_id = parentMessage.id;
    activeChannel.state.threads = { [parentMessage.id]: [newMessage] };
    spyOn(activeChannel, 'markRead');
    (activeChannel as MockChannel).handleEvent('message.new', {
      message: newMessage,
    });
    const newCount = (spy.calls.mostRecent().args[0] as StreamMessage[]).length;

    expect(newCount).toBe(prevCount + 1);
    expect(activeChannel.markRead).toHaveBeenCalledWith();
  });

  it('should only add new message to thread, if the parent id is the same as active thread id', async () => {
    await init();
    const spy = jasmine.createSpy();
    const parentMessage = mockMessage();
    await service.setAsActiveParentMessage(parentMessage);
    service.activeThreadMessages$.subscribe(spy);
    spy.calls.reset();
    let activeChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (activeChannel = c!));
    const newMessage = mockMessage();
    newMessage.parent_id = 'not' + parentMessage.id;
    activeChannel.state.threads = {
      [newMessage.parent_id]: [newMessage],
      [parentMessage.id]: [],
    };
    (activeChannel as MockChannel).handleEvent('message.new', {
      message: newMessage,
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it('should watch for message update events', async () => {
    await init();
    const parentMessage = mockMessage();
    let activeChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (activeChannel = c!));
    const messageToUpdate = mockMessage();
    messageToUpdate.parent_id = parentMessage.id;
    spyOn(activeChannel, 'getReplies').and.resolveTo({
      messages: [messageToUpdate],
    } as any as GetRepliesAPIResponse<DefaultStreamChatGenerics>);
    await service.setAsActiveParentMessage(parentMessage);
    messageToUpdate.text = 'updated';
    activeChannel.state.threads = { [parentMessage.id]: [messageToUpdate] };
    (activeChannel as MockChannel).handleEvent('message.updated', {
      message: messageToUpdate,
    });
    let message!: StreamMessage;
    service.activeThreadMessages$.subscribe(
      (messages) => (message = messages[0])
    );

    expect(message.text).toBe('updated');
  });

  it('should watch for message deleted events', async () => {
    await init();
    const parentMessage = mockMessage();
    let activeChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (activeChannel = c!));
    const messageToDelete = mockMessage();
    messageToDelete.parent_id = parentMessage.id;
    spyOn(activeChannel, 'getReplies').and.resolveTo({
      messages: [messageToDelete],
    } as any as GetRepliesAPIResponse<DefaultStreamChatGenerics>);
    await service.setAsActiveParentMessage(parentMessage);
    messageToDelete.deleted_at = new Date().toISOString();
    activeChannel.state.threads = { [parentMessage.id]: [messageToDelete] };
    (activeChannel as MockChannel).handleEvent('message.deleted', {
      message: messageToDelete,
    });
    let message!: StreamMessage;
    service.activeThreadMessages$.subscribe(
      (messages) => (message = messages[0])
    );

    expect(message.deleted_at).toBeDefined();
  });

  it('should handle if channel is truncated', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const messagesSpy = jasmine.createSpy();
    service.activeThreadMessages$.subscribe(messagesSpy);
    const parentMessageSpy = jasmine.createSpy();
    service.activeParentMessageId$.subscribe(parentMessageSpy);
    messagesSpy.calls.reset();
    parentMessageSpy.calls.reset();
    (channel as MockChannel).handleEvent('channel.truncated', {
      type: 'channel.truncated',
      channel: {
        cid: channel.cid,
      },
    });

    expect(messagesSpy).toHaveBeenCalledWith([]);
    expect(parentMessageSpy).toHaveBeenCalledWith(undefined);
  });

  it('should call #customChannelTruncatedHandler, if channel is truncated and custom handler is provided', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const spy = jasmine
      .createSpy()
      .and.callFake(
        (
          _,
          __,
          ___,
          ____,
          threadListSetter: (list: StreamMessage[]) => {},
          parentMessageSetter: (id: string | undefined) => {}
        ) => {
          threadListSetter([]);
          parentMessageSetter(undefined);
        }
      );
    service.customChannelTruncatedHandler = spy;
    const event = {
      type: 'channel.truncated',
      channel: {
        cid: channel.cid,
        name: 'New name',
      },
    } as any as Event<DefaultStreamChatGenerics>;
    const messagesSpy = jasmine.createSpy();
    service.activeThreadMessages$.subscribe(messagesSpy);
    const parentMessageSpy = jasmine.createSpy();
    service.activeParentMessageId$.subscribe(parentMessageSpy);
    messagesSpy.calls.reset();
    parentMessageSpy.calls.reset();
    (channel as MockChannel).handleEvent('channel.truncated', event);

    expect(spy).toHaveBeenCalledWith(
      event,
      channel,
      jasmine.any(Function),
      jasmine.any(Function),
      jasmine.any(Function),
      jasmine.any(Function)
    );

    expect(messagesSpy).toHaveBeenCalledWith([]);
    expect(parentMessageSpy).toHaveBeenCalledWith(undefined);
  });

  it('should watch for reaction events', async () => {
    await init();
    const spy = jasmine.createSpy();
    service.activeThreadMessages$.subscribe(spy);
    spy.calls.reset();
    let activeChannel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (activeChannel = c!));
    const parentMessage = mockMessage();
    const replies = [mockMessage(), mockMessage()];
    replies.forEach((r) => (r.parent_id = parentMessage.id));
    spyOn(activeChannel, 'getReplies').and.resolveTo({
      messages: replies,
    } as any as GetRepliesAPIResponse<DefaultStreamChatGenerics>);
    await service.setAsActiveParentMessage(parentMessage);
    const message = replies[1];
    (activeChannel as MockChannel).handleEvent('reaction.new', { message });

    expect(spy).toHaveBeenCalledWith(jasmine.any(Object));

    spy.calls.reset();
    (activeChannel as MockChannel).handleEvent('reaction.updated', { message });

    expect(spy).toHaveBeenCalledWith(jasmine.any(Object));

    spy.calls.reset();
    (activeChannel as MockChannel).handleEvent('reaction.deleted', { message });

    expect(spy).toHaveBeenCalledWith(jasmine.any(Object));
  });

  it('should send message', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const parentMessage = mockMessage();
    parentMessage.id = 'parentId';
    const replies = [mockMessage(), mockMessage()];
    replies.forEach((r) => (r.parent_id = parentMessage.id));
    channel.state.threads[parentMessage.id] = replies;
    spyOn(channel, 'getReplies').and.resolveTo({
      messages: replies,
    } as any as GetRepliesAPIResponse<DefaultStreamChatGenerics>);
    await service.setAsActiveParentMessage(parentMessage);
    spyOn(channel, 'sendMessage').and.callThrough();
    spyOn(channel.state, 'addMessageSorted').and.callThrough();
    const text = 'Hi';
    const attachments = [{ fallback: 'image.png', url: 'http://url/to/image' }];
    const mentionedUsers = [{ id: 'sara', name: 'Sara' }];
    const customData = {
      isVote: true,
      options: ['A', 'B', 'C'],
    };
    let prevMessageCount!: number;
    service.activeThreadMessages$
      .pipe(first())
      .subscribe((m) => (prevMessageCount = m.length));
    await service.sendMessage(
      text,
      attachments,
      mentionedUsers,
      parentMessage.id,
      undefined,
      customData
    );
    let latestMessage!: StreamMessage;
    let messageCount!: number;
    service.activeThreadMessages$.subscribe((m) => {
      latestMessage = m[m.length - 1];
      messageCount = m.length;
    });

    expect(channel.sendMessage).toHaveBeenCalledWith({
      text,
      attachments,
      mentioned_users: ['sara'],
      id: jasmine.any(String),
      parent_id: 'parentId',
      quoted_message_id: undefined,
      ...customData,
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
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const parentMessage = mockMessage();
    parentMessage.id = 'parentId';
    const replies = [mockMessage(1), mockMessage(2)];
    replies.forEach((r) => (r.parent_id = parentMessage.id));
    channel.state.threads[parentMessage.id] = replies;
    spyOn(channel, 'getReplies').and.resolveTo({
      messages: replies,
    } as any as GetRepliesAPIResponse<DefaultStreamChatGenerics>);
    await service.setAsActiveParentMessage(parentMessage);
    const giphy = {
      thumb_url:
        'https://media4.giphy.com/media/Q9GYuPJTT8RomJTRot/giphy.gif?cid=c4b036752at3vu1m2vwt7nvnfumyer5620wbdhosrpmds52e&rid=giphy.gif&ct=g',
      title: 'dogs',
      title_link: 'https://giphy.com/gifs/Q9GYuPJTT8RomJTRot',
      type: 'giphy',
    };
    spyOn(channel, 'sendAction').and.resolveTo({
      message: {
        id: replies[replies.length - 1].id,
        attachments: [giphy],
        parent_id: parentMessage.id,
      },
    } as any as SendMessageAPIResponse<DefaultStreamChatGenerics>);
    let message!: StreamMessage;
    service.activeThreadMessages$.subscribe((m) => (message = m[m.length - 1]));
    await service.sendAction(replies[replies.length - 1].id, {
      image_action: 'send',
    });

    expect(message.attachments![0]).toBe(giphy);
  });

  it('should remove message after action, if no message is returned', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const parentMessage = mockMessage();
    parentMessage.id = 'parentId';
    const replies = [mockMessage(), mockMessage()];
    replies.forEach((r) => (r.parent_id = parentMessage.id));
    channel.state.threads[parentMessage.id] = replies;
    spyOn(channel, 'getReplies').and.resolveTo({
      messages: replies,
    } as any as GetRepliesAPIResponse<DefaultStreamChatGenerics>);
    await service.setAsActiveParentMessage(parentMessage);
    spyOn(channel, 'sendAction').and.resolveTo(
      {} as any as SendMessageAPIResponse<DefaultStreamChatGenerics>
    );
    spyOn(channel.state, 'removeMessage');
    await service.sendAction(
      replies[replies.length - 1].id,
      {
        image_action: 'send',
      },
      parentMessage.id
    );

    expect(channel.state.removeMessage).toHaveBeenCalledWith({
      id: replies[replies.length - 1].id,
      parent_id: parentMessage.id,
    });
  });

  it('should set message state after message is sent', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const parentMessage = mockMessage();
    parentMessage.id = 'parentId';
    const replies = [mockMessage(), mockMessage()];
    replies.forEach((r) => (r.parent_id = parentMessage.id));
    channel.state.threads[parentMessage.id] = replies;
    spyOn(channel, 'getReplies').and.resolveTo({
      messages: replies,
    } as any as GetRepliesAPIResponse<DefaultStreamChatGenerics>);
    await service.setAsActiveParentMessage(parentMessage);
    const text = 'Hi';
    spyOn(channel, 'sendMessage').and.resolveTo({
      message: {
        id: 'new message',
        parent_id: parentMessage.id,
        text,
      },
    } as SendMessageAPIResponse<DefaultStreamChatGenerics>);
    let latestMessage!: StreamMessage;
    service.activeThreadMessages$.subscribe(
      (m) => (latestMessage = m[m.length - 1])
    );
    await service.sendMessage(text, [], [], parentMessage.id);

    expect(latestMessage.status).toBe('received');
  });

  it('should set message state, if an error occured', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const parentMessage = mockMessage();
    parentMessage.id = 'parentId';
    const replies = [mockMessage(), mockMessage()];
    replies.forEach((r) => (r.parent_id = parentMessage.id));
    channel.state.threads[parentMessage.id] = replies;
    spyOn(channel, 'getReplies').and.resolveTo({
      messages: replies,
    } as any as GetRepliesAPIResponse<DefaultStreamChatGenerics>);
    await service.setAsActiveParentMessage(parentMessage);
    const text = 'Hi';
    spyOn(channel, 'sendMessage').and.rejectWith({ status: 500 });
    let latestMessage!: StreamMessage;
    service.activeThreadMessages$.subscribe(
      (m) => (latestMessage = m[m.length - 1])
    );
    await service.sendMessage(text, [], [], parentMessage.id);

    expect(latestMessage.status).toBe('failed');
    expect(latestMessage.errorStatusCode).toBe(500);
  });

  it('should add sent message to message list', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.pipe(first()).subscribe((c) => (channel = c!));
    const parentMessage = mockMessage();
    parentMessage.id = 'parentId';
    const replies = [mockMessage(), mockMessage()];
    replies.forEach((r) => (r.parent_id = parentMessage.id));
    channel.state.threads[parentMessage.id] = replies;
    spyOn(channel, 'getReplies').and.resolveTo({
      messages: replies,
    } as any as GetRepliesAPIResponse<DefaultStreamChatGenerics>);
    await service.setAsActiveParentMessage(parentMessage);
    const text = 'Hi';
    spyOn(channel, 'sendMessage').and.resolveTo({
      message: {
        id: 'new message',
        parent_id: parentMessage.id,
        text,
      },
    } as SendMessageAPIResponse<DefaultStreamChatGenerics>);
    let latestMessage!: StreamMessage;
    service.activeThreadMessages$.subscribe(
      (m) => (latestMessage = m[m.length - 1])
    );
    await service.sendMessage(text, [], [], parentMessage.id);

    expect(latestMessage.id).toBe('new message');
  });

  it('should notify channel if typing started', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (channel = c!));
    spyOn(channel, 'keystroke');
    await service.typingStarted('parentId');

    expect(channel.keystroke).toHaveBeenCalledWith('parentId');
  });

  it('should notify channel if typing stopped', async () => {
    await init();
    let channel!: Channel<DefaultStreamChatGenerics>;
    service.activeChannel$.subscribe((c) => (channel = c!));
    spyOn(channel, 'stopTyping');
    await service.typingStopped('parentId');

    expect(channel.stopTyping).toHaveBeenCalledWith('parentId');
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
    const parentMessage = mockMessage();
    parentMessage.id = 'parent_id';
    await service.setAsActiveParentMessage(parentMessage);
    usersTypingInThreadSpy.calls.reset();
    usersTypingInChannelSpy.calls.reset();
    channel.handleEvent('typing.start', {
      type: 'typing.start',
      user: { id: 'sara' },
      parent_id: 'parent_id',
    });

    expect(usersTypingInThreadSpy).toHaveBeenCalledWith([{ id: 'sara' }]);
    expect(usersTypingInChannelSpy).not.toHaveBeenCalled();

    usersTypingInThreadSpy.calls.reset();
    usersTypingInChannelSpy.calls.reset();
    channel.handleEvent('typing.start', {
      type: 'typing.start',
      user: { id: 'jack' },
      parent_id: 'parent_id',
    });

    expect(usersTypingInThreadSpy).toHaveBeenCalledWith([
      { id: 'sara' },
      { id: 'jack' },
    ]);

    expect(usersTypingInChannelSpy).not.toHaveBeenCalled();

    usersTypingInThreadSpy.calls.reset();
    usersTypingInChannelSpy.calls.reset();
    channel.handleEvent('typing.stop', {
      type: 'typing.stop',
      user: { id: 'sara' },
    });

    expect(usersTypingInThreadSpy).toHaveBeenCalledWith([{ id: 'jack' }]);
    expect(usersTypingInChannelSpy).not.toHaveBeenCalled();

    usersTypingInThreadSpy.calls.reset();
    usersTypingInChannelSpy.calls.reset();
    channel.handleEvent('typing.start', {
      type: 'typing.start',
      user: { id: 'sophie' },
      parent_id: 'different_thread',
    });

    expect(usersTypingInThreadSpy).not.toHaveBeenCalled();
    expect(usersTypingInChannelSpy).not.toHaveBeenCalled();
  });

  it('should load thread message into state', async () => {
    await init();
    const jumpToMessageIdSpy = jasmine.createSpy();
    service.jumpToMessage$.subscribe(jumpToMessageIdSpy);
    jumpToMessageIdSpy.calls.reset();
    const messagesSpy = jasmine.createSpy();
    service.activeChannelMessages$.subscribe(messagesSpy);
    messagesSpy.calls.reset();
    const activeParentMessageSpy = jasmine.createSpy();
    service.activeParentMessageId$.subscribe(activeParentMessageSpy);
    activeParentMessageSpy.calls.reset();
    const threadMessagesSpy = jasmine.createSpy();
    service.activeThreadMessages$.subscribe(threadMessagesSpy);
    threadMessagesSpy.calls.reset();
    const messageId = '1232121123';
    const parentMessageId = '2222';
    await service.jumpToMessage(messageId, parentMessageId);

    expect(jumpToMessageIdSpy).toHaveBeenCalledWith({
      id: messageId,
      parentId: parentMessageId,
    });

    expect(messagesSpy).toHaveBeenCalledWith(
      jasmine.arrayContaining([
        jasmine.objectContaining({ id: parentMessageId }),
      ])
    );

    expect(activeParentMessageSpy).toHaveBeenCalledWith(parentMessageId);

    expect(threadMessagesSpy).toHaveBeenCalledWith(
      jasmine.arrayContaining([jasmine.objectContaining({ id: messageId })])
    );
  });

  it('should delete message - local', async () => {
    await init();
    const message = mockMessage();
    message.parent_id = 'parent';
    const channel = service.activeChannel;
    spyOn(channel!.state, 'removeMessage');
    void service.deleteMessage(message, true);

    expect(mockChatClient.deleteMessage).not.toHaveBeenCalledWith();
    expect(channel!.state.removeMessage).toHaveBeenCalledWith({
      id: message.id,
      parent_id: message.parent_id,
    });
  });
});
