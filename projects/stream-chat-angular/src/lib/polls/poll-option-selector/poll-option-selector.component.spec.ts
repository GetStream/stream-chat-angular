import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import {
  Poll,
  PollOptionResponseData,
  PollVoteResponseData,
  StreamAPIError,
} from 'stream-chat';
import { ChatClientService } from '../../chat-client.service';
import { ChannelService } from '../../channel.service';
import { NotificationService } from '../../notification.service';
import { MockStateStore } from '../../mocks';
import { PollOptionSelectorComponent } from './poll-option-selector.component';

const apiError = (message: string, code = 4, status = 400) =>
  new StreamAPIError(message, {
    code,
    status,
    response: {
      data: { code, message, StatusCode: status },
      status,
    } as unknown as StreamAPIError['response'],
  });

describe('PollOptionSelectorComponent', () => {
  let component: PollOptionSelectorComponent;
  let fixture: ComponentFixture<PollOptionSelectorComponent>;
  let pollCache: Map<string, Poll>;
  let castVote: jasmine.Spy;
  let removeVote: jasmine.Spy;
  let addTemporaryNotification: jasmine.Spy;
  const option = { id: 'option-1', text: 'Red' } as PollOptionResponseData;
  const ownVote = {
    id: 'vote-1',
    option_id: 'option-1',
  } as PollVoteResponseData;

  const createPoll = (state: {
    max_votes_allowed?: number;
    ownVotesByOptionId?: Record<string, PollVoteResponseData>;
  }) =>
    ({
      id: 'poll-1',
      state: new MockStateStore({
        is_closed: false,
        latest_votes_by_option: {},
        maxVotedOptionIds: [],
        ownVotesByOptionId: state.ownVotesByOptionId ?? {},
        vote_counts_by_option: {},
        voting_visibility: 'public',
        max_votes_allowed: state.max_votes_allowed,
      }),
      castVote,
      removeVote,
    } as unknown as Poll);

  const init = (poll: Poll) => {
    pollCache.set('poll-1', poll);
    component.pollId = 'poll-1';
    component.messageId = 'message-1';
    component.option = option;
    component.ngOnChanges({
      pollId: new SimpleChange(undefined, 'poll-1', true),
      messageId: new SimpleChange(undefined, 'message-1', true),
      option: new SimpleChange(undefined, option, true),
    });
    fixture.detectChanges();
  };

  beforeEach(async () => {
    pollCache = new Map();
    castVote = jasmine.createSpy('castVote').and.resolveTo();
    removeVote = jasmine.createSpy('removeVote').and.resolveTo();
    await TestBed.configureTestingModule({
      declarations: [PollOptionSelectorComponent],
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
          useValue: {
            activeChannel$: new BehaviorSubject({
              data: { own_capabilities: ['cast-poll-vote'] },
            }),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    addTemporaryNotification = spyOn(
      TestBed.inject(NotificationService),
      'addTemporaryNotification'
    ).and.callThrough();
    fixture = TestBed.createComponent(PollOptionSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should display notification and not send request if max votes are reached', async () => {
    init(
      createPoll({
        max_votes_allowed: 1,
        ownVotesByOptionId: {
          'option-2': { id: 'vote-2', option_id: 'option-2' },
        } as unknown as Record<string, PollVoteResponseData>,
      })
    );

    await component.toggleVote();

    expect(castVote).not.toHaveBeenCalled();
    expect(removeVote).not.toHaveBeenCalled();
    expect(addTemporaryNotification).toHaveBeenCalledOnceWith(
      'streamChat.You have reached the maximum number of votes allowed'
    );
  });

  it('should display error notification if vote could not be cast', async () => {
    init(createPoll({}));
    const error = apiError('CastPollVote failed with error: "error"');
    castVote.and.rejectWith(error);

    await expectAsync(component.toggleVote()).toBeRejectedWith(error);

    expect(castVote).toHaveBeenCalledWith('option-1', 'message-1');
    expect(addTemporaryNotification).toHaveBeenCalledOnceWith(
      'streamChat.Failed to cast vote'
    );
  });

  it('should display error notification if vote could not be removed', async () => {
    init(createPoll({ ownVotesByOptionId: { 'option-1': ownVote } }));
    const error = apiError('DeletePollVote failed with error: "error"');
    removeVote.and.rejectWith(error);

    await expectAsync(component.toggleVote()).toBeRejectedWith(error);

    expect(removeVote).toHaveBeenCalledWith('vote-1', 'message-1');
    expect(addTemporaryNotification).toHaveBeenCalledOnceWith(
      'streamChat.Failed to cast vote'
    );
  });
});
