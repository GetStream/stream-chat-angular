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
  MockChannel,
  MockChannelService,
  mockChannelService,
  mockCurrentUser,
  mockMessage,
} from '../mocks';
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
  let queryTypingIndicator: () => HTMLElement | null;
  let queryTypingUserAvatars: () => AvatarComponent[];

  beforeEach(() => {
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
    queryTypingUserAvatars = () =>
      fixture.debugElement
        .query(By.css('[data-testid="typing-indicator"]'))
        ?.queryAll(By.directive(AvatarComponent))
        .map((e) => e.componentInstance as AvatarComponent);
    fixture.detectChanges();
    const scrollContainer = queryScrollContainer()!;
    scrollContainer.style.maxHeight = '300px';
    scrollContainer.style.overflowY = 'auto';
    fixture.detectChanges();
  });

  it('should display messages', () => {
    const messages = channelServiceMock.activeChannelMessages$.getValue();
    messages[messages.length - 1].user!.id = 'not' + mockCurrentUser().id;
    component.highlightedMessageId = messages[0].id;
    channelServiceMock.activeChannelMessages$.next([...messages]);
    fixture.detectChanges();
    const messagesComponents = queryMessageComponents();
    const messageElements = queryMessages();

    expect(messagesComponents.length).toBe(messages.length);
    messagesComponents.forEach((m, i) => {
      expect(m.message).toBe(messages[i]);
      expect(m.isLastSentMessage).toBe(
        i === messages.length - 2 ? true : false
      );

      expect(m.enabledMessageActions).toEqual(component.enabledMessageActions);

      expect(m.mode).toBe(component.mode);

      expect(m.isHighlighted).toBe(
        messages[i].id === component.highlightedMessageId
      );

      expect(messageElements[i].id).toBe(messages[i].id);
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
    const scrollTop = Math.round(scrollContainer.scrollTop);

    expect(scrollTop).not.toBe(0);
    expect(scrollTop).toBe(
      scrollContainer.scrollHeight - scrollContainer.clientHeight
    );
  });

  it('should scroll to the latest message, after loading the messages if direction is top to bottom', () => {
    spyOn(channelServiceMock, 'jumpToMessage');
    component.direction = 'top-to-bottom';
    component.ngOnChanges({ direction: {} as SimpleChange });

    expect(channelServiceMock.jumpToMessage).toHaveBeenCalledWith(
      'latest',
      undefined
    );
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
    const scrollTop = Math.round(scrollContainer.scrollTop);

    expect(scrollTop).not.toBe(0);
    expect(scrollTop).toBe(
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

  it('should load older messages, if user scrolls up', () => {
    spyOn(channelServiceMock, 'loadMoreMessages');

    const scrollContainer = queryScrollContainer()!;
    scrollContainer.scrollTo({ top: 0 });
    scrollContainer.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(channelServiceMock.loadMoreMessages).toHaveBeenCalledWith('older');
  });

  it('should load older messages, if user scrolls down and direction is top-to-bottom', () => {
    component.direction = 'top-to-bottom';
    component.ngOnChanges({ direction: {} as SimpleChange });
    fixture.detectChanges();
    spyOn(channelServiceMock, 'loadMoreMessages');

    const scrollContainer = queryScrollContainer()!;
    scrollContainer.scrollTo({ top: scrollContainer.scrollHeight });
    scrollContainer.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(channelServiceMock.loadMoreMessages).toHaveBeenCalledWith('older');
  });

  it('should load newer messages, if user scrolls down', () => {
    spyOn(channelServiceMock, 'loadMoreMessages');

    const scrollContainer = queryScrollContainer()!;
    scrollContainer.scrollTo({ top: scrollContainer.scrollHeight });
    scrollContainer.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(channelServiceMock.loadMoreMessages).toHaveBeenCalledWith('newer');
  });

  it('should load newer messages, if user scrolls up and direction is top-to-bottom', () => {
    component.direction = 'top-to-bottom';
    component.ngOnChanges({ direction: {} as SimpleChange });
    fixture.detectChanges();
    spyOn(channelServiceMock, 'loadMoreMessages');

    const scrollContainer = queryScrollContainer()!;
    scrollContainer.scrollTo({ top: 0 });
    scrollContainer.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(channelServiceMock.loadMoreMessages).toHaveBeenCalledWith('newer');
  });

  it('should handle channel change', () => {
    component.unreadMessageCount = 3;
    component.isUserScrolled = true;
    channelServiceMock.activeChannel$.next({
      id: 'nextchannel',
      on: () => {},
    } as any as Channel<DefaultStreamChatGenerics>);
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

  it('should scroll message into view and highlight it', () => {
    const messageElements = queryMessages();
    const message = messageElements[messageElements.length - 1];
    spyOn(message, 'scrollIntoView');
    channelServiceMock.jumpToMessage$.next({ id: message.id });

    expect(message.scrollIntoView).toHaveBeenCalledWith(jasmine.anything());
    expect(component.highlightedMessageId).toBe(message.id);
  });

  it('should scroll message into view and highlight it - parent message', () => {
    const messageElements = queryMessages();
    const message = messageElements[messageElements.length - 1];
    spyOn(message, 'scrollIntoView');
    channelServiceMock.jumpToMessage$.next({
      id: 'thread-message',
      parentId: message.id,
    });

    expect(message.scrollIntoView).toHaveBeenCalledWith(jasmine.anything());
    expect(component.highlightedMessageId).toBe(message.id);
  });

  it('should remove the highlight after scroll', fakeAsync(() => {
    expect(component.highlightedMessageId).toBeUndefined();

    const messageElements = queryMessages();
    const message = messageElements[messageElements.length - 1];
    channelServiceMock.jumpToMessage$.next({ id: message.id });

    expect(component.highlightedMessageId).toBe(message.id);

    tick(500);
    fixture.detectChanges();

    expect(component.highlightedMessageId).toBeUndefined();
  }));

  it('should wait with scrolling until message has been rendered', () => {
    const newMessages = generateMockMessages();
    const message = newMessages[Math.round(newMessages.length / 2)];
    message.id = 'new-message-id';
    // Simulates the scenario when jumping requires a new message set to be loaded
    channelServiceMock.activeChannelMessages$.next(newMessages);
    channelServiceMock.jumpToMessage$.next({
      id: message.id,
      parentId: undefined,
    });

    expect(nativeElement.querySelector(`#${message.id}`)).toBeNull();

    fixture.detectChanges();

    expect(nativeElement.querySelector(`#${message.id}`)).not.toBeNull();
  });

  it('should set #isUserScrolled to true when not the latest message set is displayed', () => {
    const newMessages = generateMockMessages(25, true);
    // Replace the current messages with a compelitely new set
    channelServiceMock.activeChannelMessages$.next(newMessages);
    fixture.detectChanges();
    component.scrollToBottom();
    fixture.detectChanges();

    expect(component.isUserScrolled).toBeTrue();
  });

  it('jump to "latest" message - direction "top-to-bottom"', () => {
    const scrollContainer = queryScrollContainer()!;
    scrollContainer.scrollTo({
      top: (scrollContainer.scrollHeight - scrollContainer.clientHeight) / 2,
    });
    scrollContainer.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    channelServiceMock.jumpToMessage$.next({ id: 'latest' });
    fixture.detectChanges();

    expect(Math.round(scrollContainer.scrollTop)).toBe(
      scrollContainer.scrollHeight - scrollContainer.clientHeight
    );
  });

  it('should turn of programatic scroll adjustment and message load while jumping to message', () => {
    // This test uses private memebers to set up test cases, this is not nice, but this is because creating these cases otherwise would require a lot of complex logic
    component.highlightedMessageId = 'messageId';
    component['hasNewMessages'] = true;
    spyOn(component, 'scrollToBottom');
    component.ngAfterViewChecked();

    expect(component['hasNewMessages']).toBeFalse();
    expect(component.scrollToBottom).not.toHaveBeenCalled();

    component['olderMassagesLoaded'] = true;
    spyOn<any>(component, 'preserveScrollbarPosition');
    component.ngAfterViewChecked();

    expect(component['olderMassagesLoaded']).toBeFalse();

    /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

    expect((component as any).preserveScrollbarPosition).not.toHaveBeenCalled();

    expect((component as any).shouldLoadMoreMessages('bottom')).toBeFalse();

    /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
  });

  it('should get unread message information from "message.new" event if an older message list is displayed', () => {
    let channel!: Channel<DefaultStreamChatGenerics>;
    channelServiceMock.activeChannel$.subscribe((c) => (channel = c!));
    // Simulate message set change
    channel.state.latestMessages = [];
    channelServiceMock.activeChannelMessages$.next(
      generateMockMessages(25, true)
    );

    const scrollContainer = queryScrollContainer()!;
    scrollContainer.scrollTo({
      top: (scrollContainer.scrollHeight - scrollContainer.clientHeight) / 2,
    });
    scrollContainer.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    const newMessageFromOtherUser = mockMessage();
    newMessageFromOtherUser.user!.id += 'not';
    (channel as MockChannel).handleEvent('message.new', {
      message: newMessageFromOtherUser,
    });

    expect(component.unreadMessageCount).toBe(1);

    spyOn(channelServiceMock, 'jumpToMessage').and.callThrough();
    const newMessageFromCurrentUser = mockMessage();
    newMessageFromCurrentUser.created_at = new Date();
    (channel as MockChannel).handleEvent('message.new', {
      message: newMessageFromCurrentUser,
    });
    fixture.detectChanges();

    expect(channelServiceMock.jumpToMessage).toHaveBeenCalledWith(
      'latest',
      undefined
    );
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

      expect(
        Math.round(scrollContainer.scrollTop) + scrollContainer.clientHeight
      ).toBe(scrollContainer.scrollHeight);
    });

    it('should display scroll to latest message button and jump to latest messsage if clicked', fakeAsync(() => {
      spyOn(channelServiceMock, 'jumpToMessage');
      const scrollContainer = queryScrollContainer()!;
      scrollContainer.scrollTo({
        top: (scrollContainer.scrollHeight - scrollContainer.clientHeight) / 2,
      });
      scrollContainer.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();
      queryScrollToLatestButton()?.click();
      fixture.detectChanges();

      expect(channelServiceMock.jumpToMessage).toHaveBeenCalledWith(
        'latest',
        undefined
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

    it('jump to "latest" message', () => {
      const scrollContainer = queryScrollContainer()!;
      channelServiceMock.jumpToMessage$.next({ id: 'latest' });
      fixture.detectChanges();

      expect(Math.round(scrollContainer.scrollTop)).toBe(0);
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
      spyOn(channelServiceMock, 'jumpToMessage');
      queryScrollToLatestButton()?.click();
      fixture.detectChanges();

      expect(channelServiceMock.jumpToMessage).toHaveBeenCalledWith(
        'latest',
        undefined
      );
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
    const avatars = queryTypingUserAvatars();

    expect(avatars.length).toBe(2);
    expect(avatars[0].name).toBe('jack');
    expect(avatars[1].name).toBe('John');
    expect(avatars[1].imageUrl).toBe('url/to/img');
    expect(avatars[1].type).toBe('user');
    expect(avatars[1].location).toBe('typing-indicator');
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

    it('should load older replies, if user scrolls up', () => {
      spyOn(channelServiceMock, 'loadMoreThreadReplies');

      const scrollContainer = queryScrollContainer()!;
      const parentMessageHeight = (
        fixture.nativeElement as HTMLElement
      ).querySelector('[data-testid="parent-message"]')?.clientHeight;
      scrollContainer.scrollTo({ top: parentMessageHeight });
      scrollContainer.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();

      expect(channelServiceMock.loadMoreThreadReplies).toHaveBeenCalledWith(
        'older'
      );
    });

    it(`should older replies, if user scrolls up - shouldn't send unnecessary requests`, () => {
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

      expect(channelServiceMock.loadMoreThreadReplies).toHaveBeenCalledOnceWith(
        'older'
      );
    });

    it('should load newer replies, if user scrolls down', () => {
      spyOn(channelServiceMock, 'loadMoreThreadReplies');

      const scrollContainer = queryScrollContainer()!;
      scrollContainer.scrollTo({ top: scrollContainer.scrollHeight });
      scrollContainer.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();

      expect(channelServiceMock.loadMoreThreadReplies).toHaveBeenCalledWith(
        'newer'
      );
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
      const avatars = queryTypingUserAvatars();

      expect(avatars.length).toBe(2);
      expect(avatars[0].name).toBe('jack');
      expect(avatars[1].name).toBe('John');
    });

    it('should scroll thread message into view and highlight it', () => {
      const messageElements = queryMessages();
      const message = messageElements[messageElements.length - 1];
      spyOn(message, 'scrollIntoView');
      channelServiceMock.jumpToMessage$.next({
        id: message.id,
        parentId: undefined,
      });

      expect(message.scrollIntoView).not.toHaveBeenCalled();
      expect(component.highlightedMessageId).toBe(undefined);

      channelServiceMock.jumpToMessage$.next({
        id: message.id,
        parentId: 'parent-id',
      });

      expect(message.scrollIntoView).toHaveBeenCalledWith(jasmine.anything());
      expect(component.highlightedMessageId).toBe(message.id);
    });

    it('should jump to latest message', () => {
      spyOn(channelServiceMock, 'jumpToMessage');
      component.jumpToLatestMessage();

      expect(channelServiceMock.jumpToMessage).toHaveBeenCalledWith(
        'latest',
        component.parentMessage!.id
      );
    });
  });
});
