import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Poll, StreamAPIError } from 'stream-chat';
import { ChatClientService } from '../../chat-client.service';
import { ChannelService } from '../../channel.service';
import { MessageActionsService } from '../../message-actions.service';
import { NotificationService } from '../../notification.service';
import { MockStateStore } from '../../mocks';
import { PollActionsComponent } from './poll-actions.component';

describe('PollActionsComponent', () => {
  let component: PollActionsComponent;
  let fixture: ComponentFixture<PollActionsComponent>;
  let pollCache: Map<string, Poll>;
  let close: jasmine.Spy;

  beforeEach(async () => {
    close = jasmine.createSpy('close');
    pollCache = new Map([
      [
        'poll-1',
        {
          id: 'poll-1',
          state: new MockStateStore({
            name: 'Favourite colour',
            options: [],
            is_closed: false,
            allow_user_suggested_options: false,
            allow_answers: false,
            answers_count: 0,
            created_by: { id: 'me' },
            ownAnswer: undefined,
            max_votes_allowed: undefined,
            ownVotesByOptionId: {},
          }),
          close,
        } as unknown as Poll,
      ],
    ]);
    await TestBed.configureTestingModule({
      declarations: [PollActionsComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        {
          provide: ChatClientService,
          useValue: {
            chatClient: {
              polls: { fromState: (id: string) => pollCache.get(id) },
              user: { id: 'me' },
            },
          },
        },
        {
          provide: ChannelService,
          useValue: { activeChannel$: new BehaviorSubject(undefined) },
        },
        {
          provide: MessageActionsService,
          useValue: { modalOpenedForMessage: new Subject() },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PollActionsComponent);
    component = fixture.componentInstance;
    component.pollId = 'poll-1';
    component.messageId = 'message-1';
    component.ngOnChanges({
      pollId: new SimpleChange(undefined, 'poll-1', true),
    });
    fixture.detectChanges();
  });

  it('should display error notification if poll could not be closed', async () => {
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    component.modalOpened('endVote');
    const message = 'UpdatePollPartial failed with error: "error"';
    const error = new StreamAPIError(message, {
      code: 4,
      status: 400,
      response: {
        data: { code: 4, message, StatusCode: 400 },
        status: 400,
      } as unknown as StreamAPIError['response'],
    });
    close.and.rejectWith(error);

    await expectAsync(component.closePoll()).toBeRejectedWith(error);

    expect(close).toHaveBeenCalledWith();
    expect(component.isModalOpen).toBeTrue();
    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Failed to end vote'
    );
  });
});
