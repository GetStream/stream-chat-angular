import { TestBed } from '@angular/core/testing';
import { Event, OwnUserResponse, StreamChat } from 'stream-chat';
import { version } from '../assets/version';
import { ChatClientService } from './chat-client.service';
import {
  mockCurrentUser,
  mockStreamChatClient,
  MockStreamChatClient,
} from './mocks';
import { NotificationService } from './notification.service';
import { DefaultStreamChatGenerics } from './types';

describe('ChatClientService', () => {
  let service: ChatClientService<DefaultStreamChatGenerics>;
  let mockChatClient: MockStreamChatClient;
  let apiKey: string;
  let userId: string;
  let userToken: string;

  beforeEach(async () => {
    apiKey = 'test-key';
    userId = 'userId';
    userToken = 'userToken';
    mockChatClient = mockStreamChatClient();
    spyOn(StreamChat, 'getInstance').and.returnValue(
      mockChatClient as any as StreamChat
    );
    service = TestBed.inject(ChatClientService);
    await service.init(apiKey, userId, userToken);
  });

  it('should connect user', async () => {
    mockChatClient.connectUser.calls.reset();
    await service.init(apiKey, userId, userToken);

    expect(StreamChat.getInstance).toHaveBeenCalledWith(apiKey, undefined);
    const spy = jasmine.createSpy();
    service.appSettings$.subscribe(spy);
    const userSpy = jasmine.createSpy();
    service.user$.subscribe(userSpy);

    expect(spy).toHaveBeenCalledWith(undefined);
    expect(userSpy).toHaveBeenCalledWith(mockCurrentUser());
    expect(mockChatClient.connectUser).toHaveBeenCalledWith(
      { id: userId },
      userToken
    );
  });

  it('should connect user - guest user', async () => {
    mockChatClient.connectUser.calls.reset();
    await service.init(apiKey, userId, 'guest');

    expect(StreamChat.getInstance).toHaveBeenCalledWith(apiKey, undefined);
    const spy = jasmine.createSpy();
    service.appSettings$.subscribe(spy);
    const userSpy = jasmine.createSpy();
    service.user$.subscribe(userSpy);

    expect(spy).toHaveBeenCalledWith(undefined);
    expect(userSpy).toHaveBeenCalledWith(mockCurrentUser());
    expect(mockChatClient.connectUser).not.toHaveBeenCalled();
    expect(mockChatClient.setGuestUser).toHaveBeenCalledWith({ id: userId });
  });

  it('should connect user - anonymous user', async () => {
    mockChatClient.connectUser.calls.reset();
    await service.init(apiKey, undefined, 'anonymous');

    expect(StreamChat.getInstance).toHaveBeenCalledWith(apiKey, undefined);
    const spy = jasmine.createSpy();
    service.appSettings$.subscribe(spy);

    expect(spy).toHaveBeenCalledWith(undefined);
    expect(mockChatClient.connectUser).not.toHaveBeenCalled();
    expect(mockChatClient.connectAnonymousUser).toHaveBeenCalledWith();
  });

  it(`should notify if connection wasn't successful`, async () => {
    const notificationService = TestBed.inject(NotificationService);
    const spy = jasmine.createSpy();
    notificationService.notifications$.subscribe(spy);
    spy.calls.reset();

    await service.init(apiKey, userId, userToken);

    expect(spy).not.toHaveBeenCalled();

    const error = new Error('error');
    mockChatClient.connectUser.and.rejectWith(error);

    await expectAsync(service.init(apiKey, userId, userToken)).toBeRejectedWith(
      error
    );

    expect(spy).toHaveBeenCalledWith(
      jasmine.arrayContaining([
        jasmine.objectContaining({
          type: 'error',
          text: 'streamChat.Error connecting to chat, refresh the page to try again.',
        }),
      ])
    );
  });

  it('should disconnect user', async () => {
    const pendingInvitesSpy = jasmine.createSpy();
    const eventsSpy = jasmine.createSpy();
    service.events$.subscribe(eventsSpy);
    service.pendingInvites$.subscribe(pendingInvitesSpy);
    pendingInvitesSpy.calls.reset();
    eventsSpy.calls.reset();
    const userSpy = jasmine.createSpy();
    service.user$.subscribe(userSpy);
    userSpy.calls.reset();
    await service.disconnectUser();
    const event = {
      id: 'mockevent',
      type: 'notification.added_to_channel',
    } as any as Event;
    mockChatClient.handleEvent(event.type, event);

    expect(mockChatClient.disconnectUser).toHaveBeenCalledWith();
    expect(pendingInvitesSpy).toHaveBeenCalledWith([]);
    expect(eventsSpy).not.toHaveBeenCalled();
    expect(userSpy).toHaveBeenCalledWith(undefined);
  });

  it('should init with user meta data', async () => {
    const user = {
      id: userId,
      name: 'Test user',
    } as OwnUserResponse<DefaultStreamChatGenerics>;
    mockChatClient.connectUser.calls.reset();
    await service.init(apiKey, user, userToken);

    expect(mockChatClient.connectUser).toHaveBeenCalledWith(user, userToken);
  });

  it('should init with options', async () => {
    const user = {
      id: userId,
      name: 'Test user',
    } as OwnUserResponse<DefaultStreamChatGenerics>;
    const options = { timeout: 5000 };
    await service.init(apiKey, user, userToken, options);

    // @ts-expect-error don't know what's wrong here
    expect(StreamChat.getInstance).toHaveBeenCalledWith(apiKey, options);
  });

  it('should init with token provider', async () => {
    const tokenProvider = () => Promise.resolve('test');
    mockChatClient.connectUser.calls.reset();
    await service.init(apiKey, userId, tokenProvider);

    expect(mockChatClient.connectUser).toHaveBeenCalledWith(
      { id: userId },
      tokenProvider
    );
  });

  it('should emit app settings, if app settings not yet loaded', async () => {
    const spy = jasmine.createSpy();
    service.appSettings$.subscribe(spy);
    await service.getAppSettings();

    expect(spy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        file_upload_config: jasmine.any(Object),
        image_upload_config: jasmine.any(Object),
      })
    );

    mockChatClient.getAppSettings.calls.reset();
    await service.getAppSettings();

    expect(mockChatClient.getAppSettings).not.toHaveBeenCalled();
  });

  it('should make sure we call app settings only once', () => {
    const spy = mockChatClient.getAppSettings;
    void service.getAppSettings();
    void service.getAppSettings();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should make sure we call app settings only once unless first call returned an error', async () => {
    const spy = mockChatClient.getAppSettings;

    try {
      spy.and.rejectWith();
      await service.getAppSettings();
    } catch (error) {
      spy.and.resolveTo({});
      await service.getAppSettings();
    }

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should make sure we call app settings only once unless we change API key', async () => {
    const spy = mockChatClient.getAppSettings;
    service.chatClient.key = apiKey;
    await service.getAppSettings();
    await service.init(apiKey, '', '');
    await service.getAppSettings();

    expect(spy).toHaveBeenCalledTimes(1);

    spy.calls.reset();
    service.chatClient.key = apiKey;
    await service.init('different-api-key', '', '');
    await service.getAppSettings();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should set SDK information', () => {
    const userAgent = `stream-chat-angular-${version}-${
      mockChatClient.getUserAgent() as string
    }`;

    expect(mockChatClient.setUserAgent).toHaveBeenCalledWith(userAgent);
  });

  it('should set SDK information only once', async () => {
    mockChatClient.getUserAgent.and.returnValue(
      'stream-chat-angular-stream-chat-javascript-client-browser-2.2.2'
    );
    mockChatClient.setUserAgent.calls.reset();
    await service.init(apiKey, userId, userToken);

    expect(mockChatClient.setUserAgent).not.toHaveBeenCalled();
  });

  it('should watch for added to channel events', () => {
    const spy = jasmine.createSpy();
    service.events$.subscribe(spy);
    const event = {
      id: 'mockevent',
      type: 'notification.added_to_channel',
    } as any as Event;
    mockChatClient.handleEvent(event.type, event);

    expect(spy).toHaveBeenCalledWith({
      eventType: 'notification.added_to_channel',
      event,
    });
  });

  it('should watch for new message events', () => {
    const spy = jasmine.createSpy();
    service.events$.subscribe(spy);
    const event = {
      id: 'mockevent',
      type: 'notification.message_new',
    } as any as Event;
    mockChatClient.handleEvent(event.type, event);

    expect(spy).toHaveBeenCalledWith({
      eventType: 'notification.message_new',
      event,
    });
  });

  it('should watch for removed from channel events', () => {
    const spy = jasmine.createSpy();
    service.events$.subscribe(spy);
    const event = {
      id: 'mockevent',
      type: 'notification.removed_from_channel',
    } as any as Event;
    mockChatClient.handleEvent(event.type, event);

    expect(spy).toHaveBeenCalledWith({
      eventType: 'notification.removed_from_channel',
      event,
    });
  });

  it('should notify if the user goes offline', () => {
    const spy = jasmine.createSpy();
    service.connectionState$.subscribe(spy);
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addPermanentNotification');
    const event = { id: 'mockevent', online: false } as any as Event;
    mockChatClient.handleEvent('connection.changed', event);

    expect(spy).toHaveBeenCalledWith('offline');
    expect(notificationService.addPermanentNotification).toHaveBeenCalledWith(
      'streamChat.Connection failure, reconnecting now...'
    );
  });

  it('should notify if the user goes online', () => {
    const removeNotificationSpy = jasmine.createSpy();
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addPermanentNotification').and.returnValue(
      removeNotificationSpy
    );
    mockChatClient.handleEvent('connection.changed', {
      id: 'event',
      online: false,
    } as any as Event);
    const stateSpy = jasmine.createSpy();
    service.connectionState$.subscribe(stateSpy);
    const event = { id: 'mockevent', online: true } as any as Event;
    mockChatClient.handleEvent('connection.changed', event);

    expect(removeNotificationSpy).toHaveBeenCalledWith();
    expect(stateSpy).toHaveBeenCalledWith('online');
  });

  it('should flag message', async () => {
    await service.flagMessage('messageId');

    expect(mockChatClient.flagMessage).toHaveBeenCalledWith('messageId');
  });

  it('should query users', async () => {
    mockChatClient.queryUsers.and.returnValue({
      users: [
        {
          id: mockCurrentUser().id,
        },
        { id: 'zizi' },
      ],
    });
    const result = await service.autocompleteUsers('zi');

    expect(mockChatClient.queryUsers).toHaveBeenCalledWith(
      jasmine.objectContaining({
        $or: [
          { id: { $autocomplete: 'zi' } },
          { name: { $autocomplete: 'zi' } },
        ],
      })
    );

    expect(result.length).toBe(1);
  });

  it('should initialize pending invites', async () => {
    const channelsWithPendingInvites = [{ cid: 'cat-lovers' }];
    mockChatClient.queryChannels.and.resolveTo(channelsWithPendingInvites);
    const invitesSpy = jasmine.createSpy();
    service.pendingInvites$.subscribe(invitesSpy);
    invitesSpy.calls.reset();
    await service.init(apiKey, userId, userToken, {
      trackPendingChannelInvites: true,
    });

    expect(mockChatClient.queryChannels).toHaveBeenCalledWith({
      invite: 'pending',
      members: { $in: [mockChatClient.user.id] },
    });

    expect(invitesSpy).toHaveBeenCalledWith(channelsWithPendingInvites);
  });

  it('should emit pending invitations of user', async () => {
    await service.init(apiKey, userId, userToken, {
      trackPendingChannelInvites: true,
    });
    const invitesSpy = jasmine.createSpy();
    service.pendingInvites$.subscribe(invitesSpy);
    const event1 = {
      id: 'mockevent',
      type: 'notification.invited',
      channel: {
        cid: 'messaging:what-i-ate-for-lunch',
        type: 'messaging',
        id: 'what-i-ate-for-lunch',
      },
      member: { user: mockChatClient.user },
    } as any as Event;
    mockChatClient.handleEvent(event1.type, event1);

    expect(invitesSpy).toHaveBeenCalledWith([
      jasmine.objectContaining({
        type: 'messaging',
        id: 'what-i-ate-for-lunch',
      }),
    ]);

    invitesSpy.calls.reset();
    const event2 = {
      id: 'mockevent',
      type: 'notification.invited',
      channel: {
        cid: 'messaging:gardening',
        type: 'messaging',
        id: 'gardening',
      },
      member: { user: mockChatClient.user },
    } as any as Event;
    mockChatClient.handleEvent(event2.type, event2);

    expect(invitesSpy).toHaveBeenCalledWith([
      jasmine.objectContaining({
        type: 'messaging',
        id: 'what-i-ate-for-lunch',
      }),
      jasmine.objectContaining({
        type: 'messaging',
        id: 'gardening',
      }),
    ]);

    invitesSpy.calls.reset();
    const event3 = {
      id: 'mockevent',
      type: 'notification.invite_accepted',
      channel: {
        cid: 'messaging:what-i-ate-for-lunch',
        type: 'messaging',
        id: 'what-i-ate-for-lunch',
      },
      member: { user: mockChatClient.user },
    } as any as Event;
    mockChatClient.handleEvent(event3.type, event3);

    expect(invitesSpy).toHaveBeenCalledWith([
      jasmine.objectContaining({
        type: 'messaging',
        id: 'gardening',
      }),
    ]);

    invitesSpy.calls.reset();
    const event4 = {
      id: 'mockevent',
      type: 'notification.invite_rejected',
      channel: {
        cid: 'messaging:gardening',
        type: 'messaging',
        id: 'gardening',
      },
      member: { user: mockChatClient.user },
    } as any as Event;
    mockChatClient.handleEvent(event4.type, event4);

    expect(invitesSpy).toHaveBeenCalledWith([]);

    invitesSpy.calls.reset();
    const event5 = {
      id: 'mockevent',
      type: 'notification.invite_rejected',
      channel: {
        cid: 'messaging:gardening',
        type: 'messaging',
        id: 'gardening',
      },
      member: {
        user: { id: `not${mockChatClient.user.id}` },
      },
    } as any as Event;
    mockChatClient.handleEvent(event5.type, event5);

    expect(invitesSpy).not.toHaveBeenCalled();
  });

  it('should update total unread count', () => {
    const spy = jasmine.createSpy();
    service.user$.subscribe(spy);

    expect(spy).toHaveBeenCalledWith(
      jasmine.objectContaining({ total_unread_count: 0 })
    );

    spy.calls.reset();

    const event1 = {
      id: 'mockevent',
      type: 'notification.invite_accepted',
      channel: { cid: 'what-i-ate-for-lunch' },
      member: { user: mockChatClient.user },
    } as any as Event;
    mockChatClient.handleEvent(event1.type, event1);

    expect(spy).not.toHaveBeenCalledWith();

    const event2 = {
      id: 'mockevent',
      type: 'message.new',
      channel: { cid: 'what-i-ate-for-lunch' },
      member: { user: mockChatClient.user },
      total_unread_count: 2,
    } as any as Event;
    mockChatClient.handleEvent(event2.type, event2);

    expect(spy).toHaveBeenCalledWith(
      jasmine.objectContaining({ total_unread_count: 2 })
    );
  });

  it('should update user object on `user.updated` event', () => {
    const spy = jasmine.createSpy();
    service.user$.subscribe(spy);

    const updatedName = mockCurrentUser().name! + ' updated';
    const event = {
      id: 'mockevent',
      type: 'user.updated',
      user: {
        id: mockChatClient.user.id,
        name: updatedName,
      },
    } as any as Event;
    mockChatClient.user.name = updatedName;
    mockChatClient.handleEvent(event.type, event);

    expect(spy).toHaveBeenCalledWith(
      jasmine.objectContaining({ name: updatedName })
    );
  });
});
