import { ChangeDetectorRef, SimpleChange } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';
import { Channel, dateToNs, nsToDate, UserResponse } from 'stream-chat';
import { AvatarPlaceholderComponent } from '../avatar-placeholder/avatar-placeholder.component';
import { AvatarComponent } from '../avatar/avatar.component';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import { MessageComponent } from '../message/message.component';
import {
  generateMockChannels,
  generateMockMessages,
  MockChannel,
  MockChannelService,
  mockChannelService,
  mockCurrentUser,
  MockMessagePaginator,
  mockMessage,
} from '../mocks';
import { StreamI18nService } from '../stream-i18n.service';
import { MessageListComponent } from './message-list.component';
import { take } from 'rxjs/operators';
import { NgxFloatUiModule } from 'ngx-float-ui';

const getPaginator = (channel: Channel | undefined) =>
  channel!.messagePaginator as unknown as MockMessagePaginator;

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
  let queryLoadingIndicator: (pos: 'top' | 'bottom') => HTMLElement | null;
  let queryDateSeparators: () => HTMLElement[];
  let queryNewMessagesIndicator: () => HTMLElement | null;
  let queryNewMessagesNotification: () => HTMLElement | null;

  beforeEach(() => {
    channelServiceMock = mockChannelService();
    // In ChannelService these getters return the latest value of the message streams
    Object.defineProperty(channelServiceMock, 'activeChannelMessages', {
      get: () => channelServiceMock.activeChannelMessages$.getValue(),
    });
    Object.defineProperty(channelServiceMock, 'activeChannelThreadReplies', {
      get: () => channelServiceMock.activeThreadMessages$.getValue(),
    });
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), NgxFloatUiModule],
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
    queryLoadingIndicator = (pos: 'top' | 'bottom') =>
      nativeElement.querySelector(`[data-testid="${pos}-loading-indicator"]`);
    queryDateSeparators = () =>
      Array.from(
        nativeElement.querySelectorAll('[data-testid="date-separator"]')
      );
    queryNewMessagesIndicator = () =>
      nativeElement.querySelector('[data-testid="new-messages-indicator"]');
    queryNewMessagesNotification = () =>
      nativeElement.querySelector(
        '[data-testid="unread-messages-notification"]'
      );
    TestBed.inject(StreamI18nService).setTranslation('en');
    fixture.detectChanges();
    const scrollContainer = queryScrollContainer()!;
    scrollContainer.style.maxHeight = '300px';
    scrollContainer.style.overflowY = 'auto';
    fixture.detectChanges();
  });

  it('should display messages', () => {
    const messages = channelServiceMock.activeChannelMessages$.getValue();
    messages[messages.length - 1].user.id = 'not' + mockCurrentUser().id;
    component.highlightedMessageId = messages[0].id;
    channelServiceMock.activeChannelMessages$.next([...messages]);
    component.ngOnChanges({
      highlightedMessageId: {} as SimpleChange,
    });
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

  // TODO: figure out while this test fails
  // fit('should display messages - top-to-bottom direction', fakeAsync(() => {
  //   component['isViewInited'] = true;
  //   fixture.detectChanges();
  //   component.direction = 'top-to-bottom';
  //   component.ngOnChanges({ direction: {} as SimpleChange });
  //   tick();
  //   fixture.detectChanges();

  //   const messages = channelServiceMock.activeChannelMessages$.getValue();
  //   messages[messages.length - 1].user!.id = 'not' + mockCurrentUser().id;
  //   channelServiceMock.activeChannelMessages$.next([...messages]);
  //   tick();
  //   fixture.detectChanges();
  //   const messagesComponents = queryMessageComponents();

  //   expect(messagesComponents.length).toBe(messages.length);
  //   messagesComponents.forEach((m, i) => {
  //     expect(m.message).toBe(messages[messages.length - 1 - i]);
  //     expect(m.isLastSentMessage).toBe(i === 1 ? true : false);
  //   });
  // }));

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
    const spy = jasmine.createSpy();
    component['scrollPosition$'].subscribe(spy);
    spy.calls.reset();
    component.direction = 'top-to-bottom';
    component.ngOnChanges({ direction: {} as SimpleChange });

    // we invert scroll position for top-to-bottom list, so bottom means top
    expect(spy).toHaveBeenCalledWith('bottom');
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

  it('should scroll to bottom, if user has new message', () => {
    const scrollContainer = queryScrollContainer()!;
    scrollContainer.scrollTop -= 10;
    scrollContainer.dispatchEvent(new Event('scroll'));

    expect(scrollContainer.scrollTop).toBeLessThan(
      scrollContainer.scrollHeight - scrollContainer.clientHeight
    );

    const newMessage = mockMessage();
    newMessage.created_at = dateToNs(new Date());
    (channelServiceMock.activeChannel as MockChannel).handleEvent(
      'message.new',
      {
        message: newMessage,
      }
    );
    channelServiceMock.activeChannelMessages$.next([
      ...channelServiceMock.activeChannelMessages$.getValue(),
      newMessage,
    ]);
    fixture.detectChanges();

    expect(queryMessageComponents().length).toBe(
      channelServiceMock.activeChannelMessages$.getValue().length
    );

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
    newMessage.created_at = dateToNs(new Date());
    channelServiceMock.activeChannelMessages$.next([
      ...channelServiceMock.activeChannelMessages$.getValue(),
      newMessage,
    ]);
    (channelServiceMock.activeChannel as MockChannel).handleEvent(
      'message.new',
      { message: newMessage }
    );
    fixture.detectChanges();

    expect(queryMessageComponents().length).toBe(
      channelServiceMock.activeChannelMessages$.getValue().length
    );

    const scrollContainer = queryScrollContainer()!;

    expect(scrollContainer.scrollTop).toBe(0);
  });

  it('should emit scroll position if user scrolls up', () => {
    const spy = jasmine.createSpy();
    component['scrollPosition$'].subscribe(spy);

    const scrollContainer = queryScrollContainer()!;
    scrollContainer.scrollTo({ top: 0 });
    spy.calls.reset();
    scrollContainer.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('top');
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

  it('should emit scroll position if user scrolls down', () => {
    const spy = jasmine.createSpy();
    component['scrollPosition$'].subscribe(spy);

    const scrollContainer = queryScrollContainer()!;
    scrollContainer.scrollTo({ top: 0 });
    scrollContainer.dispatchEvent(new Event('scroll'));
    scrollContainer.scrollTo({ top: scrollContainer.scrollHeight });
    spy.calls.reset();
    scrollContainer.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('bottom');
  });

  it('should load newer messages, if user scrolls up and direction is top-to-bottom', () => {
    component.direction = 'top-to-bottom';
    component.ngOnChanges({ direction: {} as SimpleChange });
    fixture.detectChanges();
    spyOn(channelServiceMock, 'loadMoreMessages');

    const scrollContainer = queryScrollContainer()!;
    scrollContainer.scrollTo({ top: 20 });
    scrollContainer.dispatchEvent(new Event('scroll'));
    scrollContainer.scrollTo({ top: 0 });
    scrollContainer.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(channelServiceMock.loadMoreMessages).toHaveBeenCalledWith('newer');
  });

  it('should handle channel change', () => {
    // @ts-expect-error white-box test
    const spy = spyOn(component, 'disposeVirtualizedList');
    spy.calls.reset();
    const scrollSpy = jasmine.createSpy();
    component['scrollPosition$'].subscribe(scrollSpy);
    scrollSpy.calls.reset();
    component.newMessageCountWhileBeingScrolled = 3;
    component.isUserScrolled = true;
    channelServiceMock.activeChannel$.next({
      id: 'nextchannel',
      on: () => {},
    } as any as Channel);
    channelServiceMock.activeChannelMessages$.next([]);
    fixture.detectChanges();

    expect(component.newMessageCountWhileBeingScrolled).toBe(0);
    expect(component.isUserScrolled).toBeFalse();
    expect(queryMessageComponents().length).toBe(0);
    expect(spy).toHaveBeenCalled();
    expect(scrollSpy).toHaveBeenCalledWith('bottom');
  });

  it('should preserve scroll position, if older messages are loaded', fakeAsync(() => {
    const scrollContainer = queryScrollContainer()!;
    scrollContainer.scrollTo({ top: 0 });
    scrollContainer.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(scrollContainer.scrollTop).not.toBe(0);
  }));

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

    tick(1000);
    fixture.detectChanges();

    expect(component.highlightedMessageId).toBeUndefined();
  }));

  it('should render the new message window before scrolling to the message', () => {
    const newMessages = generateMockMessages();
    const message = newMessages[Math.round(newMessages.length / 2)];
    message.id = 'new-message-id';
    const scrollIntoViewSpy = spyOn(
      HTMLElement.prototype,
      'scrollIntoView'
    ).and.callThrough();
    // Simulates the scenario when jumping requires a new message set to be loaded
    channelServiceMock.activeChannelMessages$.next(newMessages);
    channelServiceMock.jumpToMessage$.next({
      id: message.id,
      parentId: undefined,
    });

    const messageElement = nativeElement.querySelector(`#${message.id}`);

    expect(messageElement).not.toBeNull();
    expect(scrollIntoViewSpy.calls.mostRecent()?.object).toBe(messageElement);
  });

  it('should set #isUserScrolled to true when not the latest message set is displayed', () => {
    const newMessages = generateMockMessages(25, true);
    // Replace the current messages with a compelitely new set
    newMessages.forEach((m) => {
      m.cid = channelServiceMock.activeChannel!.cid;
    });
    // There are newer messages to load
    getPaginator(channelServiceMock.activeChannel).state.partialNext({
      hasMoreHead: true,
    });
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
    component['isJumpingToMessage'] = true;
    component.isUserScrolled = true;
    spyOn(component, 'scrollToBottom');
    component.ngAfterViewChecked();

    expect(component.scrollToBottom).not.toHaveBeenCalled();

    spyOn<any>(component, 'preserveScrollbarPosition');
    component['messageIdToAnchorTo'] = 'id';
    component.ngAfterViewChecked();

    /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

    expect((component as any).preserveScrollbarPosition).not.toHaveBeenCalled();

    /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
  });

  it(`should deselect oldest message if it's removed from the list`, fakeAsync(() => {
    const olderMessages = generateMockMessages(50, true);
    channelServiceMock.activeChannelMessages$.next(olderMessages);
    fixture.detectChanges();

    const newerMessages = generateMockMessages();
    channelServiceMock.activeChannelMessages$.next(newerMessages);
    fixture.detectChanges();
    spyOn(channelServiceMock, 'loadMoreMessages').and.callFake(() => {
      channelServiceMock.activeChannelMessages$.next([
        ...generateMockMessages(25, true),
        ...newerMessages,
      ]);
      return Promise.resolve({ messages: [] });
    });

    const scrollContainer = queryScrollContainer()!;
    scrollContainer.scrollTo({ top: 0 });
    scrollContainer.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(Math.floor(scrollContainer.scrollTop)).not.toBe(0);
  }));

  it('should get unread message information from "message.new" event if an older message list is displayed', () => {
    let channel!: Channel;
    channelServiceMock.activeChannel$
      .pipe(take(1))
      .subscribe((c) => (channel = c!));
    // Simulate message set change
    getPaginator(channel).state.partialNext({
      hasMoreHead: true,
    });
    channelServiceMock.activeChannelMessages$.next(
      generateMockMessages(25, true).map((m) => ({ ...m, cid: channel.cid }))
    );

    const scrollContainer = queryScrollContainer()!;
    scrollContainer.scrollTo({
      top: (scrollContainer.scrollHeight - scrollContainer.clientHeight) / 2,
    });
    scrollContainer.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    const newMessageFromOtherUser = mockMessage();
    newMessageFromOtherUser.user.id += 'not';
    (channel as MockChannel).handleEvent('message.new', {
      message: newMessageFromOtherUser,
    });

    expect(component.newMessageCountWhileBeingScrolled).toBe(1);

    spyOn(channelServiceMock, 'jumpToMessage').and.callThrough();
    const newMessageFromCurrentUser = mockMessage();
    newMessageFromCurrentUser.created_at = dateToNs(new Date());
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
      newMessage.created_at = dateToNs(new Date());
      newMessage.user.id = 'not' + mockCurrentUser().id;
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
      newMessage.created_at = dateToNs(new Date());
      newMessage.user_id = 'not' + mockCurrentUser().id;
      (channelServiceMock.activeChannel as MockChannel).handleEvent(
        'message.new',
        { message: newMessage }
      );
      channelServiceMock.activeChannelMessages$.next([
        ...channelServiceMock.activeChannelMessages$.getValue(),
        newMessage,
      ]);
      fixture.detectChanges();

      expect(queryScrollToLatestButton()?.textContent).toContain('1');
    });

    it('should scroll to bottom, if user has new message', () => {
      const scrollContainer = queryScrollContainer()!;
      scrollContainer.scrollTop -= 10;
      scrollContainer.dispatchEvent(new Event('scroll'));

      expect(scrollContainer.scrollTop).toBeLessThan(
        scrollContainer.scrollHeight - scrollContainer.clientHeight
      );

      const newMessage = mockMessage();
      newMessage.created_at = dateToNs(new Date());
      (channelServiceMock.activeChannel as MockChannel).handleEvent(
        'message.new',
        {
          message: newMessage,
        }
      );
      channelServiceMock.activeChannelMessages$.next([
        ...channelServiceMock.activeChannelMessages$.getValue(),
        newMessage,
      ]);
      fixture.detectChanges();

      expect(queryMessageComponents().length).toBe(
        channelServiceMock.activeChannelMessages$.getValue().length
      );
    });

    it('should display scroll to latest message button and jump to latest messsage if clicked', fakeAsync(() => {
      const spy = spyOn(component, 'scrollToBottom');
      const scrollContainer = queryScrollContainer()!;
      scrollContainer.scrollTo({
        top: (scrollContainer.scrollHeight - scrollContainer.clientHeight) / 2,
      });
      scrollContainer.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();
      queryScrollToLatestButton()?.click();
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledWith();

      component.ngOnDestroy();
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
      newMessage.created_at = dateToNs(new Date());
      newMessage.user.id = 'not' + mockCurrentUser().id;
      channelServiceMock.activeChannelMessages$.next([
        ...channelServiceMock.activeChannelMessages$.getValue(),
        newMessage,
      ]);
      fixture.detectChanges();

      expect(scrollContainer.scrollTop).not.toBe(0);
    });

    it('should display unread message count if direction is top-to-bottom', () => {
      const newMessage = mockMessage();
      newMessage.created_at = dateToNs(new Date());
      channelServiceMock.activeChannelMessages$.next([
        ...channelServiceMock.activeChannelMessages$.getValue(),
        newMessage,
      ]);
      (channelServiceMock.activeChannel as MockChannel).handleEvent(
        'message.new',
        { message: newMessage }
      );
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
      newMessage.created_at = dateToNs(new Date());
      channelServiceMock.activeChannelMessages$.next([
        ...channelServiceMock.activeChannelMessages$.getValue(),
        newMessage,
      ]);
      (channelServiceMock.activeChannel as MockChannel).handleEvent(
        'message.new',
        { message: newMessage }
      ),
        fixture.detectChanges();

      expect(scrollContainer.scrollTop).toBe(0);
    });

    it('should display scroll to latest button and scroll to top if clicked', fakeAsync(() => {
      const spy = spyOn(component, 'scrollToTop');
      queryScrollToLatestButton()?.click();
      fixture.detectChanges();

      expect(spy).toHaveBeenCalled();
    }));
  });

  it('should apply group styles', () => {
    const messagesElements = queryMessages();

    messagesElements.forEach((m) =>
      expect(m.classList.toString()).toMatch(/middle|top|bottom|single/)
    );
  });

  it('should display typing indicator', () => {
    expect(queryTypingIndicator()).toBeNull();

    channelServiceMock.usersTypingInChannel$.next([
      { id: 'jack' },
      { id: 'john', name: 'John', image: 'http://url/to/img' },
    ] as UserResponse[]);
    fixture.detectChanges();

    expect(queryTypingIndicator()).not.toBeNull();

    expect(queryTypingUsers()?.textContent).toContain('jack, John');
  });

  it(`shouldn't display scroll to latest button if there is no scrollbar`, () => {
    const scrollContainer = queryScrollContainer();

    scrollContainer!.style.maxHeight = `${scrollContainer!.scrollHeight}px`;
    fixture.detectChanges();

    component.scrolled();
    fixture.detectChanges();

    expect(queryScrollToLatestButton()).toBeNull();
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

    it(`should load older replies, if user scrolls up - shouldn't send unnecessary requests`, () => {
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
      scrollContainer.scrollTop -= 50;
      scrollContainer.dispatchEvent(new Event('scroll'));
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
      fixture.componentRef.injector.get(ChangeDetectorRef).detectChanges();

      expect(queryParentMessage()).toBeUndefined();
    });

    it('should show reply count in thread', () => {
      component.parentMessage!.reply_count = 1;
      fixture.componentRef.injector.get(ChangeDetectorRef).detectChanges();
      const replyCount = queryParentMessageReplyCount();

      expect(replyCount?.innerHTML).toContain('1 reply');

      component.parentMessage!.reply_count = 3;
      fixture.componentRef.injector.get(ChangeDetectorRef).detectChanges();

      expect(replyCount?.innerHTML).toContain('3 replies');
    });

    it('should reset scroll state after parent message changed', () => {
      const parentMessage = mockMessage();
      parentMessage.id = 'parentMessage2';
      component.newMessageCountWhileBeingScrolled = 4;
      component.isUserScrolled = true;
      channelServiceMock.activeParentMessage$.next(parentMessage);
      channelServiceMock.activeThreadMessages$.next([]);
      fixture.detectChanges();

      expect(component.newMessageCountWhileBeingScrolled).toBe(0);
      expect(component.isUserScrolled).toBeFalse();
      expect(queryMessageComponents().length).toBe(0);
    });

    it(`shouldn't reset scroll state after parent message changed, if in main mode`, () => {
      component.mode = 'main';
      fixture.detectChanges();
      const parentMessage = mockMessage();
      parentMessage.id = 'parentMessage2';
      component.newMessageCountWhileBeingScrolled = 4;
      component.isUserScrolled = true;
      channelServiceMock.activeParentMessage$.next(parentMessage);
      fixture.detectChanges();

      expect(component.newMessageCountWhileBeingScrolled).toBe(4);
      expect(component.isUserScrolled).toBeTrue();
    });

    it('should display typing indicator in thread', () => {
      channelServiceMock.usersTypingInChannel$.next([
        { id: 'sara' } as UserResponse,
      ]);

      expect(queryTypingIndicator()).toBeNull();

      channelServiceMock.usersTypingInThread$.next([
        { id: 'jack' },
        { id: 'john', name: 'John' },
      ] as UserResponse[]);
      fixture.detectChanges();

      expect(queryTypingIndicator()).not.toBeNull();

      expect(queryTypingUsers()?.textContent).toContain('jack, John');
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
      component['isLatestMessageInList'] = false;
      component.jumpToLatestMessage();

      expect(channelServiceMock.jumpToMessage).toHaveBeenCalledWith(
        'latest',
        component.parentMessage!.id
      );
    });

    it('should ignore openMessageListAt input', () => {
      component.openMessageListAt = 'last-read-message';

      const channel = generateMockChannels()[0];
      const messages = generateMockMessages();
      channel.id = 'test-channel';
      channelServiceMock.activeChannelLastReadMessageId =
        messages[messages.length - 1].id;
      channelServiceMock.activeChannel$.next(channel);
      channelServiceMock.activeChannelMessages$.next(messages);

      expect(component.lastReadMessageId).toBeUndefined();
    });
  });

  it('should set isLoading flag', () => {
    expect(component.loadingState).toBe('idle');

    component['virtualizedList']?.['queryStateSubject'].next({
      state: 'loading-bottom',
    });

    expect(component.loadingState).toBe('loading-bottom');

    component['virtualizedList']?.['queryStateSubject'].next({
      state: 'success',
    });

    expect(component.loadingState).toBe('idle');

    component['virtualizedList']?.['queryStateSubject'].next({
      state: 'loading-top',
    });

    expect(component.loadingState).toBe('loading-top');

    component['virtualizedList']?.['queryStateSubject'].next({
      state: 'error',
    });

    expect(component.loadingState).toBe('idle');
  });

  it('should display loading indicator', () => {
    component.loadingState = 'idle';
    fixture.componentRef.injector.get(ChangeDetectorRef).detectChanges();

    expect(queryLoadingIndicator('top')).toBeNull();
    expect(queryLoadingIndicator('bottom')).toBeNull();

    component.direction = 'top-to-bottom';
    component.loadingState = 'loading-top';
    fixture.componentRef.injector.get(ChangeDetectorRef).detectChanges();

    expect(queryLoadingIndicator('bottom')).not.toBeNull();
    expect(queryLoadingIndicator('top')).toBeNull();

    component.direction = 'bottom-to-top';
    component.loadingState = 'loading-bottom';
    fixture.componentRef.injector.get(ChangeDetectorRef).detectChanges();

    expect(queryLoadingIndicator('top')).toBeNull();
    expect(queryLoadingIndicator('bottom')).not.toBeNull();
  });

  it('should tell if two messages are on separate dates', () => {
    const messages = generateMockMessages();
    const message = messages[0];
    const nextMessage = messages[1];
    message.created_at = dateToNs(new Date());

    expect(component['checkIfOnSeparateDates'](message, undefined)).toBe(false);

    message.created_at = dateToNs(new Date(2023, 6, 26));
    nextMessage.created_at = dateToNs(new Date(2023, 6, 27));

    expect(component['checkIfOnSeparateDates'](message, nextMessage)).toBe(
      true
    );

    message.created_at = dateToNs(new Date());
    nextMessage.created_at = dateToNs(new Date());

    expect(component['checkIfOnSeparateDates'](message, nextMessage)).toBe(
      false
    );

    message.created_at = dateToNs(new Date(2023, 6, 26));
    nextMessage.created_at = dateToNs(new Date(2023, 7, 26));

    expect(component['checkIfOnSeparateDates'](message, nextMessage)).toBe(
      true
    );
  });

  it('should display date separators', () => {
    const messages = generateMockMessages();
    const message = messages[0];
    const nextMessage = messages[1];

    channelServiceMock.activeChannelMessages$.next([message, nextMessage]);
    fixture.detectChanges();

    expect(queryDateSeparators().length).toBe(1);

    message.created_at = dateToNs(new Date(2013, 6, 26));
    nextMessage.created_at = dateToNs(new Date(2013, 6, 27));

    channelServiceMock.activeChannelMessages$.next([message, nextMessage]);
    fixture.detectChanges();

    const dateSeparators = queryDateSeparators();

    expect(dateSeparators.length).toBe(2);

    expect(dateSeparators[0].textContent).toContain('07/26/2013');
    expect(dateSeparators[1].textContent).toContain('07/27/2013');
  });

  it(`shoud hide date separator if it's turned off`, () => {
    const messages = generateMockMessages();
    const message = messages[0];
    const nextMessage = messages[1];

    message.created_at = dateToNs(new Date(2023, 6, 26));
    nextMessage.created_at = dateToNs(new Date(2023, 6, 27));

    channelServiceMock.activeChannelMessages$.next([message, nextMessage]);
    fixture.detectChanges();

    expect(queryDateSeparators().length).toBe(2);

    component.displayDateSeparator = false;
    fixture.componentRef.injector.get(ChangeDetectorRef).detectChanges();

    expect(queryDateSeparators().length).toBe(0);
  });

  it(`shouldn't reset the scroll state if active channel is updated`, () => {
    spyOn<any>(component, 'resetScrollState');
    channelServiceMock.activeChannel$.next(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      (
        channelServiceMock.activeChannel$ as unknown as BehaviorSubject<any>
      ).getValue()
    );

    expect(component['resetScrollState']).not.toHaveBeenCalled();
  });

  it('should jump to first unread message if openMessageListAt specifies', fakeAsync(() => {
    component.openMessageListAt = 'last-read-message';

    const channel = generateMockChannels()[0];
    const messages = generateMockMessages();
    channel.id = 'test-channel';
    channelServiceMock.activeChannelLastReadMessageId =
      messages[messages.length - 2].id;
    channelServiceMock.activeChannel$.next(channel);
    channelServiceMock.activeChannelMessages$.next(messages);
    tick();

    expect(component.lastReadMessageId).toBe(messages[messages.length - 2].id);

    expect(component.firstUnreadMessageId).toBe(
      messages[messages.length - 1].id
    );

    expect(component.isJumpingToLatestUnreadMessage).toBeTrue();
  }));

  it('should display new message indicator - new mesage is the first on the given day', () => {
    component.openMessageListAt = 'last-read-message';

    const channel = generateMockChannels()[0];
    const messages = generateMockMessages();
    const createdAt = nsToDate(messages[messages.length - 2].created_at);
    createdAt.setDate(createdAt.getDate() + 1);
    messages[messages.length - 2].created_at = dateToNs(createdAt);
    messages[messages.length - 1].user.id = 'not' + mockCurrentUser().id;
    channel.id = 'test-channel';
    channelServiceMock.activeChannelLastReadMessageId =
      messages[messages.length - 2].id;
    channelServiceMock.activeChannel$.next(channel);
    channelServiceMock.activeChannelMessages$.next(messages);
    fixture.detectChanges();

    expect(queryNewMessagesIndicator()).not.toBeNull();
  });

  it('should display new message indicator', () => {
    component.openMessageListAt = 'last-message';

    const channel = generateMockChannels()[0];
    const messages = generateMockMessages();
    const createdAt = nsToDate(messages[messages.length - 2].created_at);
    createdAt.setDate(createdAt.getDate() + 1);
    messages[messages.length - 2].created_at = dateToNs(createdAt);
    messages[messages.length - 1].user.id = 'not' + mockCurrentUser().id;
    channel.id = 'test-channel';
    channelServiceMock.activeChannelLastReadMessageId =
      messages[messages.length - 2].id;
    channelServiceMock.activeChannel$.next(channel);
    channelServiceMock.activeChannelMessages$.next(messages);
    fixture.detectChanges();

    expect(queryNewMessagesIndicator()).not.toBeNull();
  });

  it('should display new message indicator - new mesage is not the first on the given day', () => {
    component.openMessageListAt = 'last-read-message';

    const channel = generateMockChannels()[0];
    const messages = generateMockMessages();
    messages[messages.length - 1].user.id = 'not' + mockCurrentUser().id;
    channel.id = 'test-channel';
    channelServiceMock.activeChannelLastReadMessageId =
      messages[messages.length - 2].id;
    channelServiceMock.activeChannel$.next(channel);
    channelServiceMock.activeChannelMessages$.next(messages);
    fixture.detectChanges();

    expect(queryNewMessagesIndicator()).not.toBeNull();
  });

  it(`shouldn't highlight latest unread message`, () => {
    component.openMessageListAt = 'last-read-message';

    const channel = generateMockChannels()[0];
    const messages = generateMockMessages();
    messages[messages.length - 1].user.id = 'not' + mockCurrentUser().id;
    channel.id = 'test-channel';
    channelServiceMock.activeChannelLastReadMessageId =
      messages[messages.length - 2].id;
    channelServiceMock.activeChannel$.next(channel);
    channelServiceMock.activeChannelMessages$.next(messages);
    fixture.detectChanges();

    expect(component.highlightedMessageId).toBeUndefined();
  });

  it('should display new message indicator - new mesage is not the first on the given day, direction top-to-bottom', () => {
    component.openMessageListAt = 'last-read-message';
    component.direction = 'top-to-bottom';

    const channel = generateMockChannels()[0];
    const messages = generateMockMessages();
    messages[messages.length - 1].user.id = 'not' + mockCurrentUser().id;
    channel.id = 'test-channel';
    channelServiceMock.activeChannelLastReadMessageId =
      messages[messages.length - 2].id;
    channelServiceMock.activeChannel$.next(channel);
    channelServiceMock.activeChannelMessages$.next(messages);
    fixture.detectChanges();

    expect(
      queryMessageComponents()[messages.length - 2].isHighlighted
    ).toBeFalse();
  });

  it('should display new message indicator - new mesage is the first on the given day, direction top-to-bottom', () => {
    component.openMessageListAt = 'last-read-message';
    component.direction = 'top-to-bottom';

    const channel = generateMockChannels()[0];
    const messages = generateMockMessages();
    const createdAt = nsToDate(messages[messages.length - 2].created_at);
    createdAt.setDate(createdAt.getDate() + 1);
    messages[messages.length - 2].created_at = dateToNs(createdAt);
    messages[messages.length - 1].user.id = 'not' + mockCurrentUser().id;
    channel.id = 'test-channel';
    channelServiceMock.activeChannelLastReadMessageId =
      messages[messages.length - 2].id;
    channelServiceMock.activeChannel$.next(channel);
    channelServiceMock.activeChannelMessages$.next(messages);
    fixture.detectChanges();

    expect(queryNewMessagesIndicator()).not.toBeNull();
  });

  it('should display unread banner with correct text', () => {
    const channel = generateMockChannels()[0];
    const messages = generateMockMessages();
    messages[messages.length - 1].user.id = 'not' + mockCurrentUser().id;
    channel.id = 'test-channel';
    channelServiceMock.activeChannelLastReadMessageId =
      messages[messages.length - 2].id;
    channelServiceMock.activeChannelUnreadCount = 2;
    channelServiceMock.activeChannel$.next(channel);
    fixture.detectChanges();

    let newMessagesIndicator = queryNewMessagesIndicator();

    expect(newMessagesIndicator?.innerHTML).toContain('2 unread messages');

    channelServiceMock.activeChannelUnreadCount = 0;
    channelServiceMock.activeChannel$.next(channel);
    fixture.detectChanges();

    newMessagesIndicator = queryNewMessagesIndicator();

    expect(component.unreadCount).toBe(0);
    expect(newMessagesIndicator?.innerHTML).toContain('Unread messages');
  });

  it(`shouldn't display unread banner if #displayUnreadSeparator is false`, () => {
    component.displayUnreadSeparator = false;
    const channel = generateMockChannels()[0];
    const messages = generateMockMessages();
    messages[messages.length - 1].user.id = 'not' + mockCurrentUser().id;
    channel.id = 'test-channel';
    channelServiceMock.activeChannelLastReadMessageId =
      messages[messages.length - 2].id;
    channelServiceMock.activeChannelUnreadCount = 2;
    channelServiceMock.activeChannel$.next(channel);
    fixture.detectChanges();

    expect(queryNewMessagesIndicator()).toBeNull();
  });

  // it('should display unread notification with correct text', async () => {
  //   const channel = generateMockChannels()[0];
  //   const messages = generateMockMessages();
  //   messages[messages.length - 1].user!.id = 'not' + mockCurrentUser().id;
  //   channel.id = 'test-channel';
  //   channelServiceMock.activeChannelLastReadMessageId =
  //     messages[messages.length - 2].id;
  //   channelServiceMock.activeChannelUnreadCount = 2;
  //   channelServiceMock.activeChannel$.next(channel);
  //   fixture.detectChanges();
  //   component.isUnreadNotificationVisible = true;
  //   fixture.detectChanges();
  //   await fixture.whenRenderingDone();
  //   await fixture.whenStable();

  //   let newMessagesIndicator = queryNewMessagesNotification();

  //   expect(component.unreadCount).toBe(2);
  //   expect(newMessagesIndicator?.innerHTML).toContain('2 unread messages');

  //   channelServiceMock.activeChannelUnreadCount = 0;
  //   channelServiceMock.activeChannel$.next(channel);
  //   fixture.detectChanges();
  //   component.isUnreadNotificationVisible = true;
  //   fixture.detectChanges();

  //   newMessagesIndicator = queryNewMessagesNotification();

  //   expect(newMessagesIndicator?.innerHTML).toContain('Unread messages');
  // });

  it('should only display new messages notification if #openMessageListAt is last message', () => {
    component.openMessageListAt = 'last-read-message';
    const channel = generateMockChannels()[0];
    const messages = generateMockMessages();
    messages[messages.length - 1].user.id = 'not' + mockCurrentUser().id;
    channel.id = 'test-channel';
    channelServiceMock.activeChannelLastReadMessageId =
      messages[messages.length - 2].id;
    channelServiceMock.activeChannelUnreadCount = 2;
    channelServiceMock.activeChannel$.next(channel);
    channelServiceMock.activeChannelMessages$.next(messages);
    fixture.detectChanges();

    expect(queryNewMessagesNotification()).toBeNull();
  });

  // it('should jump to message if notification is clicked', async () => {
  //   const channel = generateMockChannels()[0];
  //   const messages = generateMockMessages();
  //   messages[messages.length - 1].user!.id = 'not' + mockCurrentUser().id;
  //   channel.id = 'test-channel';
  //   channelServiceMock.activeChannelLastReadMessageId =
  //     messages[messages.length - 2].id;
  //   channelServiceMock.activeChannelUnreadCount = 2;
  //   channelServiceMock.activeChannel$.next(channel);
  //   channelServiceMock.activeChannelMessages$.next(messages);
  //   fixture.detectChanges();
  //   component.isUnreadNotificationVisible = true;
  //   fixture.detectChanges();
  //   await fixture.whenRenderingDone();
  //   await fixture.whenStable();

  //   const unreadNotification = queryNewMessagesNotification();
  //   const jumpToButton = unreadNotification?.querySelector<HTMLButtonElement>(
  //     '[data-testid="unread-messages-notification-jump-to-message"]'
  //   );

  //   spyOn(component, 'jumpToFirstUnreadMessage');

  //   jumpToButton?.click();

  //   expect(component.jumpToFirstUnreadMessage).toHaveBeenCalledWith();
  // });

  it('should dismiss unread message notification', () => {
    const channel = generateMockChannels()[0];
    const messages = generateMockMessages();
    messages[messages.length - 1].user.id = 'not' + mockCurrentUser().id;
    channel.id = 'test-channel';
    channelServiceMock.activeChannelLastReadMessageId =
      messages[messages.length - 2].id;
    channelServiceMock.activeChannelUnreadCount = 2;
    channelServiceMock.activeChannel$.next(channel);
    channelServiceMock.activeChannelMessages$.next(messages);
    fixture.detectChanges();

    const unreadNotification = queryNewMessagesNotification();
    const dismissButton = unreadNotification?.querySelector<HTMLButtonElement>(
      '[data-testid="unread-messages-notification-dismiss"]'
    );

    dismissButton?.click();
    fixture.detectChanges();

    expect(queryNewMessagesNotification()).toBeNull();
  });

  it('should handle if last message is hard deleted', () => {
    const channel = generateMockChannels()[0];
    const messages = generateMockMessages();
    messages.forEach((m) => (m.cid = channel.cid));
    getPaginator(channel).state.partialNext({ hasMoreHead: false });
    channelServiceMock.activeChannel$.next(channel);
    channelServiceMock.activeChannel = channel;
    channelServiceMock.activeChannelMessages$.next(messages);
    fixture.detectChanges();

    expect(component['isLatestMessageInList']).toBeTrue();

    messages.pop();
    channelServiceMock.activeChannelMessages$.next(messages);
    fixture.detectChanges();

    expect(component['isLatestMessageInList']).toBeTrue();
  });

  it('should tell stream-chat if user sees the latest messages', () => {
    const paginator = getPaginator(channelServiceMock.activeChannel);
    const spy = spyOn(channelServiceMock, 'setIsLatestMessageVisible');
    const messages = generateMockMessages();
    messages.forEach((m) => (m.cid = channelServiceMock.activeChannel!.cid));
    channelServiceMock.activeChannelMessages$.next(messages);
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(true);

    spy.calls.reset();
    const scrollContainer = queryScrollContainer()!;
    scrollContainer.scrollTo({
      top: (scrollContainer.scrollHeight - scrollContainer.clientHeight) / 2,
    });
    scrollContainer.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(false);

    spy.calls.reset();
    component.scrollToBottom();
    scrollContainer.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(true);

    // Not the latest message set is displayed
    spy.calls.reset();
    paginator.state.partialNext({ hasMoreHead: true });
    channelServiceMock.activeChannelMessages$.next([...messages]);
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(false);
    expect(spy).not.toHaveBeenCalledWith(true);
  });

  it(`shouldn't report latest message visibility in thread mode`, () => {
    const spy = spyOn(channelServiceMock, 'setIsLatestMessageVisible');
    component.mode = 'thread';
    component.ngOnChanges({ mode: {} as SimpleChange });
    spy.calls.reset();
    const parent = mockMessage();
    channelServiceMock.activeParentMessage$.next(parent);
    channelServiceMock.activeThreadMessages$.next(
      generateMockMessages().map((m) => ({ ...m, parent_id: parent.id }))
    );
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
  });

  it('should stop viewing live on destroy', () => {
    const spy = spyOn(channelServiceMock, 'setIsLatestMessageVisible');
    fixture.destroy();

    expect(spy).toHaveBeenCalledWith(false);
  });
});
