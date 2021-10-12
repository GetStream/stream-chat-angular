import { TestBed } from '@angular/core/testing';
import { Event, StreamChat } from 'stream-chat';
import { ChatClientService } from './chat-client.service';
import { mockStreamChatClient, MockStreamChatClient } from './mocks';

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
});
