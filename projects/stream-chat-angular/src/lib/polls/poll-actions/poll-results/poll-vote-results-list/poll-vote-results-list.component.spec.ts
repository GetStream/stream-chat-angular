import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { Poll, PollOptionResponseData, StreamAPIError } from 'stream-chat';
import { ChatClientService } from '../../../../chat-client.service';
import { ChannelService } from '../../../../channel.service';
import { NotificationService } from '../../../../notification.service';
import { MockStateStore } from '../../../../mocks';
import { PollVoteResultsListComponent } from './poll-vote-results-list.component';

describe('PollVoteResultsListComponent', () => {
  let component: PollVoteResultsListComponent;
  let fixture: ComponentFixture<PollVoteResultsListComponent>;
  let pollCache: Map<string, Poll>;
  let queryOptionVotes: jasmine.Spy;
  const option = { id: 'option-1', text: 'Red' } as PollOptionResponseData;

  beforeEach(async () => {
    queryOptionVotes = jasmine
      .createSpy('queryOptionVotes')
      .and.resolveTo({ votes: [], next: undefined });
    pollCache = new Map([
      [
        'poll-1',
        {
          id: 'poll-1',
          state: new MockStateStore({
            vote_counts_by_option: {},
            maxVotedOptionIds: [],
          }),
          queryOptionVotes,
        } as unknown as Poll,
      ],
    ]);
    await TestBed.configureTestingModule({
      declarations: [PollVoteResultsListComponent],
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

    fixture = TestBed.createComponent(PollVoteResultsListComponent);
    component = fixture.componentInstance;
    component.pollId = 'poll-1';
    component.option = option;
    component.ngOnChanges({
      pollId: new SimpleChange(undefined, 'poll-1', true),
      option: new SimpleChange(undefined, option, true),
    });
    fixture.detectChanges();
  });

  it('should display error notification if votes could not be loaded', async () => {
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
    queryOptionVotes.and.rejectWith(error);

    await expectAsync(component.loadVotes()).toBeRejectedWith(error);

    expect(queryOptionVotes).toHaveBeenCalledWith(
      jasmine.objectContaining({ filter: { option_id: 'option-1' } })
    );
    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Error loading votes'
    );
    expect(component.isLoading).toBeFalse();
  });
});
