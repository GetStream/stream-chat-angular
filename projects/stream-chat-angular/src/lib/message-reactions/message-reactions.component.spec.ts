import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { ReactionResponse } from 'stream-chat';
import { By } from '@angular/platform-browser';
import { AvatarComponent } from '../avatar/avatar.component';

import { MessageReactionsComponent } from './message-reactions.component';
import { ChannelService } from '../channel.service';
import { SimpleChange } from '@angular/core';
import { AvatarPlaceholderComponent } from '../avatar-placeholder/avatar-placeholder.component';
import { MessageReactionType } from '../types';
import { MessageReactionsService } from '../message-reactions.service';
import { ThemeService } from '../theme.service';
import { ModalComponent } from '../modal/modal.component';
import { BehaviorSubject } from 'rxjs';

describe('MessageReactionsComponent', () => {
  let component: MessageReactionsComponent;
  let fixture: ComponentFixture<MessageReactionsComponent>;
  let nativeElement: HTMLElement;
  let queryReactionList: () => HTMLElement | null;
  let queryEmojis: () => HTMLElement[];
  let queryReactionsCount: () => HTMLElement | null;
  let queryReactionsSelector: () => HTMLElement | null;
  let queryEmojiOptions: () => HTMLElement[];
  let queryEmojiOptionReactionCount: (
    type: MessageReactionType
  ) => HTMLElement | null;
  let queryReactionAvatarComponent: (
    type: MessageReactionType
  ) => AvatarPlaceholderComponent;
  let queryReactionLastUser: (type: MessageReactionType) => HTMLElement | null;
  let querySelectorTooltip: () => HTMLElement | null;
  let queryReactionCountsFromReactionList: () => HTMLElement[];
  const channelServiceMock = {
    // eslint-disable-next-line no-unused-vars
    addReaction: (id: string, type: MessageReactionType) => {},
    // eslint-disable-next-line no-unused-vars
    removeReaction: (id: string, type: MessageReactionType) => {},
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
        { provide: ThemeService, useValue: { themeVersion: '2' } },
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
    queryReactionsSelector = () =>
      nativeElement.querySelector('[data-testid="reaction-selector"]');
    queryEmojiOptions = () =>
      Array.from(
        nativeElement.querySelectorAll('[data-testclass="emoji-option"]')
      );
    queryEmojiOptionReactionCount = (type) =>
      nativeElement.querySelector(`[data-testid=${type}-reaction-count]`);
    queryReactionAvatarComponent = (type) =>
      fixture.debugElement.query(By.css(`[data-testid="${type}-avatar"]`))
        ?.componentInstance as AvatarPlaceholderComponent;
    querySelectorTooltip = () =>
      nativeElement.querySelector('[data-testid="tooltip"]');
    queryReactionLastUser = (type) =>
      nativeElement.querySelector(`[data-testid="${type}-last-user"]`);
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

  it('should display selector, if #isSelectorOpen', () => {
    component.messageReactionCounts = {
      haha: 1,
    };
    component.ngOnChanges({
      messageReactionCounts: {} as SimpleChange,
    });

    expect(queryReactionsSelector()).toBeNull();
    expect(
      nativeElement.querySelector('.str-chat__reaction-list-hidden')
    ).toBeNull();

    component.isSelectorOpen = true;
    fixture.detectChanges();

    expect(queryReactionsSelector()).not.toBeNull();
    expect(
      nativeElement.querySelector('.str-chat__reaction-list-hidden')
    ).not.toBeNull();
  });

  it('should display detailed reactions', () => {
    const emojiOptionsCount = 6;
    component.messageReactionCounts = {
      wow: 1,
      sad: 3,
      like: 2,
    };
    component.latestReactions = [
      { type: 'wow', user: { id: 'sara', name: 'Sara', image: 'image/url' } },
      { type: 'sad', user: { id: 'jim' } },
      { type: 'sad', user: { id: 'ben', name: 'Ben' } },
    ] as ReactionResponse[];
    component.isSelectorOpen = true;
    fixture.detectChanges();

    expect(queryEmojiOptions().length).toBe(emojiOptionsCount);
    expect(
      queryEmojiOptionReactionCount('wow')?.textContent?.replace(/ /g, '')
    ).toBe(component.messageReactionCounts['wow']?.toString());

    expect(
      queryEmojiOptionReactionCount('sad')?.textContent?.replace(/ /g, '')
    ).toBe(component.messageReactionCounts['sad']?.toString());

    expect(
      queryEmojiOptionReactionCount('like')?.textContent?.replace(/ /g, '')
    ).toBe(component.messageReactionCounts['like']?.toString());

    const wowReactionAvatar = queryReactionAvatarComponent('wow');

    expect(wowReactionAvatar.imageUrl).toBe(
      component.latestReactions[0].user!.image
    );

    expect(wowReactionAvatar.name).toBe(
      component.latestReactions[0].user!.name
    );

    expect(queryReactionAvatarComponent('sad').name).toBe(
      component.latestReactions[1].user!.id
    );

    expect(queryReactionAvatarComponent('like')).toBeUndefined();
  });

  it('should display tooltip - selector', () => {
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
    component.isSelectorOpen = true;
    fixture.detectChanges();

    expect(querySelectorTooltip()).toBeNull();

    queryReactionLastUser('wow')?.dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();
    const tooltip = querySelectorTooltip();

    expect(tooltip).not.toBeNull();
    expect(tooltip?.innerHTML).toContain('Sara, jackid');
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

  it('should add reaction, if user has no reaction with the type', () => {
    spyOn(channelServiceMock, 'addReaction').and.callThrough();
    component.ownReactions = [];
    component.isSelectorOpen = true;
    component.messageId = 'id';
    fixture.detectChanges();

    const likeEmojiOption = queryEmojiOptions()[0];
    likeEmojiOption.click();
    fixture.detectChanges();

    expect(channelServiceMock.addReaction).toHaveBeenCalledWith(
      component.messageId,
      'like'
    );
  });

  it('should remove reaction, if user has reaction with the type', () => {
    spyOn(channelServiceMock, 'removeReaction').and.callThrough();
    component.ownReactions = [
      { type: 'like', user: { id: 'jackid' } },
    ] as ReactionResponse[];
    component.isSelectorOpen = true;
    component.messageId = 'id';
    fixture.detectChanges();

    const likeEmojiOption = queryEmojiOptions()[0];
    likeEmojiOption.click();
    fixture.detectChanges();

    expect(channelServiceMock.removeReaction).toHaveBeenCalledWith(
      component.messageId,
      'like'
    );
  });

  it('should emit #isSelectorOpenChange, if outside click happens', fakeAsync(() => {
    let eventHandler: Function | undefined;
    spyOn(window, 'addEventListener').and.callFake(
      (_: string, handler: any) => {
        eventHandler = handler as Function;
      }
    );
    const spy = jasmine.createSpy();
    component.isSelectorOpenChange.subscribe(spy);
    component.isSelectorOpen = true;
    component.ngOnChanges({
      isSelectorOpen: {} as any as SimpleChange,
    });
    tick();
    fixture.detectChanges();
    eventHandler!(queryReactionsSelector());

    expect(spy).toHaveBeenCalledWith(false);
  }));

  it('should only watch for outside clicks if selector is open', () => {
    const addEventListenerSpy = spyOn(window, 'addEventListener');
    const removeEventListenerSpy = spyOn(window, 'removeEventListener');
    component.isSelectorOpen = false;
    component.ngOnChanges({
      isSelectorOpen: {} as any as SimpleChange,
    });
    fixture.detectChanges();

    expect(addEventListenerSpy).not.toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'click',
      jasmine.any(Function)
    );
  });

  it('should mark reaction types of current user - selector', () => {
    component.ownReactions = [
      { type: 'like', user: { id: 'jackid' } },
    ] as ReactionResponse[];
    component.isSelectorOpen = true;
    fixture.detectChanges();

    const emojiOptions = queryEmojiOptions();
    const likeEmojiOption = emojiOptions.splice(0, 1)[0];
    const otherEmojiOptions = emojiOptions;
    fixture.detectChanges();

    expect(likeEmojiOption.classList).toContain(
      'str-chat__message-reactions-option-selected'
    );
    /* eslint-disable jasmine/new-line-before-expect */
    otherEmojiOptions.forEach((o) =>
      expect(o.classList).not.toContain(
        'str-chat__message-reactions-option-selected'
      )
    );
    /* eslint-enable jasmine/new-line-before-expect */
  });

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

    /* eslint-disable jasmine/new-line-before-expect */
    expect(reactions[0].classList).toContain('str-chat__message-reaction-own');
    expect(reactions[1].classList).not.toContain(
      'str-chat__message-reaction-own'
    );
    /* eslint-disable jasmine/new-line-before-expect */
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
