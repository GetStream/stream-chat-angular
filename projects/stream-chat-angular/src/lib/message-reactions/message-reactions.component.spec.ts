import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { ReactionResponse } from 'stream-chat';
import { AvatarComponent } from '../avatar/avatar.component';

import { MessageReactionsComponent } from './message-reactions.component';
import { ChannelService } from '../channel.service';
import { SimpleChange } from '@angular/core';
import { AvatarPlaceholderComponent } from '../avatar-placeholder/avatar-placeholder.component';
import { MessageReactionsService } from '../message-reactions.service';
import { ModalComponent } from '../modal/modal.component';
import { BehaviorSubject } from 'rxjs';

describe('MessageReactionsComponent', () => {
  let component: MessageReactionsComponent;
  let fixture: ComponentFixture<MessageReactionsComponent>;
  let nativeElement: HTMLElement;
  let queryReactionList: () => HTMLElement | null;
  let queryEmojis: () => HTMLElement[];
  let queryReactionsCount: () => HTMLElement | null;
  let queryReactionCountsFromReactionList: () => HTMLElement[];
  const channelServiceMock = {
    getMessageReactions: () => Promise.resolve([] as ReactionResponse[]),
  };
  const reactionsServiceMock = {
    reactions$: new BehaviorSubject({}),
    reactions: {},
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
      reactionsServiceMock.reactions
    );
    await TestBed.configureTestingModule({
      declarations: [
        MessageReactionsComponent,
        AvatarComponent,
        AvatarPlaceholderComponent,
        ModalComponent,
      ],
      providers: [
        { provide: ChannelService, useValue: channelServiceMock },
        { provide: MessageReactionsService, useValue: reactionsServiceMock },
      ],
    }).compileComponents();
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
    queryReactionsCount = () =>
      nativeElement.querySelector('[data-testid="reactions-count"]');
    fixture.detectChanges();
    queryReactionCountsFromReactionList = () =>
      Array.from(
        nativeElement.querySelectorAll(
          '[data-testclass="reaction-list-reaction-count"]'
        )
      );
  });

  it('should display message reactions', () => {
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

  it('should display total count', () => {
    component.messageReactionCounts = {
      haha: 1,
      love: 2,
      wow: 1,
      sad: 3,
    };
    component.ngOnChanges({
      messageReactionCounts: {} as SimpleChange,
    });
    fixture.detectChanges();

    expect(queryReactionsCount()?.textContent?.replace(/ /g, '')).toBe('7');
  });

  it(`shouldn't display bubble, if there are no reactions`, () => {
    expect(queryReactionList()).toBeNull();
  });

  it('should display reaction details', fakeAsync(() => {
    component.messageReactionCounts = {
      wow: 3,
      sad: 2,
    };
    component.messageId = 'id';
    component.latestReactions = [];
    component.ngOnChanges({ messageReactionCounts: {} as SimpleChange });
    fixture.detectChanges();

    const reactions = [
      { type: 'wow', user: { id: 'saraid', name: 'Sara' } },
      { type: 'wow', user: { id: 'benid', name: 'Ben' } },
      { type: 'wow', user: { id: 'jackid' } },
      { type: 'wow' },
      { type: 'sad', user: { id: 'jim' } },
      { type: 'sad', user: { id: 'ben', name: 'Ben' } },
    ] as ReactionResponse[];
    spyOn(channelServiceMock, 'getMessageReactions').and.resolveTo(reactions);

    const wowEmoji = queryEmojis()[0];
    wowEmoji.click();

    expect(component.selectedReactionType).toBe('wow');

    fixture.detectChanges();

    const container = nativeElement.querySelector(
      '[data-testid="all-reacting-users"]'
    );

    expect(container).not.toBeNull();

    tick();
    fixture.detectChanges();

    let users = nativeElement.querySelectorAll(
      '[data-testclass="reaction-user-username"]'
    );

    expect(users.length).toBe(3);
    expect(users[0].textContent).toBe('Ben');
    expect(users[1].textContent).toBe('Sara');
    expect(users[2].textContent).toBe('');

    nativeElement
      .querySelector<HTMLDivElement>(
        '[data-testid="reaction-details-selector-sad"]'
      )
      ?.click();
    fixture.detectChanges();
    users = nativeElement.querySelectorAll(
      '[data-testclass="reaction-user-username"]'
    );

    expect(users.length).toBe(2);
  }));

  it(`shouldn't display reaction details if there are more than 1200 reactions`, () => {
    component.messageReactionCounts = {
      wow: 3,
      sad: 1198,
    };
    component.messageId = 'id';
    component.latestReactions = [];
    component.ngOnChanges({ messageReactionCounts: {} as SimpleChange });
    fixture.detectChanges();

    const reactions = [
      { type: 'wow', user: { id: 'saraid', name: 'Sara' } },
      { type: 'wow', user: { id: 'benid', name: 'Ben' } },
      { type: 'wow', user: { id: 'jackid' } },
      { type: 'wow' },
      { type: 'sad', user: { id: 'jim' } },
      { type: 'sad', user: { id: 'ben', name: 'Ben' } },
    ] as ReactionResponse[];
    spyOn(channelServiceMock, 'getMessageReactions').and.resolveTo(reactions);

    const wowEmoji = queryEmojis()[0];
    wowEmoji.click();

    expect(component.selectedReactionType).toBe(undefined);
  });

  it(`should call custom reaction details handler if that's provided`, () => {
    const messageReactionsService = TestBed.inject(MessageReactionsService);
    const spy = jasmine.createSpy();
    messageReactionsService.customReactionClickHandler = spy;
    component.messageReactionCounts = {
      wow: 1500,
      sad: 2,
    };
    component.messageId = 'id';
    component.latestReactions = [];
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
    component.latestReactions = [];
    component.ngOnChanges({
      messageId: {} as SimpleChange,
      messageReactionCounts: {} as SimpleChange,
      latestReactions: {} as SimpleChange,
    });
    fixture.detectChanges();

    spyOn(channelServiceMock, 'getMessageReactions').and.rejectWith(
      new Error('Failed to get reactions')
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
    component.latestReactions = [
      { type: 'wow', user: { id: 'saraid', name: 'Sara' } },
      { type: 'wow', user: { id: 'jackid' } },
      { type: 'wow' },
      { type: 'sad', user: { id: 'jim' } },
      { type: 'sad', user: { id: 'ben', name: 'Ben' } },
    ] as ReactionResponse[];
    component.ownReactions = [
      { type: 'wow', user: { id: 'jackid' } },
    ] as ReactionResponse[];
    component.ngOnChanges({ messageReactionCounts: {} as SimpleChange });
    fixture.detectChanges();

    const reactions = queryEmojis();

    expect(reactions[0].classList).toContain('str-chat__message-reaction-own');
    expect(reactions[1].classList).not.toContain(
      'str-chat__message-reaction-own'
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
});
