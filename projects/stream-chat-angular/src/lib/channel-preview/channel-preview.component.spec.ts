import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { Event, UserResponse } from 'stream-chat';
import { AvatarPlaceholderComponent } from '../avatar-placeholder/avatar-placeholder.component';
import { AvatarComponent } from '../avatar/avatar.component';
import { ChannelService } from '../channel.service';
import { ChatClientService, ClientEvent } from '../chat-client.service';
import {
  generateMockChannels,
  mockChannelService,
  MockChannelService,
  mockMessage,
} from '../mocks';
import { ChannelPreviewComponent } from './channel-preview.component';
import { Observable, Subject, of } from 'rxjs';
import { DefaultStreamChatGenerics } from '../types';
import { IconPlaceholderComponent } from '../icon-placeholder/icon-placeholder.component';
import { DateParserService } from '../date-parser.service';

describe('ChannelPreviewComponent', () => {
  let fixture: ComponentFixture<ChannelPreviewComponent>;
  let component: ChannelPreviewComponent;
  let nativeElement: HTMLElement;
  let channelServiceMock: MockChannelService;
  let chatClientServiceMock: {
    chatClient: { user: UserResponse };
    events$: Subject<ClientEvent>;
    user$: Observable<{ id: string }>;
  };
  let queryContainer: () => HTMLElement | null;
  let queryAvatar: () => AvatarPlaceholderComponent;
  let queryTitle: () => HTMLElement | null;
  let queryLatestMessage: () => HTMLElement | null;
  let queryUnreadBadge: () => HTMLElement | null;

  beforeEach(() => {
    channelServiceMock = mockChannelService();
    chatClientServiceMock = {
      events$: new Subject(),
      chatClient: { user: { id: 'currentUser' } },
      user$: of({ id: 'currentUser' }),
    };
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [
        ChannelPreviewComponent,
        AvatarComponent,
        AvatarPlaceholderComponent,
        IconPlaceholderComponent,
      ],
      providers: [
        { provide: ChannelService, useValue: channelServiceMock },
        { provide: ChatClientService, useValue: chatClientServiceMock },
      ],
    });
    fixture = TestBed.createComponent(ChannelPreviewComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement as HTMLElement;
    queryContainer = () =>
      nativeElement.querySelector('[data-testid="channel-preview-container"]');
    queryTitle = () =>
      nativeElement.querySelector('[data-testid="channel-preview-title"]');
    queryAvatar = () =>
      fixture.debugElement.query(By.directive(AvatarPlaceholderComponent))
        .componentInstance as AvatarPlaceholderComponent;
    queryLatestMessage = () =>
      nativeElement.querySelector('[data-testid="latest-message"]');
    queryUnreadBadge = () =>
      nativeElement.querySelector('[data-testid="unread-badge"]');
  });

  it('should apply active class if channel is active', () => {
    const channel = generateMockChannels()[0];
    channelServiceMock.activeChannel$.next(channel);
    component.channel = channel;
    fixture.detectChanges();
    const activeClass = 'str-chat__channel-preview-messenger--active';

    expect(queryContainer()?.classList.contains(activeClass)).toBeTrue();
  });

  it(`shouldn't apply active class if channel isn't active`, () => {
    const channels = generateMockChannels();
    const channel = channels[0];
    const activeChannel = channels[1];
    channelServiceMock.activeChannel$.next(activeChannel);
    component.channel = channel;
    fixture.detectChanges();
    const activeClass = 'str-chat__channel-preview-messenger--active';

    expect(queryContainer()?.classList.contains(activeClass)).toBeFalse();
  });

  it('should apply unread class and display unread badge, if channel has unread messages', () => {
    const channels = generateMockChannels();
    const channel = channels[0];
    channel.id = 'notactive';
    component.channel = channel;
    const countUnreadSpy = spyOn(channel, 'countUnread');
    countUnreadSpy.and.returnValue(0);
    const unreadClass = 'str-chat__channel-preview-messenger--unread';
    const container = queryContainer();
    fixture.detectChanges();

    expect(container?.classList.contains(unreadClass)).toBeFalse();
    expect(queryUnreadBadge()).toBeNull();

    countUnreadSpy.and.returnValue(1);
    const newMessage = mockMessage();
    channel.state.latestMessages.push(newMessage);
    channel.handleEvent('message.new', { message: newMessage });
    fixture.detectChanges();

    expect(container?.classList.contains(unreadClass)).toBeTrue();
    expect(component.unreadCount).toBe(1);
    expect(queryUnreadBadge()?.innerHTML).toContain('1');
  });

  it(`shouldn't apply unread class, if user doesn't have 'read-events' capabilities`, () => {
    const channels = generateMockChannels();
    const channel = channels[0];
    channel.data!.own_capabilities = [];
    component.channel = channel;
    component.ngOnInit();
    const countUnreadSpy = spyOn(channel, 'countUnread');
    countUnreadSpy.and.returnValue(1);
    const unreadClass = 'str-chat__channel-preview-messenger--unread';
    const container = queryContainer();
    fixture.detectChanges();

    expect(container?.classList.contains(unreadClass)).toBeFalse();
    expect(queryUnreadBadge()).toBeNull();
  });

  it('should remove unread class and badge, if user marked channel as read', () => {
    const channels = generateMockChannels();
    const channel = channels[0];
    channel.id = 'notactive';
    component.channel = channel;
    let undreadCount = 3;
    spyOn(channel, 'countUnread').and.callFake(() => undreadCount);
    const unreadClass = 'str-chat__channel-preview-messenger--unread';
    const container = queryContainer();
    fixture.detectChanges();

    expect(container?.classList.contains(unreadClass)).toBeTrue();
    expect(component.unreadCount).toBe(3);
    expect(queryUnreadBadge()?.innerHTML).toContain('3');

    undreadCount = 0;
    channel.handleEvent('message.read', {});
    fixture.detectChanges();

    expect(container?.classList.contains(unreadClass)).toBeFalse();
    expect(queryUnreadBadge()).toBeNull();
  });

  it(`shouldn't set unread state for active channels`, () => {
    const channels = generateMockChannels();
    const channel = channels[0];
    const countUnreadSpy = spyOn(channel, 'countUnread');
    countUnreadSpy.and.returnValue(1);
    component.channel = channel;
    channelServiceMock.activeChannel$.next(channel);
    component.channel = channel;
    component.ngOnInit();

    expect(component.isUnread).toBe(false);
    expect(component.unreadCount).toBe(0);
  });

  it('should set unread state based on `notification.mark_unread`', () => {
    const channels = generateMockChannels();
    const channel = channels[0];
    const countUnreadSpy = spyOn(channel, 'countUnread');
    countUnreadSpy.and.returnValue(1);
    component.channel = channel;
    channelServiceMock.activeChannel$.next(channel);
    component.channel = channel;
    component.ngOnInit();

    expect(component.isUnread).toBe(false);
    expect(component.unreadCount).toBe(0);

    chatClientServiceMock.events$.next({
      eventType: 'notification.mark_unread',
      event: {
        channel_id: channel.id,
      } as Event<DefaultStreamChatGenerics>,
    });

    expect(component.isUnread).toBe(true);
    expect(component.unreadCount).toBe(1);
  });

  it('should set channel as active', () => {
    const channel = generateMockChannels()[0];
    component.channel = channel;
    fixture.detectChanges();
    spyOn(channelServiceMock, 'setAsActiveChannel');
    queryContainer()?.click();
    fixture.detectChanges();

    expect(channelServiceMock.setAsActiveChannel).toHaveBeenCalledWith(channel);
  });

  it('should display channel avatar', () => {
    const channel = generateMockChannels()[0];
    channelServiceMock.activeChannel$.next(channel);
    component.channel = channel;
    fixture.detectChanges();
    const avatar = queryAvatar();

    expect(avatar.imageUrl).toBe(channel.data?.image as string);
    expect(avatar.name).toBe(channel.data?.name);
    expect(avatar.type).toBe('channel');
    expect(avatar.channel).toBe(channel);
    expect(avatar.location).toBe('channel-preview');
  });

  it('should display channel display text', () => {
    const channel = generateMockChannels()[0];
    channel.data!.name = undefined;
    channel.state.members = {
      user1: { user: { id: 'user1', name: 'Ben' } },
      [chatClientServiceMock.chatClient.user.id]: {
        user: { id: chatClientServiceMock.chatClient.user.id },
      },
    };
    component.channel = channel;
    fixture.detectChanges();

    expect(queryTitle()?.textContent).toContain('Ben');
  });

  describe('should display latest message of channel', () => {
    it('if channel has no messages', () => {
      const channel = generateMockChannels()[0];
      channel.state.latestMessages = [];
      channelServiceMock.activeChannel$.next(channel);
      component.channel = channel;
      fixture.detectChanges();

      expect(queryLatestMessage()?.textContent).toContain('Nothing yet...');
    });

    it('initially', () => {
      const channel = generateMockChannels()[0];
      channelServiceMock.activeChannel$.next(channel);
      component.channel = channel;
      fixture.detectChanges();

      expect(queryLatestMessage()?.textContent).toContain(
        channel.state.latestMessages[channel.state.latestMessages.length - 1]
          .text
      );
    });

    it('if last message has attachments', () => {
      const channel = generateMockChannels()[0];
      channel.state.latestMessages[
        channel.state.latestMessages.length - 1
      ].text = undefined;
      channel.state.latestMessages[
        channel.state.latestMessages.length - 1
      ].attachments = [{}];
      channelServiceMock.activeChannel$.next(channel);
      component.channel = channel;
      fixture.detectChanges();

      expect(queryLatestMessage()?.textContent).toContain('🏙 Attachment...');
    });

    it('if channel receives new message', () => {
      const channel = generateMockChannels()[0];
      channelServiceMock.activeChannel$.next(channel);
      component.channel = channel;
      fixture.detectChanges();
      const newMessage = mockMessage();
      newMessage.text = 'this is the text of  new message';
      channel.state.latestMessages.push(newMessage);
      channel.handleEvent('message.new', { message: newMessage });
      fixture.detectChanges();

      expect(queryLatestMessage()?.textContent).toContain(newMessage.text);
    });

    it('if latest message is updated', () => {
      const channel = generateMockChannels()[0];
      channelServiceMock.activeChannel$.next(channel);
      component.channel = channel;
      fixture.detectChanges();
      const updatedMessage = mockMessage();
      updatedMessage.text = 'this is the text of  new message';
      channel.state.latestMessages[channel.state.latestMessages.length - 1] =
        updatedMessage;
      channel.handleEvent('message.updated', { message: updatedMessage });
      fixture.detectChanges();

      expect(queryLatestMessage()?.textContent).toContain(updatedMessage.text);
    });

    it('if latest message is deleted', () => {
      const channel = generateMockChannels()[0];
      channelServiceMock.activeChannel$.next(channel);
      component.channel = channel;
      fixture.detectChanges();
      const deletedMessage = mockMessage();
      deletedMessage.deleted_at = new Date().toISOString();
      channel.state.latestMessages[channel.state.latestMessages.length - 1] =
        deletedMessage;
      channel.handleEvent('message.updated', { message: deletedMessage });
      fixture.detectChanges();

      expect(queryLatestMessage()?.textContent).toContain('Message deleted');
    });
  });

  it(`shouldn't update latest message, if not latest message is updated`, () => {
    const channel = generateMockChannels()[0];
    channelServiceMock.activeChannel$.next(channel);
    component.channel = channel;
    fixture.detectChanges();
    const updatedMessage = mockMessage();
    updatedMessage.text = 'this is the text of  new message';
    channel.state.latestMessages[0] = updatedMessage;
    channel.handleEvent('message.updated', updatedMessage);
    fixture.detectChanges();

    expect(queryLatestMessage()?.textContent).not.toContain(
      updatedMessage.text
    );
  });

  it('should update latest message if channel is truncated', () => {
    const channel = generateMockChannels()[0];
    channelServiceMock.activeChannel$.next(channel);
    component.channel = channel;
    fixture.detectChanges();
    channel.state.latestMessages = [];
    channel.handleEvent('channel.truncated', { type: 'channel.truncated' });
    fixture.detectChanges();

    expect(queryLatestMessage()?.textContent).toContain('Nothing yet...');
  });

  it('should display translated message', () => {
    const channel = generateMockChannels()[0];
    const latestMessage =
      channel.state.latestMessages[channel.state.latestMessages.length - 1];
    latestMessage.i18n = {
      hu_text: 'Hogy vagy?',
      language: 'en',
    };
    latestMessage.user!.id += 'not';
    channel.data!.auto_translation_language = 'hu';
    channelServiceMock.activeChannel$.next(channel);
    component.channel = channel;
    fixture.detectChanges();

    expect(queryLatestMessage()?.textContent).toContain('Hogy vagy?');
  });

  it('should respect #displayAs setting', () => {
    const channel = generateMockChannels()[0];
    component.channel = channel;
    fixture.detectChanges();

    expect(nativeElement.querySelector('[data-testid="html-content"]')).toBe(
      null
    );

    component.displayAs = 'html';
    fixture.detectChanges();

    expect(
      nativeElement.querySelector('[data-testid="html-content"]')
    ).not.toBe(null);
  });

  it('should display last message status', () => {
    const channel = generateMockChannels()[0];
    component.channel = channel;
    fixture.detectChanges();
    const iconComponent = fixture.debugElement.query(
      By.directive(IconPlaceholderComponent)
    )?.componentInstance as IconPlaceholderComponent;

    expect(
      nativeElement.querySelector('[data-testid="latest-message-status"]')
    ).not.toBeNull();

    expect(iconComponent.icon).toBe('delivered-icon');
  });

  it('should set last message status', () => {
    const channel = generateMockChannels()[0];
    const latestMessage =
      channel.state.messages[channel.state.messages.length - 1];
    component.channel = channel;
    fixture.detectChanges();

    expect(component.latestMessage).toBe(latestMessage);

    expect(component.latestMessageStatus).toBe('delivered');

    channel.state.read['otheruser'] = {
      last_read: latestMessage.created_at,
      unread_messages: 0,
      user: { id: 'otheruser' },
    };
    channel.handleEvent('message.read', {
      message: latestMessage,
    });

    expect(component.latestMessageStatus).toBe('read');

    latestMessage.type = 'deleted';
    channel.handleEvent('message.deleted', {
      message: latestMessage,
    });

    expect(component.latestMessageStatus).toBe(undefined);

    latestMessage.type = 'regular';
    latestMessage.user!.id = 'other-user';
    channel.handleEvent('message.updated', {
      message: latestMessage,
    });

    expect(component.latestMessageStatus).toBe(undefined);
  });

  it('should set last message time', () => {
    const dateParser = TestBed.inject(DateParserService);
    spyOn(dateParser, 'parseDate');
    spyOn(dateParser, 'parseTime');

    const channel = generateMockChannels()[0];
    const latestMessage =
      channel.state.messages[channel.state.messages.length - 1];
    latestMessage.created_at = new Date();
    component.channel = channel;
    component.ngOnInit();

    expect(dateParser.parseTime).toHaveBeenCalledWith(latestMessage.created_at);

    latestMessage.created_at = new Date('2024-04-02T03:24:00');
    component.ngOnInit();

    expect(dateParser.parseDate).toHaveBeenCalledWith(latestMessage.created_at);
  });
});
