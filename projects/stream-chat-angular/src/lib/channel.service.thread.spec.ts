import { fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { first } from 'rxjs/operators';
import {
  Attachment,
  Channel,
  dateToNs,
  Event,
  LocalMessage,
  nowNs,
  UserResponse,
} from 'stream-chat';
import { ChannelService } from './channel.service';
import { ChatClientService, ClientEvent } from './chat-client.service';
import {
  generateMockChannels,
  generateMockLocalMessages,
  MockChannel,
  mockMessage,
  MockMessagePaginator,
  mockStreamChatClient,
  MockStreamChatClient,
  MockThread,
} from './mocks';
import { NotificationService } from './notification.service';
import { StreamMessage } from './types';
import { toLocalMessage } from './local-message';

const getPaginator = (channel: Channel | undefined) =>
  channel!.messagePaginator as unknown as MockMessagePaginator;

describe('ChannelService - threads', () => {
  let service: ChannelService;
  let client: MockStreamChatClient;
  let events$: Subject<ClientEvent>;
  let init: (c?: Channel[]) => Promise<void>;
  let notificationService: NotificationService;
  const filters = { type: 'messaging' };

  const getActiveChannel = () => service.activeChannel as MockChannel;

  const getThread = (parentId: string) => client.threads.get(parentId)!;

  const createThread = (parentId: string) => {
    const parentMessage = toLocalMessage(mockMessage());
    parentMessage.id = parentId;
    return client.threads.ensure({
      channel: getActiveChannel(),
      parentMessage,
    });
  };

  const getLatestValue = <T>(observable: {
    subscribe: (cb: (v: T) => void) => { unsubscribe: () => void };
  }) => {
    let value!: T;
    observable.subscribe((v) => (value = v)).unsubscribe();
    return value;
  };

  const getChannelMessages = () =>
    getLatestValue<StreamMessage[]>(service.activeChannelMessages$);

  beforeEach(() => {
    client = mockStreamChatClient();
    events$ = new Subject();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ChatClientService,
          useValue: {
            chatClient: client,
            events$,
            logger: jasmine.createSpyObj('logger', ['warn', 'error', 'info']),
          },
        },
        NotificationService,
      ],
    });
    service = TestBed.inject(ChannelService);
    notificationService = TestBed.inject(NotificationService);
    init = async (channels?: Channel[]) => {
      client.queryChannelsAndHydrate.and.returnValue(
        channels || generateMockChannels()
      );

      await service.init(filters);
    };
  });

  it('should reset active parent message and thread messages after channel changed', async () => {
    await init();
    const parentMessage = getChannelMessages()[0];
    await service.setAsActiveParentMessage(parentMessage);
    const thread = getThread(parentMessage.id);

    expect(thread.state.getLatestValue().active).toBeTrue();

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
    // thread is released
    expect(thread.state.getLatestValue().active).toBeFalse();
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
    const channel = getActiveChannel();
    const parentMessage = getLatestValue<StreamMessage[]>(
      service.activeChannelMessages$
    )[0];
    spyOn(client.threads, 'ensure').and.callThrough();
    await service.setAsActiveParentMessage(parentMessage);

    expect(client.threads.ensure).toHaveBeenCalledWith({
      channel,
      // the message object stored by stream-chat is used
      parentMessage: getPaginator(channel).getItem(parentMessage.id)!,
    });

    const thread = getThread(parentMessage.id);
    const replies = thread.messagePaginator.items!;

    expect(replies.length).toBeGreaterThan(0);
    expect(messagesSpy).toHaveBeenCalledWith(
      replies.map((r) => jasmine.objectContaining({ id: r.id }))
    );

    expect(activeParentMessageIdSpy).toHaveBeenCalledWith(parentMessage.id);
    expect(activeParentMessageSpy).toHaveBeenCalledWith(parentMessage);
    expect(thread.state.getLatestValue().active).toBeTrue();
  });

  it('should reuse existing thread instance', async () => {
    await init();
    const parentMessage = getChannelMessages()[0];
    const thread = createThread(parentMessage.id);
    spyOn(client.threads, 'ensure').and.callThrough();
    const replies = generateMockLocalMessages(100).map((m) => ({
      ...m,
      parent_id: parentMessage.id,
    }));
    thread.messagePaginator.setItems(replies);
    await service.setAsActiveParentMessage(parentMessage);

    expect(client.threads.ensure).not.toHaveBeenCalled();
    expect(
      getLatestValue<StreamMessage[]>(service.activeThreadMessages$).map(
        (m) => m.id
      )
    ).toEqual(replies.map((r) => r.id));

    expect(thread.state.getLatestValue().active).toBeTrue();
  });

  it('should reload stale thread before activating it', async () => {
    await init();
    const parentMessage = getChannelMessages()[0];
    const thread = createThread(parentMessage.id);
    thread.hasStaleState = true;
    let isActiveDuringReload: boolean | undefined;
    let isLoadingDuringReload: boolean | undefined;
    const reloadedReplies = generateMockLocalMessages(200).map((m) => ({
      ...m,
      parent_id: parentMessage.id,
    }));
    spyOn(thread, 'reload').and.callFake(() => {
      isActiveDuringReload = thread.state.getLatestValue().active;
      isLoadingDuringReload = getLatestValue<{ isLoading: boolean }>(
        service.activeThreadMessagesPaginationState$
      ).isLoading;
      thread.messagePaginator.setItems(reloadedReplies);
      return Promise.resolve();
    });
    spyOn(thread, 'activate').and.callThrough();
    await service.setAsActiveParentMessage(parentMessage);

    expect(thread.reload).toHaveBeenCalledWith();
    expect(isActiveDuringReload).toBeFalse();
    expect(isLoadingDuringReload).toBeTrue();
    expect(thread.activate).toHaveBeenCalledWith();
    expect(thread.state.getLatestValue().active).toBeTrue();
    expect(
      getLatestValue<StreamMessage[]>(service.activeThreadMessages$).map(
        (m) => m.id
      )
    ).toEqual(reloadedReplies.map((r) => r.id));
  });

  it(`shouldn't reload thread if state isn't stale`, async () => {
    await init();
    const parentMessage = getChannelMessages()[0];
    const thread = createThread(parentMessage.id);
    spyOn(thread, 'reload').and.callThrough();
    await service.setAsActiveParentMessage(parentMessage);

    expect(thread.reload).not.toHaveBeenCalled();
    expect(thread.state.getLatestValue().active).toBeTrue();
  });

  it('should display notification if stale thread reload fails', async () => {
    await init();
    const parentMessage = getChannelMessages()[0];
    const thread = createThread(parentMessage.id);
    thread.hasStaleState = true;
    const error = new Error('Network error');
    spyOn(thread, 'reload').and.rejectWith(error);
    spyOn(notificationService, 'addTemporaryNotification');
    await service.setAsActiveParentMessage(parentMessage);

    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Error loading messages'
    );

    const paginationState = getLatestValue<{
      isLoading: boolean;
      error?: Error;
    }>(service.activeThreadMessagesPaginationState$);

    expect(paginationState.isLoading).toBeFalse();
    expect(paginationState.error).toBe(error);
  });

  it('should remove active parent message and reset thread messages', async () => {
    await init();
    const parentMessage = getChannelMessages()[0];
    const message = mockMessage();
    message.parent_id = parentMessage.id;
    await service.setAsActiveParentMessage(parentMessage);
    const thread = getThread(parentMessage.id);
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

    expect(thread.state.getLatestValue().active).toBeFalse();

    // Thread paginator changes are no longer emitted
    messagesSpy.calls.reset();
    thread.messagePaginator.setItems([]);

    expect(messagesSpy).not.toHaveBeenCalled();
  });

  it(`should use the thread's parent message if parent message isn't in the loaded message list`, async () => {
    await init();
    const parentMessage = getChannelMessages()[0];
    const parentMessageSpy = jasmine.createSpy();
    service.activeParentMessage$.subscribe(parentMessageSpy);
    await service.setAsActiveParentMessage(parentMessage);
    spyOn(service, 'setAsActiveParentMessage').and.callThrough();
    getPaginator(getActiveChannel()).loadAround = () =>
      generateMockLocalMessages(100);
    await service.jumpToMessage('100');

    expect(
      getChannelMessages().find((m) => m.id === parentMessage.id)
    ).toBeUndefined();

    expect(service.setAsActiveParentMessage).not.toHaveBeenCalledWith(
      undefined
    );

    expect(parentMessageSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: parentMessage.id })
    );

    expect(
      getLatestValue<StreamMessage | undefined>(service.activeParentMessage$)
        ?.id
    ).toBe(parentMessage.id);
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

  it('should mark the reply list of a new thread (without replies) as complete', async () => {
    await init();
    const parentMessage = getChannelMessages()[0];
    const thread = client.threads.ensure({
      channel: service.activeChannel!,
      parentMessage: service.activeChannel!.messagePaginator.getItem(
        parentMessage.id
      )!,
    });
    // stream-chat doesn't load threads without replies, the paginator keeps its defaults
    thread.state.partialNext({ replyCount: 0, isStateStale: false });
    thread.messagePaginator.state.next({
      items: undefined,
      hasMoreHead: true,
      hasMoreTail: true,
      isLoading: false,
    });
    await service.setAsActiveParentMessage(parentMessage);

    expect(thread.messagePaginator.hasMoreHead).toBeFalse();
    expect(thread.messagePaginator.hasMoreTail).toBeFalse();
    // left unset, so stream-chat places the replies of a reload (e.g. after reconnect) as a first page
    expect(thread.messagePaginator.items).toBeUndefined();
    expect(getLatestValue(service.activeThreadMessages$)).toEqual([]);
    expect(
      getLatestValue(service.activeThreadMessagesPaginationState$)
    ).toEqual(
      jasmine.objectContaining({ hasMoreNewer: false, hasMoreOlder: false })
    );
  });

  it('should keep thread open after reconnect (stream-chat reloads active threads)', fakeAsync(async () => {
    await init();
    const parentMessage = getChannelMessages()[0];
    await service.setAsActiveParentMessage(parentMessage);
    const spy = jasmine.createSpy();
    service.activeParentMessage$.subscribe(spy);
    spy.calls.reset();
    events$.next({ eventType: 'connection.recovered' } as ClientEvent);
    tick();
    flush();

    expect(spy).not.toHaveBeenCalledWith(undefined);
    expect(getLatestValue(service.activeParentMessage$)?.id).toBe(
      parentMessage.id
    );
  }));

  it('should set empty readBy field for thread messages', async () => {
    await init();
    const message = mockMessage();
    await service.setAsActiveParentMessage(message);
    const threadMessages = getLatestValue<StreamMessage[]>(
      service.activeThreadMessages$
    );

    expect(threadMessages.length).toBeGreaterThan(0);
    threadMessages.forEach((m) => expect(m.readBy).toEqual([]));
  });

  it('should load more older messages', async () => {
    await init();
    const parentMessage = mockMessage();
    await service.setAsActiveParentMessage(parentMessage);
    const paginator = getThread(parentMessage.id).messagePaginator;
    const olderReplies = generateMockLocalMessages(100, true)
      .slice(0, 2)
      .map((m) => ({ ...m, parent_id: parentMessage.id }));
    paginator.loadPage = jasmine
      .createSpy()
      .and.callFake((direction: 'tail' | 'head') =>
        direction === 'tail' ? olderReplies : []
      );
    spyOn(paginator, 'toTail').and.callThrough();
    const prevCount = getLatestValue<StreamMessage[]>(
      service.activeThreadMessages$
    ).length;
    await service.loadMoreThreadReplies();
    const threadMessages = getLatestValue<StreamMessage[]>(
      service.activeThreadMessages$
    );

    expect(paginator.toTail).toHaveBeenCalledWith();
    expect(threadMessages.length).toBe(prevCount + 2);
    expect(threadMessages[0].id).toBe(olderReplies[0].id);
  });

  it(`shouldn't load older messages if there are no more older messages`, async () => {
    await init();
    const parentMessage = mockMessage();
    await service.setAsActiveParentMessage(parentMessage);
    const paginator = getThread(parentMessage.id).messagePaginator;
    paginator.state.partialNext({ hasMoreTail: false });
    spyOn(paginator, 'toTail').and.callThrough();

    expect(service.loadMoreThreadReplies('older')).toBeFalse();
    expect(paginator.toTail).not.toHaveBeenCalled();
  });

  it('should do nothing if we want to load newer messages, but newest replies are loaded', async () => {
    await init();
    const parentMessage = mockMessage();
    await service.setAsActiveParentMessage(parentMessage);
    const paginator = getThread(parentMessage.id).messagePaginator;
    spyOn(paginator, 'toHead').and.callThrough();

    expect(paginator.hasMoreHead).toBeFalse();
    expect(service.loadMoreThreadReplies('newer')).toBeFalse();
    expect(paginator.toHead).not.toHaveBeenCalled();
  });

  it('should load newer messages', async () => {
    await init();
    const parentMessage = mockMessage();
    await service.setAsActiveParentMessage(parentMessage);
    const paginator = getThread(parentMessage.id).messagePaginator;
    paginator.state.partialNext({ hasMoreHead: true });
    const newerReplies = generateMockLocalMessages(100)
      .slice(0, 3)
      .map((m) => ({ ...m, parent_id: parentMessage.id }));
    paginator.loadPage = (direction) =>
      direction === 'head' ? newerReplies : [];
    spyOn(paginator, 'toHead').and.callThrough();
    const prevCount = getLatestValue<StreamMessage[]>(
      service.activeThreadMessages$
    ).length;
    await service.loadMoreThreadReplies('newer');
    const threadMessages = getLatestValue<StreamMessage[]>(
      service.activeThreadMessages$
    );

    expect(paginator.toHead).toHaveBeenCalledWith();
    expect(threadMessages.length).toBe(prevCount + 3);
    expect(threadMessages[threadMessages.length - 1].id).toBe(
      newerReplies[2].id
    );
  });

  it('should rethrow pagination error when loading thread replies', async () => {
    await init();
    const parentMessage = mockMessage();
    await service.setAsActiveParentMessage(parentMessage);
    const paginator = getThread(parentMessage.id).messagePaginator;
    const error = new Error('Query failed');
    paginator.loadPage = () => {
      paginator.state.partialNext({ lastQueryError: error });
      return [];
    };

    await expectAsync(
      service.loadMoreThreadReplies() as Promise<void>
    ).toBeRejectedWith(error);
  });

  it(`shouldn't load thread replies if there is no active thread`, async () => {
    await init();

    expect(service.loadMoreThreadReplies()).toBeFalse();
  });

  it('should emit new thread messages and mark channel read on new message', async () => {
    await init();
    // wait for mark read throttle time
    await new Promise((resolve) => {
      setTimeout(resolve, service['markReadThrottleTime']);
    });
    const spy = jasmine.createSpy();
    const parentMessage = mockMessage();
    await service.setAsActiveParentMessage(parentMessage);
    service.activeThreadMessages$.subscribe(spy);
    const prevCount = (spy.calls.mostRecent().args[0] as StreamMessage[])
      .length;
    spy.calls.reset();
    const activeChannel = getActiveChannel();
    const newMessage = mockMessage();
    newMessage.id = 'new-reply';
    newMessage.parent_id = parentMessage.id;
    spyOn(activeChannel, 'markReadViaReporter');
    // stream-chat adds the message to the thread's paginator
    getThread(parentMessage.id).messagePaginator.ingestItem(
      toLocalMessage(newMessage)
    );
    activeChannel.handleEvent('message.new', {
      message: newMessage,
    });
    const newCount = (spy.calls.mostRecent().args[0] as StreamMessage[]).length;

    expect(newCount).toBe(prevCount + 1);
    expect(activeChannel.markReadViaReporter).toHaveBeenCalledWith();
  });

  it('should only emit thread messages from the active thread', async () => {
    await init();
    const spy = jasmine.createSpy();
    const parentMessage = mockMessage();
    await service.setAsActiveParentMessage(parentMessage);
    service.activeThreadMessages$.subscribe(spy);
    spy.calls.reset();
    const otherThread = createThread('not' + parentMessage.id);
    const newMessage = mockMessage();
    newMessage.id = 'new-reply';
    newMessage.parent_id = otherThread.id;
    otherThread.messagePaginator.ingestItem(toLocalMessage(newMessage));

    expect(spy).not.toHaveBeenCalled();
  });

  it('should emit updated thread messages', async () => {
    await init();
    const parentMessage = mockMessage();
    await service.setAsActiveParentMessage(parentMessage);
    const paginator = getThread(parentMessage.id).messagePaginator;
    const messageToUpdate = paginator.items![0];
    paginator.ingestItem({ ...messageToUpdate, text: 'updated' });
    const message = getLatestValue<StreamMessage[]>(
      service.activeThreadMessages$
    )[0];

    expect(message.id).toBe(messageToUpdate.id);
    expect(message.text).toBe('updated');
  });

  it('should emit deleted thread messages', async () => {
    await init();
    const parentMessage = mockMessage();
    await service.setAsActiveParentMessage(parentMessage);
    const paginator = getThread(parentMessage.id).messagePaginator;
    const messageToDelete = paginator.items![0];
    const deletedAt = dateToNs(new Date());
    paginator.ingestItem({
      ...messageToDelete,
      type: 'deleted',
      deleted_at: deletedAt,
    });
    const message = getLatestValue<StreamMessage[]>(
      service.activeThreadMessages$
    )[0];

    expect(message.deleted_at).toBe(deletedAt);
  });

  it('should handle if channel is truncated', async () => {
    await init();
    const channel = getActiveChannel();
    const parentMessage = getChannelMessages()[0];
    await service.setAsActiveParentMessage(parentMessage);
    const thread = getThread(parentMessage.id);
    const messagesSpy = jasmine.createSpy();
    service.activeThreadMessages$.subscribe(messagesSpy);
    const parentMessageSpy = jasmine.createSpy();
    service.activeParentMessageId$.subscribe(parentMessageSpy);
    messagesSpy.calls.reset();
    parentMessageSpy.calls.reset();
    channel.handleEvent('channel.truncated', {
      type: 'channel.truncated',
      cid: channel.cid,
      channel: {
        cid: channel.cid,
      },
    });

    expect(messagesSpy).toHaveBeenCalledWith([]);
    expect(parentMessageSpy).toHaveBeenCalledWith(undefined);
    expect(thread.state.getLatestValue().active).toBeFalse();
  });

  it('should call #customChannelTruncatedHandler, if channel is truncated and custom handler is provided', async () => {
    await init();
    let channel!: Channel;
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
      cid: channel.cid,
      channel: {
        cid: channel.cid,
        name: 'New name',
      },
    } as any as Event;
    const messagesSpy = jasmine.createSpy();
    service.activeThreadMessages$.subscribe(messagesSpy);
    const parentMessageSpy = jasmine.createSpy();
    service.activeParentMessageId$.subscribe(parentMessageSpy);
    messagesSpy.calls.reset();
    parentMessageSpy.calls.reset();
    (channel as MockChannel).handleEvent('channel.truncated', event);

    expect(spy).toHaveBeenCalledWith(
      jasmine.objectContaining({ type: 'channel.truncated', cid: channel.cid }),
      channel,
      jasmine.any(Function),
      jasmine.any(Function),
      jasmine.any(Function),
      jasmine.any(Function)
    );

    expect(messagesSpy).toHaveBeenCalledWith([]);
    expect(parentMessageSpy).toHaveBeenCalledWith(undefined);
  });

  it('should emit thread messages if reactions change', async () => {
    await init();
    const parentMessage = mockMessage();
    await service.setAsActiveParentMessage(parentMessage);
    const spy = jasmine.createSpy();
    service.activeThreadMessages$.subscribe(spy);
    spy.calls.reset();
    const paginator = getThread(parentMessage.id).messagePaginator;
    const message = paginator.items![1];
    // stream-chat updates the paginator on reaction.new/updated/deleted events
    paginator.ingestItem({
      ...message,
      reaction_groups: {
        like: {
          count: 1,
          sum_scores: 1,
        },
      },
    } as unknown as LocalMessage);

    expect(spy).toHaveBeenCalledWith(
      jasmine.arrayContaining([
        jasmine.objectContaining({
          id: message.id,
          reaction_groups: jasmine.objectContaining({
            like: jasmine.any(Object),
          }),
        }),
      ])
    );
  });

  it('should send message', async () => {
    await init();
    const channel = getActiveChannel();
    const parentMessage = mockMessage();
    parentMessage.id = 'parentId';
    await service.setAsActiveParentMessage(parentMessage);
    const paginator = getThread(parentMessage.id).messagePaginator;
    spyOn(channel, 'sendMessage').and.callThrough();
    spyOn(paginator, 'ingestItem').and.callThrough();
    const text = 'Hi';
    const attachments = [
      { fallback: 'image.png', image_url: 'http://url/to/image', custom: {} },
    ] as Attachment[];
    const mentionedUsers = [{ id: 'sara', name: 'Sara' }] as UserResponse[];
    const customData = {
      isVote: true,
      options: ['A', 'B', 'C'],
    };
    const prevMessageCount = getLatestValue<StreamMessage[]>(
      service.activeThreadMessages$
    ).length;
    await service.sendMessage(
      text,
      attachments,
      mentionedUsers,
      parentMessage.id,
      undefined,
      customData
    );
    const threadMessages = getLatestValue<StreamMessage[]>(
      service.activeThreadMessages$
    );
    const latestMessage = threadMessages[threadMessages.length - 1];

    expect(channel.sendMessage).toHaveBeenCalledWith({
      message: {
        text,
        attachments,
        mentioned_users: ['sara'],
        id: jasmine.any(String),
        parent_id: 'parentId',
        quoted_message_id: undefined,
        poll_id: undefined,
        custom: customData,
      },
    });

    // Optimistic update
    expect(paginator.ingestItem).toHaveBeenCalledWith(
      jasmine.objectContaining({
        text,
        user: client.user,
        attachments,
        parent_id: 'parentId',
        status: 'sending',
      })
    );

    expect(latestMessage.text).toBe(text);
    expect(latestMessage.parent_id).toBe('parentId');
    expect(threadMessages.length).toEqual(prevMessageCount + 1);
    // Channel message list isn't affected
    expect(
      getChannelMessages().find((m) => m.id === latestMessage.id)
    ).toBeUndefined();
  });

  it('should send action', async () => {
    await init();
    const channel = getActiveChannel();
    const parentMessage = mockMessage();
    parentMessage.id = 'parentId';
    await service.setAsActiveParentMessage(parentMessage);
    const replies = getThread(parentMessage.id).messagePaginator.items!;
    const giphy = {
      thumb_url:
        'https://media4.giphy.com/media/Q9GYuPJTT8RomJTRot/giphy.gif?cid=c4b036752at3vu1m2vwt7nvnfumyer5620wbdhosrpmds52e&rid=giphy.gif&ct=g',
      title: 'dogs',
      title_link: 'https://giphy.com/gifs/Q9GYuPJTT8RomJTRot',
      type: 'giphy',
      custom: {},
    };
    const replyId = replies[replies.length - 1].id;
    spyOn(channel, 'sendAction').and.resolveTo({
      message: {
        ...replies[replies.length - 1],
        created_at: nowNs(),
        updated_at: nowNs(),
        id: replyId,
        attachments: [giphy],
        parent_id: parentMessage.id,
      },
    } as never);
    await service.sendAction(
      replyId,
      {
        image_action: 'send',
      },
      parentMessage.id
    );
    const threadMessages = getLatestValue<StreamMessage[]>(
      service.activeThreadMessages$
    );
    const message = threadMessages.find((m) => m.id === replyId)!;

    expect(channel.sendAction).toHaveBeenCalledWith(replyId, {
      image_action: 'send',
    });

    expect(message.attachments[0]).toEqual(jasmine.objectContaining(giphy));
  });

  it('should remove message after action, if no message is returned', async () => {
    await init();
    const channel = getActiveChannel();
    const parentMessage = mockMessage();
    parentMessage.id = 'parentId';
    await service.setAsActiveParentMessage(parentMessage);
    const paginator = getThread(parentMessage.id).messagePaginator;
    const replies = paginator.items!;
    const replyId = replies[replies.length - 1].id;
    spyOn(channel, 'sendAction').and.resolveTo({} as never);
    spyOn(paginator, 'removeItem').and.callThrough();
    await service.sendAction(
      replyId,
      {
        image_action: 'send',
      },
      parentMessage.id
    );

    expect(paginator.removeItem).toHaveBeenCalledWith({
      id: replyId,
    });

    expect(
      getLatestValue<StreamMessage[]>(service.activeThreadMessages$).find(
        (m) => m.id === replyId
      )
    ).toBeUndefined();
  });

  it('should set message state after message is sent', async () => {
    await init();
    const channel = getActiveChannel();
    const parentMessage = mockMessage();
    parentMessage.id = 'parentId';
    await service.setAsActiveParentMessage(parentMessage);
    const text = 'Hi';
    spyOn(channel, 'sendMessage').and.callFake(((request: {
      message: { id: string };
    }) =>
      Promise.resolve({
        message: {
          ...mockMessage(),
          created_at: nowNs(),
          updated_at: nowNs(),
          id: request.message.id,
          parent_id: parentMessage.id,
          text,
        },
      })) as never);
    const latestMessage = await service.sendMessage(
      text,
      [],
      [],
      parentMessage.id
    );
    const threadMessages = getLatestValue<StreamMessage[]>(
      service.activeThreadMessages$
    );

    expect(latestMessage.status).toBe('received');
    expect(threadMessages[threadMessages.length - 1].status).toBe('received');
  });

  it('should set message state, if an error occured', async () => {
    await init();
    const channel = getActiveChannel();
    const parentMessage = mockMessage();
    parentMessage.id = 'parentId';
    await service.setAsActiveParentMessage(parentMessage);
    const text = 'Hi';
    spyOn(channel, 'sendMessage').and.rejectWith({ status: 500 });
    await service.sendMessage(text, [], [], parentMessage.id);
    const threadMessages = getLatestValue<StreamMessage[]>(
      service.activeThreadMessages$
    );
    const latestMessage = threadMessages[threadMessages.length - 1];

    expect(latestMessage.text).toBe(text);
    expect(latestMessage.status).toBe('failed');
    expect(latestMessage.errorStatusCode).toBe(500);
  });

  it('should add sent message to message list', async () => {
    await init();
    const channel = getActiveChannel();
    const parentMessage = mockMessage();
    parentMessage.id = 'parentId';
    await service.setAsActiveParentMessage(parentMessage);
    const text = 'Hi';
    spyOn(channel, 'sendMessage').and.callFake(((request: {
      message: { id: string };
    }) =>
      Promise.resolve({
        message: {
          ...mockMessage(),
          created_at: nowNs(),
          updated_at: nowNs(),
          id: request.message.id,
          parent_id: parentMessage.id,
          text,
        },
      })) as never);
    const prevCount = getLatestValue<StreamMessage[]>(
      service.activeThreadMessages$
    ).length;
    const sentMessage = await service.sendMessage(
      text,
      [],
      [],
      parentMessage.id
    );
    const threadMessages = getLatestValue<StreamMessage[]>(
      service.activeThreadMessages$
    );
    const latestMessage = threadMessages[threadMessages.length - 1];

    // preview is replaced, not duplicated
    expect(threadMessages.length).toBe(prevCount + 1);
    expect(latestMessage.id).toBe(sentMessage.id);
    expect(latestMessage.text).toBe(text);
    expect(latestMessage.created_at).toEqual(jasmine.any(Number));
  });

  it('should notify channel if typing started', async () => {
    await init();
    const channel = getActiveChannel();
    spyOn(channel, 'keystroke');
    await service.typingStarted('parentId');

    expect(channel.keystroke).toHaveBeenCalledWith('parentId');
  });

  it('should notify channel if typing stopped', async () => {
    await init();
    const channel = getActiveChannel();
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
    const channel = getActiveChannel();
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

  describe('jump to thread message', () => {
    const messageId = '1232121123';
    const parentMessageId = '2222';
    let thread: MockThread;
    let channelPaginator: MockMessagePaginator;

    beforeEach(async () => {
      await init();
      channelPaginator = getPaginator(getActiveChannel());
      // Parent message isn't part of the loaded message list
      thread = createThread(parentMessageId);
    });

    it('should jump to parent message in channel first, then to the thread reply', async () => {
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
      spyOn(channelPaginator, 'jumpToMessage').and.callThrough();
      spyOn(thread.messagePaginator, 'jumpToMessage').and.callThrough();
      spyOn(thread, 'activate').and.callThrough();
      await service.jumpToMessage(messageId, parentMessageId);

      expect(channelPaginator.jumpToMessage).toHaveBeenCalledWith(
        parentMessageId,
        jasmine.objectContaining({ suppressFocusSignal: true })
      );

      expect(thread.messagePaginator.jumpToMessage).toHaveBeenCalledWith(
        messageId,
        jasmine.objectContaining({ suppressFocusSignal: true })
      );

      expect(channelPaginator.jumpToMessage).toHaveBeenCalledBefore(
        thread.activate
      );

      expect(thread.activate).toHaveBeenCalledBefore(
        thread.messagePaginator.jumpToMessage
      );

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

    it(`shouldn't jump to parent message in channel, if it's already loaded`, async () => {
      const parentMessage = channelPaginator.items![3];
      const replyThread = createThread(parentMessage.id);
      spyOn(channelPaginator, 'jumpToMessage').and.callThrough();
      spyOn(replyThread.messagePaginator, 'jumpToMessage').and.callThrough();
      await service.jumpToMessage(messageId, parentMessage.id);

      expect(channelPaginator.jumpToMessage).not.toHaveBeenCalled();
      expect(replyThread.messagePaginator.jumpToMessage).toHaveBeenCalledWith(
        messageId,
        jasmine.any(Object)
      );

      expect(
        getLatestValue<string | undefined>(service.activeParentMessageId$)
      ).toBe(parentMessage.id);
    });

    it(`shouldn't reopen thread, if it's already active`, async () => {
      await service.jumpToMessage(messageId, parentMessageId);
      spyOn(service, 'setAsActiveParentMessage').and.callThrough();
      spyOn(thread.messagePaginator, 'jumpToMessage').and.callThrough();
      await service.jumpToMessage('other-reply', parentMessageId);

      expect(service.setAsActiveParentMessage).not.toHaveBeenCalled();
      expect(thread.messagePaginator.jumpToMessage).toHaveBeenCalledWith(
        'other-reply',
        jasmine.any(Object)
      );
    });

    it('should display notification if thread reply is not found', async () => {
      spyOn(notificationService, 'addTemporaryNotification');
      const jumpToMessageIdSpy = jasmine.createSpy();
      service.jumpToMessage$.subscribe(jumpToMessageIdSpy);
      jumpToMessageIdSpy.calls.reset();
      thread.messagePaginator.loadAround = () => undefined;

      await expectAsync(
        service.jumpToMessage(messageId, parentMessageId)
      ).toBeRejected();

      expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
        'streamChat.Message not found'
      );

      expect(jumpToMessageIdSpy).not.toHaveBeenCalled();
    });

    it('should jump to the latest thread reply', async () => {
      spyOn(
        thread.messagePaginator,
        'jumpToTheLatestMessage'
      ).and.callThrough();
      await service.jumpToMessage('latest', parentMessageId);

      expect(
        thread.messagePaginator.jumpToTheLatestMessage
      ).toHaveBeenCalledWith(
        jasmine.objectContaining({ suppressFocusSignal: true })
      );
    });
  });

  it('should delete message - local', async () => {
    await init();
    const parentMessage = mockMessage();
    parentMessage.id = 'parent';
    await service.setAsActiveParentMessage(parentMessage);
    const paginator = getThread('parent').messagePaginator;
    const message = toLocalMessage(mockMessage());
    message.id = 'local-message';
    message.parent_id = 'parent';
    paginator.ingestItem(message);
    spyOn(paginator, 'removeItem').and.callThrough();
    await service.deleteMessage(
      getLatestValue<StreamMessage[]>(service.activeThreadMessages$).find(
        (m) => m.id === message.id
      )!,
      true
    );

    expect(client.deleteMessage).not.toHaveBeenCalled();
    expect(paginator.removeItem).toHaveBeenCalledWith({
      id: message.id,
    });

    expect(
      getLatestValue<StreamMessage[]>(service.activeThreadMessages$).find(
        (m) => m.id === message.id
      )
    ).toBeUndefined();
  });
});
