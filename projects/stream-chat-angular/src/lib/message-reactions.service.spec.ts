import { TestBed } from '@angular/core/testing';
import { StreamAPIError } from 'stream-chat';

import { MessageReactionsService } from './message-reactions.service';
import { ChatClientService } from './chat-client.service';
import { NotificationService } from './notification.service';

describe('MessageReactionsService', () => {
  let service: MessageReactionsService;
  let queryReactionsSpy: jasmine.Spy;

  beforeEach(() => {
    queryReactionsSpy = jasmine.createSpy('queryReactions');
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ChatClientService,
          useValue: { chatClient: { queryReactions: queryReactionsSpy } },
        },
      ],
    });
    service = TestBed.inject(MessageReactionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should display error notification if reactions could not be loaded', async () => {
    const message = 'QueryReactions failed with error: "error"';
    const error = new StreamAPIError(message, {
      code: 4,
      status: 400,
      response: {
        data: { code: 4, message, StatusCode: 400 },
        status: 400,
      } as unknown as StreamAPIError['response'],
    });
    queryReactionsSpy.and.rejectWith(error);
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');

    await expectAsync(
      service.queryReactions('message-id', 'like')
    ).toBeRejectedWith(error);

    expect(queryReactionsSpy).toHaveBeenCalledWith(
      { id: 'message-id' },
      jasmine.objectContaining({ filter: { type: { $eq: 'like' } } })
    );
    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Error loading reactions'
    );
  });
});
