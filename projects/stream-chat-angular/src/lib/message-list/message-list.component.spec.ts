import { SimpleChange } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { Channel } from 'stream-chat';
import { AvatarPlaceholderComponent } from '../avatar-placeholder/avatar-placeholder.component';
import { AvatarComponent } from '../avatar/avatar.component';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import { MessageComponent } from '../message/message.component';
import {
  generateMockMessages,
  MockChannelService,
  mockChannelService,
  mockCurrentUser,
  mockMessage,
} from '../mocks';
import { StreamI18nService } from '../stream-i18n.service';
import { DefaultStreamChatGenerics } from '../types';
import { ImageLoadService } from './image-load.service';
import { MessageListComponent } from './message-list.component';

describe('MessageListComponent', () => {
  let component: MessageListComponent;
  let fixture: ComponentFixture<MessageListComponent>;
  let nativeElement: HTMLElement;
  let channelServiceMock: MockChannelService;
  let queryScrollContainer: () => HTMLElement | null;
  let queryMessageComponents: () => MessageComponent[];
  let queryMessages: () => HTMLElement[];
  let queryScrollToLatestButton: () => HTMLElement | null;
  let queryParentMessage: () => MessageComponent | undefined;
  let queryParentMessageReplyCount: () => HTMLElement | null;
  let queryTypingIndicator: () => HTMLElement | null;
  let queryTypingUsers: () => HTMLElement | null;

  beforeEach(fakeAsync(() => {
    channelServiceMock = mockChannelService();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [
        MessageComponent,
        MessageListComponent,
        AvatarComponent,
        AvatarPlaceholderComponent,
      ],
      providers: [
        { provide: ChannelService, useValue: channelServiceMock },
        {
          provide: ChatClientService,
          useValue: {
            chatClient: { user: mockCurrentUser() },
            user$: of(mockCurrentUser()),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(MessageListComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement as HTMLElement;
    queryScrollContainer = () =>
      nativeElement.querySelector('[data-testid="scroll-container"]');
    queryMessageComponents = () =>
      fixture.debugElement
        .queryAll(By.css('[data-testclass="message"]'))
        .map(
          (debugElement) =>
            debugElement.query(By.directive(MessageComponent))
              .componentInstance as MessageComponent
        );
    queryMessages = () =>
      Array.from(nativeElement.querySelectorAll('[data-testclass="message"]'));
    queryScrollToLatestButton = () =>
      nativeElement.querySelector('[data-testid="scroll-to-latest"]');
    queryParentMessage = () =>
      fixture.debugElement
        .query(By.css('[data-testid="parent-message"]'))
        ?.query(By.directive(MessageComponent))
        .componentInstance as MessageComponent;
    queryTypingIndicator = () =>
      nativeElement.querySelector('[data-testid="typing-indicator"]');
    queryTypingUsers = () =>
      nativeElement.querySelector('[data-testid="typing-users"]');
    queryParentMessageReplyCount = () =>
      nativeElement.querySelector('[data-testid="reply-count"]');
    TestBed.inject(StreamI18nService).setTranslation('en');
    fixture.detectChanges();
    const scrollContainer = queryScrollContainer()!;
    scrollContainer.style.maxHeight = '300px';
    scrollContainer.style.overflowY = 'auto';
    tick(300);
    fixture.detectChanges();
  }));

  it('should display messages', () => {
    const messages = channelServiceMock.activeChannelMessages$.getValue();
    messages[messages.length - 1].user!.id = 'not' + mockCurrentUser().id;
    channelServiceMock.activeChannelMessages$.next([...messages]);
    fixture.detectChanges();
    const messagesComponents = queryMessageComponents();

    expect(messagesComponents.length).toBe(messages.length);
    messagesComponents.forEach((m, i) => {
      expect(m.message).toBe(messages[i]);
      expect(m.isLastSentMessage).toBe(
        i === messages.length - 2 ? true : false
      );

      expect(m.enabledMessageActions).toEqual(component.enabledMessageActions);

      expect(m.mode).toBe(component.mode);
    });
  });

  it('should display messages - top-to-bottom direction', () => {
    component.direction = 'top-to-bottom';
    component.ngOnChanges({ direction: {} as SimpleChange });
    fixture.detectChanges();
    const messages = channelServiceMock.activeChannelMessages$.getValue();
    messages[messages.length - 1].user!.id = 'not' + mockCurrentUser().id;
    channelServiceMock.activeChannelMessages$.next([...messages]);
    fixture.detectChanges();
    const messagesComponents = queryMessageComponents();

    expect(messagesComponents.length).toBe(messages.length);
    messagesComponents.forEach((m, i) => {
      expect(m.message).toBe(messages[messages.length - 1 - i]);
      expect(m.isLastSentMessage).toBe(i === 1 ? true : false);
    });
  });

  it(`should display messages - and shouldn't mark unsent messages as last sent message`, () => {
    const messages = channelServiceMock.activeChannelMessages$.getValue();
    messages[messages.length - 1].status = 'sending';
    channelServiceMock.activeChannelMessages$.next([...messages]);
    fixture.detectChanges();
    const messagesComponents = queryMessageComponents();
    const lastMessage = messagesComponents[messagesComponents.length - 1];

    expect(lastMessage.isLastSentMessage).toBeFalse();
  });

  it('should scroll to bottom, after loading the messages', () => {
    const scrollContainer = queryScrollContainer()!;

    expect(scrollContainer.scrollTop).not.toBe(0);
    expect(scrollContainer.scrollTop).toBe(
      scrollContainer.scrollHeight - scrollContainer.clientHeight
    );
  });

  it(`shouldn't scroll to bottom, after loading the messages if direction is top to bottom`, () => {
    component.direction = 'top-to-bottom';
    component.ngOnChanges({ direction: {} as SimpleChange });
    fixture.detectChanges();
    const scrollContainer = queryScrollContainer()!;

    expect(scrollContainer.scrollTop).toBe(0);
  });

  it('should scroll to bottom, after an image has been loaded', () => {
    const imageLoadService = TestBed.inject(ImageLoadService);
    spyOn(component, 'scrollToBottom');
    imageLoadService.imageLoad$.next();

    expect(component.scrollToBottom).toHaveBeenCalledWith();
  });

  it(`shouldn't scroll to bottom, after an image has been loaded if direction is top to bottom`, () => {
    component.direction = 'top-to-bottom';
    component.ngOnChanges({ direction: {} as SimpleChange });
    fixture.detectChanges();
    const imageLoadService = TestBed.inject(ImageLoadService);
    spyOn(component, 'scrollToBottom');
    imageLoadService.imageLoad$.next();

    expect(component.scrollToBottom).not.toHaveBeenCalledWith();
  });

  it('should scroll to bottom, if container grows', () => {
    spyOn(component, 'scrollToBottom');
    const child = queryScrollContainer()!.getElementsByTagName('div')[0];
    child.style.height = (child.offsetHeight * 2).toString() + 'px';
    fixture.detectChanges();

    expect(component.scrollToBottom).toHaveBeenCalledWith();
  });

  it(`shouldn't scroll to bottom, if container grows and direction is top to bottom`, () => {
    component.direction = 'top-to-bottom';
    component.ngOnChanges({ direction: {} as SimpleChange });
    fixture.detectChanges();
    spyOn(component, 'scrollToBottom');
    const child = queryScrollContainer()!.getElementsByTagName('div')[0];
    child.style.height = (child.offsetHeight * 2).toString() + 'px';
    fixture.detectChanges();

    expect(component.scrollToBottom).not.toHaveBeenCalled();
  });

  it(`shouldn't scroll to bottom, after an image has been loaded, if user is scrolled up`, () => {
    component.isUserScrolled = true;
    fixture.detectChanges();
    const imageLoadService = TestBed.inject(ImageLoadService);
    spyOn(component, 'scrollToBottom');
    imageLoadService.imageLoad$.next();

    expect(component.scrollToBottom).not.toHaveBeenCalled();
  });

  it('should scroll to bottom, if user has new message', () => {
    const newMessage = mockMessage();
    newMessage.created_at = new Date();
    channelServiceMock.activeChannelMessages$.next([
      ...channelServiceMock.activeChannelMessages$.getValue(),
      newMessage,
    ]);
    fixture.detectChanges();

    expect(queryMessageComponents().length).toBe(
      channelServiceMock.activeChannelMessages$.getValue().length
    );

    const scrollContainer = queryScrollContainer()!;

    expect(scrollContainer.scrollTop).not.toBe(0);
    expect(scrollContainer.scrollTop).toBe(
      scrollContainer.scrollHeight - scrollContainer.clientHeight
    );
  });

  it(`shouldn't scroll to bottom, if user has new message and direction if top to bottom`, () => {
    component.direction = 'top-to-bottom';
    component.ngOnChanges({ direction: {} as SimpleChange });
    fixture.detectChanges();
    const newMessage = mockMessage();
    newMessage.created_at = new Date();
    channelServiceMock.activeChannelMessages$.next([
      ...channelServiceMock.activeChannelMessages$.getValue(),
      newMessage,
    ]);
    fixture.detectChanges();

    expect(queryMessageComponents().length).toBe(
      channelServiceMock.activeChannelMessages$.getValue().length
    );

    const scrollContainer = queryScrollContainer()!;

    expect(scrollContainer.scrollTop).toBe(0);
  });

  it('should load more messages, if user scrolls up', () => {
    spyOn(channelServiceMock, 'loadMoreMessages');

    const scrollContainer = queryScrollContainer()!;
    scrollContainer.scrollTo({ top: 0 });
    scrollContainer.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(channelServiceMock.loadMoreMessages).toHaveBeenCalledWith();
  });

  it('should load more messages, if user scrolls down and direction is top-to-bottom', () => {
    component.direction = 'top-to-bottom';
    component.ngOnChanges({ direction: {} as SimpleChange });
    fixture.detectChanges();
    spyOn(channelServiceMock, 'loadMoreMessages');

    const scrollContainer = queryScrollContainer()!;
    scrollContainer.scrollTo({ top: scrollContainer.scrollHeight });
    scrollContainer.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(channelServiceMock.loadMoreMessages).toHaveBeenCalledWith();
  });

  it('should handle channel change', () => {
    component.unreadMessageCount = 3;
    component.isUserScrolled = true;
    channelServiceMock.activeChannel$.next({
      id: 'nextchannel',
    } as Channel<DefaultStreamChatGenerics>);
    channelServiceMock.activeChannelMessages$.next([]);
    fixture.detectChanges();

    expect(component.unreadMessageCount).toBe(0);
    expect(component.isUserScrolled).toBeFalse();
    expect(queryMessageComponents().length).toBe(0);
  });

  it('should preserve scroll position, if older messages are loaded', () => {
    const scrollContainer = queryScrollContainer()!;
    scrollContainer.scrollTo({ top: 0 });
    scrollContainer.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(scrollContainer.scrollTop).not.toBe(0);
  });

  describe('if user scrolled up', () => {
    it(`shouldn't scroll down for new messages`, () => {
      const scrollContainer = queryScrollContainer()!;
      scrollContainer.scrollTo({
        top: (scrollContainer.scrollHeight - scrollContainer.clientHeight) / 2,
      });
      scrollContainer.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();
      const newMessage = mockMessage();
      newMessage.created_at = new Date();
      newMessage.user!.id = 'not' + mockCurrentUser().id;
      channelServiceMock.activeChannelMessages$.next([
        ...channelServiceMock.activeChannelMessages$.getValue(),
        newMessage,
      ]);
      fixture.detectChanges();

      expect(scrollContainer.scrollTop).not.toBe(
        scrollContainer.scrollHeight - scrollContainer.clientHeight
      );
    });

    it('should display unread message count', () => {
      expect(queryScrollToLatestButton()).toBeNull();

      const scrollContainer = queryScrollContainer()!;
      scrollContainer.scrollTo({
        top: (scrollContainer.scrollHeight - scrollContainer.clientHeight) / 2,
      });
      scrollContainer.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();
      const newMessage = mockMessage();
      newMessage.created_at = new Date();
      channelServiceMock.activeChannelMessages$.next([
        ...channelServiceMock.activeChannelMessages$.getValue(),
        newMessage,
      ]);
      fixture.detectChanges();

      expect(queryScrollToLatestButton()?.textContent).toContain('1');
    });

    it('should use a treshold when determining if user is scrolled up', () => {
      const scrollContainer = queryScrollContainer()!;
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight - scrollContainer.clientHeight - 150,
      });
      scrollContainer.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();

      expect(queryScrollToLatestButton()).toBeNull();
    });

    it('should scroll down if user sends new message', () => {
      const scrollContainer = queryScrollContainer()!;
      scrollContainer.scrollTo({
        top: (scrollContainer.scrollHeight - scrollContainer.clientHeight) / 2,
      });
      scrollContainer.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();
      const newMessage = mockMessage();
      newMessage.created_at = new Date();
      channelServiceMock.activeChannelMessages$.next([
        ...channelServiceMock.activeChannelMessages$.getValue(),
        newMessage,
      ]);
      fixture.detectChanges();

      expect(scrollContainer.scrollTop + scrollContainer.clientHeight).toBe(
        scrollContainer.scrollHeight
      );
    });

    it('should display scroll to bottom button and scroll to bottom if clicked', fakeAsync(() => {
      const scrollContainer = queryScrollContainer()!;
      scrollContainer.scrollTo({
        top: (scrollContainer.scrollHeight - scrollContainer.clientHeight) / 2,
      });
      scrollContainer.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();
      queryScrollToLatestButton()?.click();
      fixture.detectChanges();

      expect(scrollContainer.scrollTop + scrollContainer.clientHeight).toBe(
        scrollContainer.scrollHeight
      );
    }));
  });

  describe('if user scrolled down and direction is top-to-bottom', () => {
    beforeEach(() => {
      component.direction = 'top-to-bottom';
      component.ngOnChanges({ direction: {} as SimpleChange });
      fixture.detectChanges();
      const scrollContainer = queryScrollContainer()!;
      scrollContainer.scrollTo({
        top: (scrollContainer.scrollHeight - scrollContainer.clientHeight) / 2,
      });
      scrollContainer.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();
    });

    it(`shouldn't scroll up for new messages`, () => {
      const scrollContainer = queryScrollContainer()!;
      const newMessage = mockMessage();
      newMessage.created_at = new Date();
      newMessage.user!.id = 'not' + mockCurrentUser().id;
      channelServiceMock.activeChannelMessages$.next([
        ...channelServiceMock.activeChannelMessages$.getValue(),
        newMessage,
      ]);
      fixture.detectChanges();

      expect(scrollContainer.scrollTop).not.toBe(0);
    });

    it('should display unread message count if direction is top-to-bottom', () => {
      const newMessage = mockMessage();
      newMessage.created_at = new Date();
      channelServiceMock.activeChannelMessages$.next([
        ...channelServiceMock.activeChannelMessages$.getValue(),
        newMessage,
      ]);
      fixture.detectChanges();

      expect(queryScrollToLatestButton()?.textContent).toContain('1');
    });

    it(`shouldn't use a treshold when determining if user is scrolled down`, () => {
      const scrollContainer = queryScrollContainer()!;
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight - scrollContainer.clientHeight - 150,
      });
      scrollContainer.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();

      expect(queryScrollToLatestButton()).not.toBeNull();
    });

    it('should scroll up if user sends new message', () => {
      const scrollContainer = queryScrollContainer()!;
      const newMessage = mockMessage();
      newMessage.created_at = new Date();
      channelServiceMock.activeChannelMessages$.next([
        ...channelServiceMock.activeChannelMessages$.getValue(),
        newMessage,
      ]);
      fixture.detectChanges();

      expect(scrollContainer.scrollTop).toBe(0);
    });

    it('should display scroll to latest button and scroll to top if clicked', fakeAsync(() => {
      const scrollContainer = queryScrollContainer()!;
      queryScrollToLatestButton()?.click();
      fixture.detectChanges();

      expect(scrollContainer.scrollTop).toBe(0);
    }));
  });

  it('should apply group styles', () => {
    const messagesElements = queryMessages();

    /* eslint-disable jasmine/new-line-before-expect */
    messagesElements.forEach((m) =>
      expect(m.classList.toString()).toMatch(/middle|top|bottom|single/)
    );
    /* eslint-enable jasmine/new-line-before-expect */
  });

  it('should display typing indicator', () => {
    expect(queryTypingIndicator()).toBeNull();

    channelServiceMock.usersTypingInChannel$.next([
      { id: 'jack' },
      { id: 'john', name: 'John', image: 'url/to/img' },
    ]);
    fixture.detectChanges();

    expect(queryTypingIndicator()).not.toBeNull();

    expect(queryTypingUsers()?.textContent).toContain('jack, John');
  });

  describe('thread mode', () => {
    beforeEach(() => {
      component.mode = 'thread';
      component.ngOnChanges({ mode: {} as SimpleChange });
      const parentMessage = mockMessage();
      parentMessage.id = 'parentMessage';
      channelServiceMock.activeParentMessage$.next(parentMessage);
      channelServiceMock.activeThreadMessages$.next(generateMockMessages());
      channelServiceMock.activeChannelMessages$.next([parentMessage]);
      fixture.detectChanges();
    });

    it('should display messages', () => {
      const messagesComponents = queryMessageComponents();
      const messages = channelServiceMock.activeThreadMessages$.getValue();

      expect(messagesComponents.length).toBe(messages.length);
    });

    it('should load more replies, if user scrolls up', () => {
      spyOn(channelServiceMock, 'loadMoreThreadReplies');

      const scrollContainer = queryScrollContainer()!;
      const parentMessageHeight = (
        fixture.nativeElement as HTMLElement
      ).querySelector('[data-testid="parent-message"]')?.clientHeight;
      scrollContainer.scrollTo({ top: parentMessageHeight });
      scrollContainer.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();

      expect(channelServiceMock.loadMoreThreadReplies).toHaveBeenCalledWith();
    });

    it(`should load more replies, if user scrolls up - shouldn't send unnecessary requests`, () => {
      spyOn(channelServiceMock, 'loadMoreThreadReplies');

      const scrollContainer = queryScrollContainer()!;
      const parentMessageHeight = (
        fixture.nativeElement as HTMLElement
      ).querySelector('[data-testid="parent-message"]')?.clientHeight;
      scrollContainer.scrollTo({ top: parentMessageHeight });
      scrollContainer.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();
      scrollContainer.scrollTo({ top: parentMessageHeight! - 1 });
      scrollContainer.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();

      expect(
        channelServiceMock.loadMoreThreadReplies
      ).toHaveBeenCalledOnceWith();
    });

    it('should show parent message of thread', () => {
      const parentMessage = queryParentMessage();

      expect(parentMessage?.message?.id).toBe('parentMessage');
      expect(parentMessage?.mode).toBe('thread');

      component.mode = 'main';
      component.ngOnChanges({ mode: {} as SimpleChange });
      fixture.detectChanges();

      expect(queryParentMessage()).toBeUndefined();
    });

    it('should show reply count in thread', () => {
      component.parentMessage!.reply_count = 1;
      fixture.detectChanges();
      const replyCount = queryParentMessageReplyCount();

      expect(replyCount?.innerHTML).toContain('1 reply');

      component.parentMessage!.reply_count = 3;
      fixture.detectChanges();

      expect(replyCount?.innerHTML).toContain('3 replies');
    });

    it('should reset scroll state after parent message changed', () => {
      const parentMessage = mockMessage();
      parentMessage.id = 'parentMessage2';
      component.unreadMessageCount = 4;
      component.isUserScrolled = true;
      channelServiceMock.activeParentMessage$.next(parentMessage);
      channelServiceMock.activeThreadMessages$.next([]);
      fixture.detectChanges();

      expect(component.unreadMessageCount).toBe(0);
      expect(component.isUserScrolled).toBeFalse();
      expect(queryMessageComponents().length).toBe(0);
    });

    it(`shouldn't reset scroll state after parent message changed, if in main mode`, () => {
      component.mode = 'main';
      fixture.detectChanges();
      const parentMessage = mockMessage();
      parentMessage.id = 'parentMessage2';
      component.unreadMessageCount = 4;
      component.isUserScrolled = true;
      channelServiceMock.activeParentMessage$.next(parentMessage);
      fixture.detectChanges();

      expect(component.unreadMessageCount).toBe(4);
      expect(component.isUserScrolled).toBeTrue();
    });

    it('should display typing indicator in thread', () => {
      channelServiceMock.usersTypingInChannel$.next([{ id: 'sara' }]);

      expect(queryTypingIndicator()).toBeNull();

      channelServiceMock.usersTypingInThread$.next([
        { id: 'jack' },
        { id: 'john', name: 'John' },
      ]);
      fixture.detectChanges();

      expect(queryTypingIndicator()).not.toBeNull();

      expect(queryTypingUsers()?.textContent).toContain('jack, John');
    });
  });
});
