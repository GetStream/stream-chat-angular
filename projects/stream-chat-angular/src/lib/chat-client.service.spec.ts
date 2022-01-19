import { TestBed } from '@angular/core/testing';
import { Event, OwnUserResponse, StreamChat } from 'stream-chat';
import { version } from '../assets/version';
import { ChatClientService } from './chat-client.service';
import { mockStreamChatClient, MockStreamChatClient } from './mocks';
import { NotificationService } from './notification.service';

describe('ChatClientService', () => {
  let service: ChatClientService;
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

  it('should connect user', () => {
    expect(StreamChat.getInstance).toHaveBeenCalledWith(apiKey);
    const spy = jasmine.createSpy();
    service.appSettings$.subscribe(spy);

    expect(spy).toHaveBeenCalledWith(undefined);
  });

  it('should disconnect user', async () => {
    await service.disconnectUser();

    expect(mockChatClient.disconnectUser).toHaveBeenCalledWith();
  });

  it('should init with user meta data', async () => {
    const user = { id: userId, name: 'Test user' } as OwnUserResponse;
    mockChatClient.connectUser.calls.reset();
    await service.init(apiKey, user, userToken);

    expect(mockChatClient.connectUser).toHaveBeenCalledWith(user, userToken);
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

  it('should set SDK information', () => {
    const userAgent = `stream-chat-angular-${version}-${mockChatClient.getUserAgent()}`;

    expect(mockChatClient.setUserAgent).toHaveBeenCalledWith(userAgent);
  });

  it('should watch for added to channel events', () => {
    const spy = jasmine.createSpy();
    service.notification$.subscribe(spy);
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
    service.notification$.subscribe(spy);
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
    service.notification$.subscribe(spy);
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

  it('should query members', async () => {
    mockChatClient.queryUsers.and.returnValue({ users: [{}, {}] });
    const result = await service.autocompleteUsers('zi');

    expect(mockChatClient.queryUsers).toHaveBeenCalledWith(
      jasmine.objectContaining({
        $or: [
          { id: { $autocomplete: 'zi' } },
          { name: { $autocomplete: 'zi' } },
        ],
      })
    );

    expect(result.length).toBe(2);
  });
});
