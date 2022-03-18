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
  const channelServiceMock = {
    // eslint-disable-next-line no-unused-vars
    addReaction: (id: string, type: MessageReactionType) => {},
    // eslint-disable-next-line no-unused-vars
    removeReaction: (id: string, type: MessageReactionType) => {},
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        MessageReactionsComponent,
        AvatarComponent,
        AvatarPlaceholderComponent,
      ],
      providers: [{ provide: ChannelService, useValue: channelServiceMock }],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MessageReactionsComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement as HTMLElement;
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
  });

  it('should display message reactions', () => {
    component.messageReactionCounts = {
      angry: 1,
      haha: 2,
      like: 1,
    };
    fixture.detectChanges();

    expect(queryEmojis().length).toBe(3);
  });

  it('should display total count', () => {
    component.messageReactionCounts = {
      haha: 1,
      love: 2,
      wow: 1,
      sad: 3,
    };
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

    expect(queryReactionsSelector()).toBeNull();

    component.isSelectorOpen = true;
    fixture.detectChanges();

    expect(queryReactionsSelector()).not.toBeNull();
    expect(queryReactionList()).toBeNull();
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

  it('should display tooltip', () => {
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
});
