import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageReactionType } from '../types';
import { ReactionResponse } from 'stream-chat';
import { BehaviorSubject } from 'rxjs';
import { ChannelService } from '../channel.service';
import { MessageReactionsService } from '../message-reactions.service';
import { MessageReactionsSelectorComponent } from './message-reactions-selector.component';

describe('MessageReactionsSelectorComponent', () => {
  let component: MessageReactionsSelectorComponent;
  let fixture: ComponentFixture<MessageReactionsSelectorComponent>;
  let nativeElement: HTMLElement;
  let queryEmojiOptions: () => HTMLElement[];
  let queryEmojiOption: (type: MessageReactionType) => HTMLElement | null;
  const channelServiceMock = {
    addReaction: (_: string, __: MessageReactionType) => {},
    removeReaction: (_: string, __: MessageReactionType) => {},
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
      declarations: [MessageReactionsSelectorComponent],
      providers: [
        { provide: ChannelService, useValue: channelServiceMock },
        { provide: MessageReactionsService, useValue: reactionsServiceMock },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MessageReactionsSelectorComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    queryEmojiOptions = () =>
      Array.from(
        nativeElement.querySelectorAll('[data-testclass="emoji-option"]')
      );
    queryEmojiOption = (type) =>
      nativeElement.querySelector(`[data-testid=${type}]`);
  });

  it('should display reactions', () => {
    const reactions = Object.keys(reactionsServiceMock.reactions);
    const emojiOptionsCount = reactions.length;
    fixture.detectChanges();

    expect(queryEmojiOptions().length).toBe(emojiOptionsCount);

    reactions.forEach((r) => {
      expect(queryEmojiOption(r)).not.toBeNull();
    });
  });

  it('should add reaction, if user has no reaction with the type', () => {
    spyOn(channelServiceMock, 'addReaction').and.callThrough();
    component.ownReactions = [];
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

  it('should mark reaction types of current user', () => {
    component.ownReactions = [
      { type: 'like', user: { id: 'jackid' } },
    ] as ReactionResponse[];
    fixture.detectChanges();

    const emojiOptions = queryEmojiOptions();
    const likeEmojiOption = emojiOptions.splice(0, 1)[0];
    const otherEmojiOptions = emojiOptions;
    fixture.detectChanges();

    expect(likeEmojiOption.classList).toContain(
      'str-chat__message-reactions-option-selected'
    );
    otherEmojiOptions.forEach((o) =>
      expect(o.classList).not.toContain(
        'str-chat__message-reactions-option-selected'
      )
    );
  });

  it('should filter not supported reactions', () => {
    reactionsServiceMock.reactions$.next({
      angry: '😠',
      haha: '😂',
    });
    component.ownReactions = [
      { type: 'like', user: { id: 'jackid' } },
      { type: 'haha', user: { id: 'jackid' } },
      { type: 'angry', user: { id: 'jackid' } },
    ] as ReactionResponse[];

    expect(component.reactionOptions.length).toBe(2);
    expect(component.reactionOptions.indexOf('like')).toBe(-1);
  });
});
