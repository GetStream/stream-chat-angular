import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { Channel } from 'stream-chat';
import { ChatClientService } from '../chat-client.service';
import { AvatarPlaceholderComponent } from '../avatar-placeholder/avatar-placeholder.component';
import { ChannelService } from '../channel.service';
import { MessageListComponent } from '../message-list/message-list.component';
import {
  generateMockChannels,
  mockChannelService,
  MockChannelService,
  mockMessage,
} from '../mocks';
import { DefaultStreamChatGenerics } from '../types';

import { ThreadComponent } from './thread.component';

describe('ThreadComponent', () => {
  let fixture: ComponentFixture<ThreadComponent>;
  let queryCloseButton: () => HTMLElement | null;
  let queryAvatar: () => AvatarPlaceholderComponent;
  let channelServiceMock: MockChannelService;
  let channel: Channel<DefaultStreamChatGenerics>;

  beforeEach(async () => {
    channelServiceMock = mockChannelService();
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [
        ThreadComponent,
        MessageListComponent,
        AvatarPlaceholderComponent,
      ],
      providers: [
        { provide: ChannelService, useValue: channelServiceMock },
        {
          provide: ChatClientService,
          useValue: { chatClient: { user: { id: 'userid' } } },
        },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ThreadComponent);
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;
    queryCloseButton = () =>
      nativeElement.querySelector('[data-testid="close-button"]');
    queryAvatar = () =>
      fixture.debugElement.query(By.directive(AvatarPlaceholderComponent))
        .componentInstance as AvatarPlaceholderComponent;
    channel = generateMockChannels()[0] as Channel<DefaultStreamChatGenerics>;
    channelServiceMock.activeChannel$.next(channel);
    fixture.detectChanges();
  });

  it('should display channel name and avatar', () => {
    const avatar = queryAvatar();

    expect(avatar.location).toBe('thread-header');
    expect(avatar.channel!.id).toBe(channel.id);

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="channel-name"]'
      )!.innerHTML
    ).toContain(channel.data?.name!);
  });

  it('should close thread', () => {
    const message = mockMessage();
    message.id = 'parent-message';
    channelServiceMock.activeChannelMessages$.next([message]);
    channelServiceMock.activeParentMessage$.next(message);
    spyOn(channelServiceMock, 'setAsActiveParentMessage');
    queryCloseButton()?.click();
    fixture.detectChanges();

    expect(channelServiceMock.setAsActiveParentMessage).toHaveBeenCalledWith(
      undefined
    );
  });
});
