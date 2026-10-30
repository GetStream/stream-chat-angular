import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { Poll } from 'stream-chat';
import { ChatClientService } from '../../chat-client.service';
import { ChannelService } from '../../channel.service';
import { MockStateStore } from '../../mocks';
import { PollHeaderComponent } from './poll-header.component';

describe('PollHeaderComponent', () => {
  let component: PollHeaderComponent;
  let fixture: ComponentFixture<PollHeaderComponent>;
  let pollCache: Map<string, Poll>;

  const createPoll = (name: string) =>
    ({
      state: new MockStateStore({
        name,
        is_closed: false,
        enforce_unique_vote: true,
        max_votes_allowed: undefined,
        options: [],
      }),
    } as unknown as Poll);

  const setPollId = (pollId: string | undefined) => {
    component.pollId = pollId;
    component.ngOnChanges({
      pollId: new SimpleChange(undefined, pollId, false),
    });
  };

  const queryTitle = () =>
    (fixture.nativeElement as HTMLElement).querySelector(
      '.str-chat__poll-title'
    )?.textContent;

  beforeEach(async () => {
    pollCache = new Map();
    await TestBed.configureTestingModule({
      declarations: [PollHeaderComponent],
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
    }).compileComponents();

    fixture = TestBed.createComponent(PollHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should display a cached poll', () => {
    pollCache.set('poll-1', createPoll('Favourite colour'));
    setPollId('poll-1');
    fixture.detectChanges();

    expect(queryTitle()).toBe('Favourite colour');
  });

  it('should display a poll that is cached after the component was created', fakeAsync(() => {
    // WebSocket messages are rendered before stream-chat caches their poll
    setPollId('poll-1');
    fixture.detectChanges();

    expect(queryTitle()).toBe('');

    pollCache.set('poll-1', createPoll('Favourite colour'));
    tick();
    fixture.detectChanges();

    expect(queryTitle()).toBe('Favourite colour');
  }));

  it('should not look up the poll again after the poll id was removed', fakeAsync(() => {
    const fromState = spyOn(
      TestBed.inject(ChatClientService).chatClient.polls,
      'fromState'
    ).and.callThrough();
    setPollId('poll-1');
    setPollId(undefined);
    fromState.calls.reset();
    tick();

    expect(fromState).not.toHaveBeenCalled();
  }));
});
