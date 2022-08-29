import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { Channel, UserResponse } from 'stream-chat';
import { AvatarPlaceholderComponent } from '../avatar-placeholder/avatar-placeholder.component';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import { StreamI18nService } from '../stream-i18n.service';
import { DefaultStreamChatGenerics } from '../types';
import { ChannelHeaderComponent } from './channel-header.component';

describe('ChannelHeaderComponent', () => {
  let fixture: ComponentFixture<ChannelHeaderComponent>;
  let nativeElement: HTMLElement;
  let queryName: () => HTMLElement | null;
  let queryInfo: () => HTMLElement | null;
  let queryAvatar: () => AvatarPlaceholderComponent;
  let channelServiceMock: {
    activeChannel$: Subject<Channel>;
  };
  let chatClientServiceMock: {
    chatClient: { user: UserResponse };
  };

  beforeEach(() => {
    channelServiceMock = {
      activeChannel$: new Subject(),
    };
    chatClientServiceMock = {
      chatClient: { user: { id: 'currentUser' } },
    };
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [ChannelHeaderComponent, AvatarPlaceholderComponent],
      providers: [
        { provide: ChannelService, useValue: channelServiceMock },
        { provide: ChatClientService, useValue: chatClientServiceMock },
      ],
    });
    TestBed.inject(StreamI18nService).setTranslation();
    fixture = TestBed.createComponent(ChannelHeaderComponent);
    fixture.detectChanges();
    nativeElement = fixture.nativeElement as HTMLElement;
    queryName = () => nativeElement.querySelector('[data-testid="name"]');
    queryInfo = () => nativeElement.querySelector('[data-testid="info"]');
    queryAvatar = () =>
      fixture.debugElement.query(By.directive(AvatarPlaceholderComponent))
        .componentInstance as AvatarPlaceholderComponent;
  });

  it('should display members count', () => {
    channelServiceMock.activeChannel$.next({
      data: { member_count: 6 },
      state: {},
    } as any as Channel);
    fixture.detectChanges();

    expect(queryInfo()?.textContent).toContain('6 members');
  });

  it('should display channel display text', () => {
    channelServiceMock.activeChannel$.next({
      state: {
        members: {
          user1: { user: { id: 'user1', name: 'Ben' } },
          [chatClientServiceMock.chatClient.user.id]: {
            user: { id: chatClientServiceMock.chatClient.user.id },
          },
        },
      },
    } as any as Channel);
    fixture.detectChanges();

    expect(queryName()?.textContent).toContain('Ben');
  });

  it('should display watcher count', () => {
    channelServiceMock.activeChannel$.next({
      data: { own_capabilities: ['connect-events'] },
      state: { watcher_count: 5 },
    } as any as Channel);
    fixture.detectChanges();

    expect(queryInfo()?.textContent).toContain('5 online');
  });

  it(`shouldn't display watcher count, if user dosen't have the necessary capability`, () => {
    channelServiceMock.activeChannel$.next({
      data: { own_capabilities: [] },
      state: { watcher_count: 5 },
    } as any as Channel);
    fixture.detectChanges();

    expect(queryInfo()?.textContent).not.toContain('5 online');
  });

  it('should display avatar component', () => {
    const channel = {
      id: 'running-club',
      data: {
        name: 'Running club',
        image: 'http://url/to/img',
      },
    } as any as Channel;
    channelServiceMock.activeChannel$.next(channel);
    const avatar = queryAvatar();
    fixture.detectChanges();

    expect(avatar.name).toBe('Running club');
    expect(avatar.imageUrl).toBe('http://url/to/img');
    expect(avatar.type).toBe('channel');
    expect(avatar.location).toBe('channel-header');
    expect(avatar.channel).toBe(
      channel as any as Channel<DefaultStreamChatGenerics>
    );
  });
});
