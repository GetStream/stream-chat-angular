import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import {
  Channel,
  dateToNs,
  nsToDate,
  Event,
  LocalMessage,
  UserResponse,
} from 'stream-chat';
import { AvatarPlaceholderComponent } from '../avatar-placeholder/avatar-placeholder.component';
import { AvatarComponent } from '../avatar/avatar.component';
import { ChannelService } from '../channel.service';
import { ChatClientService, ClientEvent } from '../chat-client.service';
import {
  generateMockChannels,
  mockChannelService,
  MockChannelService,
  MockChannel,
  mockMessage,
  MockStateStore,
} from '../mocks';
import { toLocalMessage } from '../local-message';
import { ChannelPreviewComponent } from './channel-preview.component';
import { Observable, Subject, of } from 'rxjs';
import { DateParserService } from '../date-parser.service';
import { IconModule } from '../icon/icon.module';
import { IconPlaceholderComponent } from '../icon/icon-placeholder/icon-placeholder.component';

const getLastMessage = (channel: MockChannel) => {
  const items = channel.messagePaginator.items!;
  return items[items.length - 1];
};

const updateLastMessage = (
  channel: MockChannel,
  update: (message: LocalMessage) => LocalMessage
) => {
  const items = [...channel.messagePaginator.items!];
  items[items.length - 1] = update(items[items.length - 1]);
  channel.messagePaginator.setItems(items);
};

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
      chatClient: { user: { id: 'currentUser' } as UserResponse },
      user$: of({ id: 'currentUser' }),
    };
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), IconModule],
      declarations: [
        ChannelPreviewComponent,
        AvatarComponent,
        AvatarPlaceholderComponent,
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
    newMessage.id = 'new-message';
    channel.messagePaginator.ingestItem(toLocalMessage(newMessage));
    fixture.detectChanges();

    expect(container?.classList.contains(unreadClass)).toBeTrue();
    expect(component.unreadCount).toBe(1);
    expect(queryUnreadBadge()?.innerHTML).toContain('1');
  });

  it('should update unread badge, if unread count is updated after the latest message', () => {
    const channels = generateMockChannels();
    const channel = channels[0];
    channel.id = 'notactive';
    component.channel = channel;
    // stream-chat derives the unread count from the read state
    spyOn(channel, 'countUnread').and.callFake(
      () =>
        (
          channel.state as unknown as MockStateStore<Channel['state']>
        ).getLatestValue().read['currentUser']?.unread_messages ?? 0
    );
    fixture.detectChanges();

    expect(queryUnreadBadge()).toBeNull();

    // On message.new stream-chat updates the latest message first, then the read state
    const newMessage = mockMessage();
    newMessage.id = 'new-message';
    channel.messagePaginator.ingestItem(toLocalMessage(newMessage));
    fixture.detectChanges();

    expect(queryUnreadBadge()).toBeNull();

    (channel.state as unknown as MockStateStore<Channel['state']>).partialNext({
      read: {
        currentUser: {
          unread_messages: 1,
        },
      } as unknown as Channel['state']['read'],
    });
    fixture.detectChanges();

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
        type: 'notification.mark_unread',
        channel_id: channel.id,
      } as Event,
    });

    expect(component.isUnread).toBe(true);
    expect(component.unreadCount).toBe(1);
  });

  it(`should keep unread state of active channel after 'notification.mark_unread', if other user reads the channel`, () => {
    const channels = generateMockChannels();
    const channel = channels[0];
    spyOn(channel, 'countUnread').and.returnValue(1);
    component.channel = channel;
    channelServiceMock.activeChannel$.next(channel);
    component.ngOnInit();
    chatClientServiceMock.events$.next({
      eventType: 'notification.mark_unread',
      event: {
        type: 'notification.mark_unread',
        channel_id: channel.id,
      } as Event,
    });

    expect(component.isUnread).toBe(true);

    channel.handleEvent('message.read', { user: { id: 'otherUser' } });

    expect(component.isUnread).toBe(true);
    expect(component.unreadCount).toBe(1);

    channel.handleEvent('message.read', { user: { id: 'currentUser' } });

    expect(component.isUnread).toBe(false);
    expect(component.unreadCount).toBe(0);
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

    expect(avatar.imageUrl).toBe(channel.data?.custom?.image as string);
    expect(avatar.name).toBe(channel.data?.custom?.name);
    expect(avatar.type).toBe('channel');
    expect(avatar.channel).toBe(channel);
    expect(avatar.location).toBe('channel-preview');
  });

  it('should display channel display text', () => {
    const channel = generateMockChannels()[0];
    channel.data!.custom!.name = undefined;
    channel.state.members = {
      user1: { user: { id: 'user1', name: 'Ben' } },
      [chatClientServiceMock.chatClient.user.id]: {
        user: { id: chatClientServiceMock.chatClient.user.id },
      },
    } as unknown as MockChannel['state']['members'];
    component.channel = channel;
    fixture.detectChanges();

    expect(queryTitle()?.textContent).toContain('Ben');
  });

  describe('should display latest message of channel', () => {
    it('if channel has no messages', () => {
      const channel = generateMockChannels()[0];
      channel.messagePaginator.setItems([]);
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
        getLastMessage(channel).text
      );
    });

    it('if last message has attachments', () => {
      const channel = generateMockChannels()[0];
      updateLastMessage(channel, (m) => ({
        ...m,
        text: '',
        attachments: [{ custom: {} }],
      }));
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
      newMessage.id = 'new-message';
      newMessage.text = 'this is the text of  new message';
      channel.messagePaginator.ingestItem(toLocalMessage(newMessage));
      fixture.detectChanges();

      expect(queryLatestMessage()?.textContent).toContain(newMessage.text);
    });

    it('if latest message is updated', () => {
      const channel = generateMockChannels()[0];
      channelServiceMock.activeChannel$.next(channel);
      component.channel = channel;
      fixture.detectChanges();
      const updatedMessage = {
        ...getLastMessage(channel),
        text: 'this is the text of  new message',
      };
      channel.messagePaginator.ingestItem(updatedMessage);
      fixture.detectChanges();

      expect(queryLatestMessage()?.textContent).toContain(updatedMessage.text);
    });

    it('if latest message is deleted', () => {
      const channel = generateMockChannels()[0];
      channelServiceMock.activeChannel$.next(channel);
      component.channel = channel;
      fixture.detectChanges();
      const deletedMessage = {
        ...getLastMessage(channel),
        deleted_at: dateToNs(new Date()),
      };
      channel.messagePaginator.ingestItem(deletedMessage);
      fixture.detectChanges();

      expect(queryLatestMessage()?.textContent).toContain('Message deleted');
    });
  });

  it(`shouldn't update latest message, if not latest message is updated`, () => {
    const channel = generateMockChannels()[0];
    channelServiceMock.activeChannel$.next(channel);
    component.channel = channel;
    fixture.detectChanges();
    const updatedMessage = {
      ...channel.messagePaginator.items![0],
      text: 'this is the text of  new message',
    };
    channel.messagePaginator.ingestItem(updatedMessage);
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
    // stream-chat clears the paginator on truncate
    channel.messagePaginator.setItems([]);
    fixture.detectChanges();

    expect(queryLatestMessage()?.textContent).toContain('Nothing yet...');
  });

  it('should display translated message', () => {
    const channel = generateMockChannels()[0];
    updateLastMessage(channel, (m) => ({
      ...m,
      i18n: {
        hu_text: 'Hogy vagy?',
        language: 'en',
      },
      user: { ...m.user, id: m.user.id + 'not' },
    }));
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

    expect(iconComponent.icon).toBe('delivered');
  });

  it('should set last message status', () => {
    const channel = generateMockChannels()[0];
    const latestMessage = getLastMessage(channel);
    component.channel = channel;
    fixture.detectChanges();

    expect(component.latestMessage?.id).toBe(latestMessage.id);
    expect(component.latestMessage?.created_at).toEqual(jasmine.any(Number));

    expect(component.latestMessageStatus).toBe('delivered');

    // stream-chat updates the read state (and the read receipts) on message.read events
    (channel.state as unknown as MockStateStore<Channel['state']>).partialNext({
      read: {
        otheruser: {
          last_read: latestMessage.created_at,
          unread_messages: 0,
          user: { id: 'otheruser' },
        },
      } as unknown as Channel['state']['read'],
    });

    expect(component.latestMessageStatus).toBe('read');

    channel.messagePaginator.ingestItem({ ...latestMessage, type: 'deleted' });

    expect(component.latestMessageStatus).toBe(undefined);

    channel.messagePaginator.ingestItem({
      ...latestMessage,
      type: 'regular',
      user: { ...latestMessage.user, id: 'other-user' },
    });

    expect(component.latestMessageStatus).toBe(undefined);
  });

  it('should set last message time', () => {
    const dateParser = TestBed.inject(DateParserService);
    spyOn(dateParser, 'parseDate');
    spyOn(dateParser, 'parseTime');

    const channel = generateMockChannels()[0];
    const now = new Date();
    updateLastMessage(channel, (m) => ({ ...m, created_at: dateToNs(now) }));
    component.channel = channel;
    component.ngOnInit();

    // stream-chat's nsToMs floors, so a Date -> ns -> Date round trip can lose 1ms
    expect(dateParser.parseTime).toHaveBeenCalledWith(nsToDate(dateToNs(now)));

    const earlier = new Date('2024-04-02T03:24:00');
    updateLastMessage(channel, (m) => ({
      ...m,
      created_at: dateToNs(earlier),
    }));

    expect(dateParser.parseDate).toHaveBeenCalledWith(earlier);
  });
});
