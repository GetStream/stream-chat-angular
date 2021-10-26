import { TestBed } from '@angular/core/testing';
import { Event, StreamChat } from 'stream-chat';
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
    expect(mockChatClient.connectUser).toHaveBeenCalledWith(
      { id: userId },
      userToken
    );
  });

  it('should watch for added to channel events', () => {
    const spy = jasmine.createSpy();
    service.notification$.subscribe(spy);
    const event = { id: 'mockevent' } as any as Event;
    mockChatClient.handleEvent('notification.added_to_channel', event);

    expect(spy).toHaveBeenCalledWith({
      eventType: 'notification.added_to_channel',
      event,
    });
  });

  it('should watch for new message events', () => {
    const spy = jasmine.createSpy();
    service.notification$.subscribe(spy);
    const event = { id: 'mockevent' } as any as Event;
    mockChatClient.handleEvent('notification.message_new', event);

    expect(spy).toHaveBeenCalledWith({
      eventType: 'notification.message_new',
      event,
    });
  });

  it('should watch for removed from channel events', () => {
    const spy = jasmine.createSpy();
    service.notification$.subscribe(spy);
    const event = { id: 'mockevent' } as any as Event;
    mockChatClient.handleEvent('notification.removed_from_channel', event);

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
      'Connection failure, reconnecting now...'
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
});
