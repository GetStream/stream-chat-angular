import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Channel } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import { MessageComponent } from '../message/message.component';
import {
  MockChannelService,
  mockChannelService,
  mockCurrentUser,
  mockMessage,
} from '../mocks';
import { MessageListComponent } from './message-list.component';

describe('MessageListComponent', () => {
  let component: MessageListComponent;
  let fixture: ComponentFixture<MessageListComponent>;
  let nativeElement: HTMLElement;
  let channelServiceMock: MockChannelService;
  let queryScrollContainer: () => HTMLElement | null;
  let queryMessageComponents: () => MessageComponent[];
  let queryScrollToBottomButton: () => HTMLElement | null;

  beforeEach(fakeAsync(() => {
    channelServiceMock = mockChannelService();
    TestBed.configureTestingModule({
      declarations: [MessageComponent, MessageListComponent],
      providers: [
        { provide: ChannelService, useValue: channelServiceMock },
        {
          provide: ChatClientService,
          useValue: { chatClient: { user: mockCurrentUser() } },
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
        .queryAll(By.directive(MessageComponent))
        .map((e) => e.componentInstance as MessageComponent);
    queryScrollToBottomButton = () =>
      nativeElement.querySelector('[data-testid="scroll-to-bottom"]');
    fixture.detectChanges();
    const scrollContainer = queryScrollContainer()!;
    scrollContainer.style.maxHeight = '1000px';
    scrollContainer.style.overflowY = 'auto';
    tick(600);
    fixture.detectChanges();
  }));

  it('should display messages', () => {
    const messagesComponents = queryMessageComponents();
    const messages = channelServiceMock.activeChannelMessages$.getValue();

    expect(messagesComponents.length).toBe(messages.length);
    messagesComponents.forEach((m, i) => expect(m.message).toBe(messages[i]));
  });

  it('should scroll to bottom, after loading the messages', () => {
    const scrollContainer = queryScrollContainer()!;

    expect(scrollContainer.scrollTop).not.toBe(0);
    expect(scrollContainer.scrollTop).toBe(
      scrollContainer.scrollHeight - scrollContainer.clientHeight
    );
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

  it('should load more messages, if user scrolls up', () => {
    spyOn(channelServiceMock, 'loadMoreMessages');

    const scrollContainer = queryScrollContainer()!;
    scrollContainer.scrollTo({ top: 0 });
    scrollContainer.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(channelServiceMock.loadMoreMessages).toHaveBeenCalledWith();
  });

  it('should handle channel change', () => {
    component.unreadMessageCount = 3;
    component.isUserScrolledUp = true;
    channelServiceMock.activeChannel$.next({ id: 'nextchannel' } as Channel);
    channelServiceMock.activeChannelMessages$.next([]);
    fixture.detectChanges();

    expect(component.unreadMessageCount).toBe(0);
    expect(component.isUserScrolledUp).toBeFalse();
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
      expect(queryScrollToBottomButton()).toBeNull();

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

      expect(queryScrollToBottomButton()?.textContent).toContain('1');
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

    it('should display scroll to bottom button', fakeAsync(() => {
      const scrollContainer = queryScrollContainer()!;
      scrollContainer.scrollTo({
        top: (scrollContainer.scrollHeight - scrollContainer.clientHeight) / 2,
      });
      scrollContainer.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();
      queryScrollToBottomButton()?.click();
      fixture.detectChanges();

      expect(scrollContainer.scrollTop + scrollContainer.clientHeight).toBe(
        scrollContainer.scrollHeight
      );
    }));
  });
});
