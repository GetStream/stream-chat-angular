import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { Poll, StreamAPIError } from 'stream-chat';
import { ChatClientService } from '../../../chat-client.service';
import { ChannelService } from '../../../channel.service';
import { NotificationService } from '../../../notification.service';
import { MockStateStore } from '../../../mocks';
import { PollAnswersListComponent } from './poll-answers-list.component';

describe('PollAnswersListComponent', () => {
  let component: PollAnswersListComponent;
  let fixture: ComponentFixture<PollAnswersListComponent>;
  let pollCache: Map<string, Poll>;
  let queryAnswers: jasmine.Spy;

  beforeEach(async () => {
    queryAnswers = jasmine
      .createSpy('queryAnswers')
      .and.resolveTo({ votes: [], next: undefined });
    pollCache = new Map([
      [
        'poll-1',
        {
          id: 'poll-1',
          state: new MockStateStore({ is_closed: false, ownAnswer: undefined }),
          queryAnswers,
        } as unknown as Poll,
      ],
    ]);
    await TestBed.configureTestingModule({
      declarations: [PollAnswersListComponent],
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
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PollAnswersListComponent);
    component = fixture.componentInstance;
    component.pollId = 'poll-1';
    component.ngOnChanges({
      pollId: new SimpleChange(undefined, 'poll-1', true),
    });
    fixture.detectChanges();
  });

  it('should display error notification if answers could not be loaded', async () => {
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    const message = 'QueryPollVotes failed with error: "error"';
    const error = new StreamAPIError(message, {
      code: 4,
      status: 400,
      response: {
        data: { code: 4, message, StatusCode: 400 },
        status: 400,
      } as unknown as StreamAPIError['response'],
    });
    queryAnswers.and.rejectWith(error);

    await expectAsync(component.queryAnswers()).toBeRejectedWith(error);

    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Error loading answers'
    );
    expect(component.isLoading).toBeFalse();
  });
});
