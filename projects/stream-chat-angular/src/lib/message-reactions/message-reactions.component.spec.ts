import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { QueryReactionsAPIResponse, ReactionResponse } from 'stream-chat';
import { AvatarComponent } from '../avatar/avatar.component';

import { MessageReactionsComponent } from './message-reactions.component';
import { SimpleChange, ChangeDetectionStrategy } from '@angular/core';
import { AvatarPlaceholderComponent } from '../avatar-placeholder/avatar-placeholder.component';
import { MessageReactionsService } from '../message-reactions.service';
import { ModalComponent } from '../modal/modal.component';
import { BehaviorSubject } from 'rxjs';
import { UserListComponent } from '../user-list/user-list.component';
import { PaginatedListComponent } from '../paginated-list/paginated-list.component';
import { TranslateModule } from '@ngx-translate/core';
import { By } from '@angular/platform-browser';

describe('MessageReactionsComponent', () => {
  let component: MessageReactionsComponent;
  let fixture: ComponentFixture<MessageReactionsComponent>;
  let nativeElement: HTMLElement;
  let queryReactionList: () => HTMLElement | null;
  let queryEmojis: () => HTMLElement[];
  let queryReactionCountsFromReactionList: () => HTMLElement[];
  const reactionsServiceMock = {
    reactions$: new BehaviorSubject({}),
    reactions: {},
    queryReactions: (_: string, __: string, ___?: string) =>
      Promise.resolve({
        reactions: [],
        next: undefined,
      } as unknown as QueryReactionsAPIResponse),
  };

  beforeEach(async () => {
    reactionsServiceMock.reactions = {
      like: '👍',
      angry: '😠',
      love: '❤️',
      haha: '😂',
      wow: '😮',
      sad: '😞',
    };
    reactionsServiceMock.reactions$ = new BehaviorSubject(
      reactionsServiceMock.reactions,
    );
    await TestBed.configureTestingModule({
      declarations: [
        MessageReactionsComponent,
        AvatarComponent,
        AvatarPlaceholderComponent,
        ModalComponent,
        UserListComponent,
        PaginatedListComponent,
      ],
      providers: [
        { provide: MessageReactionsService, useValue: reactionsServiceMock },
      ],
      imports: [TranslateModule.forRoot()],
    })
      .overrideComponent(MessageReactionsComponent, {
        set: { changeDetection: ChangeDetectionStrategy.Default },
      })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MessageReactionsComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement as HTMLElement;
    component.ngOnChanges({ messageReactionsCounts: {} as SimpleChange });
    component.ngAfterViewInit();
    fixture.detectChanges();
    queryReactionList = () =>
      nativeElement.querySelector('[data-testid="reaction-list"]');
    queryEmojis = () =>
      Array.from(nativeElement.querySelectorAll('[data-testclass="emoji"]'));
    fixture.detectChanges();
    queryReactionCountsFromReactionList = () =>
      Array.from(
        nativeElement.querySelectorAll(
          '[data-testclass="reaction-list-reaction-count"]',
        ),
      );
  });

  it('should display message reactions - deprecated', () => {
    component.messageReactionCounts = {
      angry: 1,
      haha: 2,
      like: 1,
    };
    component.ngOnChanges({
      messageReactionCounts: {} as SimpleChange,
    });
    fixture.detectChanges();
    const reactionCounts = queryReactionCountsFromReactionList();

    expect(queryEmojis().length).toBe(3);
    expect(reactionCounts[0].textContent).toContain('1');
    expect(reactionCounts[1].textContent).toContain('2');
    expect(reactionCounts[2].textContent).toContain('1');
  });

  it(`shouldn't display bubble, if there are no reactions`, () => {
    expect(queryReactionList()).toBeNull();
  });

  it('should display reaction details - deprecated', fakeAsync(() => {
    component.messageReactionCounts = {
      wow: 3,
      sad: 2,
    };
    component.messageId = 'id';
    component.ngOnChanges({ messageReactionCounts: {} as SimpleChange });
    fixture.detectChanges();

    const reactions = [
      { type: 'wow', user: { id: 'saraid', name: 'Sara' } },
      { type: 'wow', user: { id: 'benid', name: 'Ben' } },
      { type: 'wow', user: { id: 'jackid' } },
      { type: 'wow' },
    ] as ReactionResponse[];
    const spy = spyOn(reactionsServiceMock, 'queryReactions').and.resolveTo({
      reactions,
      next: undefined,
    } as unknown as QueryReactionsAPIResponse);

    const wowEmoji = queryEmojis()[0];
    wowEmoji.click();

    expect(component.selectedReactionType).toBe('wow');

    fixture.detectChanges();

    const container = nativeElement.querySelector(
      '[data-testid="all-reacting-users"]',
    );

    expect(container).not.toBeNull();

    tick();
    fixture.detectChanges();

    let userListComponent = fixture.debugElement.query(
      By.css('[data-testid="wow-user-list"]'),
    ).componentInstance as UserListComponent;

    expect(userListComponent.users.length).toBe(3);

    spy.and.resolveTo({
      reactions: [
        { type: 'sad', user: { id: 'jim' } },
        { type: 'sad', user: { id: 'ben', name: 'Ben' } },
      ],
      next: undefined,
    } as unknown as QueryReactionsAPIResponse);
    nativeElement
      .querySelector<HTMLDivElement>(
        '[data-testid="reaction-details-selector-sad"]',
      )
      ?.click();
    tick();
    fixture.detectChanges();
    userListComponent = fixture.debugElement.query(
      By.css('[data-testid="sad-user-list"]'),
    ).componentInstance as UserListComponent;

    expect(userListComponent.users.length).toBe(2);
  }));

  it('should query reactions with proper parameters', async () => {
    component.messageId = 'my-message';
    const spy = spyOn(reactionsServiceMock, 'queryReactions').and.resolveTo({
      reactions: [],
      next: 'next-page',
    } as unknown as QueryReactionsAPIResponse);

    await component.reactionSelected('wow');

    expect(spy).toHaveBeenCalledWith('my-message', 'wow', undefined);

    spy.calls.reset();

    await component.loadNextPageOfReactions();

    expect(spy).toHaveBeenCalledWith('my-message', 'wow', 'next-page');
  });

  it('should bind pagination params to user list', fakeAsync(() => {
    component.messageId = 'messageId';
    component.messageReactionGroups = {
      wow: {
        count: 4,
        sum_scores: 4,
      },
    };
    component.ngOnChanges({ messageReactionGroups: {} as SimpleChange });
    fixture.detectChanges();

    const reactions = [
      { type: 'wow', user: { id: 'saraid', name: 'Sara' } },
      { type: 'wow', user: { id: 'benid', name: 'Ben' } },
      { type: 'wow', user: { id: 'jackid' } },
      { type: 'wow' },
    ] as ReactionResponse[];
    spyOn(reactionsServiceMock, 'queryReactions').and.resolveTo({
      reactions: reactions,
      next: 'next-page',
    } as unknown as QueryReactionsAPIResponse);

    void component.reactionSelected('wow');
    fixture.detectChanges();

    const userListComponent = fixture.debugElement.query(
      By.css('[data-testid="wow-user-list"]'),
    ).componentInstance as UserListComponent;

    expect(userListComponent.isLoading).toBeTrue();
    expect(userListComponent.hasMore).toBeFalse();
    expect(userListComponent.users).toEqual([]);

    tick();
    fixture.detectChanges();

    expect(userListComponent.isLoading).toBeFalse();
    expect(userListComponent.hasMore).toBeTrue();
    expect(userListComponent.users).toEqual([
      { id: 'saraid', name: 'Sara' },
      { id: 'benid', name: 'Ben' },
      { id: 'jackid' },
    ]);
  }));

  it(`should call custom reaction details handler if that's provided`, () => {
    const messageReactionsService = TestBed.inject(MessageReactionsService);
    const spy = jasmine.createSpy();
    messageReactionsService.customReactionClickHandler = spy;
    component.messageReactionCounts = {
      wow: 1500,
      sad: 2,
    };
    component.messageId = 'id';
    component.ngOnChanges({ messageReactionCounts: {} as SimpleChange });
    fixture.detectChanges();

    const wowEmoji = queryEmojis()[0];
    wowEmoji.click();

    expect(spy).toHaveBeenCalledWith({ messageId: 'id', reactionType: 'wow' });
    expect(component.selectedReactionType).toBeUndefined();

    messageReactionsService.customReactionClickHandler = undefined;
  });

  it('should handle if message reaction details not loaded', fakeAsync(() => {
    component.messageReactionCounts = {
      wow: 3,
      sad: 2,
    };
    component.messageId = 'id';
    component.ngOnChanges({
      messageId: {} as SimpleChange,
      messageReactionCounts: {} as SimpleChange,
    });
    fixture.detectChanges();

    spyOn(reactionsServiceMock, 'queryReactions').and.rejectWith(
      new Error('Failed to get reactions'),
    );

    const wowEmoji = queryEmojis()[0];
    wowEmoji.click();
    tick();

    expect(component.selectedReactionType).toBe(undefined);
  }));

  it('should mark reaction types of current user - list', () => {
    component.messageReactionCounts = {
      wow: 3,
      sad: 2,
    };
    component.ownReactions = [
      { type: 'wow', user: { id: 'jackid' } },
    ] as ReactionResponse[];
    component.ngOnChanges({ messageReactionCounts: {} as SimpleChange });
    fixture.detectChanges();

    const reactions = queryEmojis();

    expect(reactions[0].classList).toContain('str-chat__message-reaction-own');
    expect(reactions[1].classList).not.toContain(
      'str-chat__message-reaction-own',
    );
  });

  it('should filter not supported reactions', () => {
    reactionsServiceMock.reactions$.next({
      angry: '😠',
      haha: '😂',
    });
    component.messageReactionCounts = {
      angry: 1,
      haha: 2,
      like: 1,
    };
    component.ngOnChanges({
      messageReactionCounts: {} as SimpleChange,
    });
    fixture.detectChanges();
    const reactionCounts = queryReactionCountsFromReactionList();

    expect(queryEmojis().length).toBe(2);
    expect(reactionCounts[0].textContent).toContain('1');
    expect(reactionCounts[1].textContent).toContain('2');
  });

  it('should display and order message reactions', () => {
    component.messageReactionGroups = {
      love: {
        count: 12,
        sum_scores: 12,
        first_reaction_at: '2024-09-05T13:17:05.138248Z',
        last_reaction_at: '2024-09-05T13:17:11.454912Z',
      },
      sad: {
        count: 10,
        sum_scores: 10,
        first_reaction_at: '2024-09-05T13:17:05.673605Z',
        last_reaction_at: '2024-09-05T13:17:13.211086Z',
      },
      wow: {
        count: 20,
        sum_scores: 20,
        first_reaction_at: '2024-09-05T13:17:05.059252Z',
        last_reaction_at: '2024-09-05T13:17:13.066055Z',
      },
      haha: {
        count: 9,
        sum_scores: 9,
        first_reaction_at: '2024-09-05T13:17:05.522053Z',
        last_reaction_at: '2024-09-05T13:17:10.87445Z',
      },
      like: {
        count: 7,
        sum_scores: 7,
        first_reaction_at: '2024-09-05T13:17:04.977203Z',
        last_reaction_at: '2024-09-05T13:17:14.856949Z',
      },
    };
    component.ngOnChanges({
      messageReactionGroups: {} as SimpleChange,
    });
    fixture.detectChanges();
    const reactionCounts = queryReactionCountsFromReactionList();

    expect(component.existingReactions).toEqual([
      'like',
      'wow',
      'love',
      'haha',
      'sad',
    ]);

    expect(queryEmojis().length).toBe(5);
    expect(reactionCounts[0].textContent).toContain('7');
    expect(reactionCounts[1].textContent).toContain('20');
    expect(reactionCounts[2].textContent).toContain('12');
    expect(reactionCounts[3].textContent).toContain('9');
    expect(reactionCounts[4].textContent).toContain('10');

    component.messageReactionGroups = {
      ...component.messageReactionGroups,
      sad: {
        count: 10,
        sum_scores: 10,
        first_reaction_at: '2024-09-05T12:17:05.673605Z',
        last_reaction_at: '2024-09-05T13:17:13.211086Z',
      },
    };
    component.ngOnChanges({ messageReactionGroups: {} as SimpleChange });

    expect(component.existingReactions).toEqual([
      'sad',
      'like',
      'wow',
      'love',
      'haha',
    ]);
  });

  it('#messageReactionGroups should have a higher priority than #messageReactionCounts', () => {
    component.messageReactionGroups = {
      love: {
        count: 12,
        sum_scores: 12,
        first_reaction_at: '2024-09-05T13:17:05.138248Z',
        last_reaction_at: '2024-09-05T13:17:11.454912Z',
      },
      sad: {
        count: 10,
        sum_scores: 10,
        first_reaction_at: '2024-09-05T13:17:05.673605Z',
        last_reaction_at: '2024-09-05T13:17:13.211086Z',
      },
      wow: {
        count: 20,
        sum_scores: 20,
        first_reaction_at: '2024-09-05T13:17:05.059252Z',
        last_reaction_at: '2024-09-05T13:17:13.066055Z',
      },
      haha: {
        count: 9,
        sum_scores: 9,
        first_reaction_at: '2024-09-05T13:17:05.522053Z',
        last_reaction_at: '2024-09-05T13:17:10.87445Z',
      },
      like: {
        count: 7,
        sum_scores: 7,
        first_reaction_at: '2024-09-05T13:17:04.977203Z',
        last_reaction_at: '2024-09-05T13:17:14.856949Z',
      },
    };
    component.messageReactionCounts = {
      love: 13,
      haha: 9,
    };
    component.ngOnChanges({
      messageReactionGroups: {} as SimpleChange,
      messageReactionCounts: {} as SimpleChange,
    });

    expect(component.existingReactions).toEqual([
      'like',
      'wow',
      'love',
      'haha',
      'sad',
    ]);
  });
});
