import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { UserResponse } from 'stream-chat';
import { AvatarPlaceholderComponent } from '../avatar-placeholder/avatar-placeholder.component';
import { AvatarComponent } from '../avatar/avatar.component';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import {
  generateMockChannels,
  mockChannelService,
  MockChannelService,
  mockMessage,
} from '../mocks';
import { ChannelPreviewComponent } from './channel-preview.component';

describe('ChannelPreviewComponent', () => {
  let fixture: ComponentFixture<ChannelPreviewComponent>;
  let component: ChannelPreviewComponent;
  let nativeElement: HTMLElement;
  let channelServiceMock: MockChannelService;
  let chatClientServiceMock: {
    chatClient: { user: UserResponse };
  };
  let queryContainer: () => HTMLElement | null;
  let queryAvatar: () => AvatarPlaceholderComponent;
  let queryTitle: () => HTMLElement | null;
  let queryLatestMessage: () => HTMLElement | null;

  beforeEach(() => {
    channelServiceMock = mockChannelService();
    chatClientServiceMock = {
      chatClient: { user: { id: 'currentUser' } },
    };
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
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

  it('should apply unread class, if channel has unread messages', () => {
    const channels = generateMockChannels();
    const channel = channels[0];
    component.channel = channel;
    const countUnreadSpy = spyOn(channel, 'countUnread');
    countUnreadSpy.and.returnValue(0);
    const unreadClass = 'str-chat__channel-preview-messenger--unread';
    const container = queryContainer();
    fixture.detectChanges();

    expect(container?.classList.contains(unreadClass)).toBeFalse();

    countUnreadSpy.and.returnValue(1);
    const newMessage = mockMessage();
    channel.state.messages.push(newMessage);
    channel.handleEvent('message.new', { message: newMessage });
    fixture.detectChanges();

    expect(container?.classList.contains(unreadClass)).toBeTrue();
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
  });

  it('should remove unread class, if user marked channel as read', () => {
    const channels = generateMockChannels();
    const channel = channels[0];
    component.channel = channel;
    let undreadCount = 1;
    spyOn(channel, 'countUnread').and.callFake(() => undreadCount);
    const unreadClass = 'str-chat__channel-preview-messenger--unread';
    const container = queryContainer();
    fixture.detectChanges();

    expect(container?.classList.contains(unreadClass)).toBeTrue();

    undreadCount = 0;
    channel.handleEvent('message.read', {});
    fixture.detectChanges();

    expect(container?.classList.contains(unreadClass)).toBeFalse();
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

    expect(avatar.name).toBe(channel.data?.name);
    expect(avatar.imageUrl).toBe(channel.data?.image as string);
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
      channel.state.messages = [];
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
        channel.state.messages[channel.state.messages.length - 1].text
      );
    });

    it('if last message has attachments', () => {
      const channel = generateMockChannels()[0];
      channel.state.messages[channel.state.messages.length - 1].text =
        undefined;
      channel.state.messages[channel.state.messages.length - 1].attachments = [
        {},
      ];
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
      channel.state.messages.push(newMessage);
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
      channel.state.messages[channel.state.messages.length - 1] =
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
      channel.state.messages[channel.state.messages.length - 1] =
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
    channel.state.messages[0] = updatedMessage;
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
    channel.state.messages = [];
    channel.handleEvent('channel.truncated', { type: 'channel.truncated' });
    fixture.detectChanges();

    expect(queryLatestMessage()?.textContent).toContain('Nothing yet...');
  });

  it('should use "#" as avatar name fallback', () => {
    const channel = generateMockChannels()[0];
    channel.data!.name = undefined;
    component.channel = channel;
    fixture.detectChanges();

    expect(component.avatarName).toBe('#');
  });

  it('should use the name of the other member if channel only has two members', () => {
    const channel = generateMockChannels()[0];
    channel.data!.name = undefined;
    channel.state.members = {
      otheruser: {
        user_id: 'otheruser',
        user: { id: 'otheruser', name: 'Jack' },
      },
      [chatClientServiceMock.chatClient.user.id]: {
        user_id: chatClientServiceMock.chatClient.user.id,
        user: { id: chatClientServiceMock.chatClient.user.id, name: 'Sara' },
      },
    };
    component.channel = channel;
    fixture.detectChanges();

    expect(component.avatarName).toBe('Jack');

    channel.state.members = {
      otheruser: {
        user_id: 'otheruser',
        user: { id: 'otheruser', name: 'Jack' },
      },
      otheruser2: {
        user_id: 'otheruser2',
        user: { id: 'otheruser2', name: 'Sara' },
      },
    };
    component.channel = channel;
    fixture.detectChanges();

    expect(component.avatarName).toBe('#');
  });
});
