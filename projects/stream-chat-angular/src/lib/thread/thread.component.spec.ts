import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { Channel } from 'stream-chat';
import { ChatClientService } from '../chat-client.service';
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
  let channelServiceMock: MockChannelService;
  let channel: Channel<DefaultStreamChatGenerics>;

  beforeEach(async () => {
    channelServiceMock = mockChannelService();
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [ThreadComponent, MessageListComponent],
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
    channel = generateMockChannels()[0] as Channel<DefaultStreamChatGenerics>;
    channelServiceMock.activeChannel$.next(channel);
    fixture.detectChanges();
  });

  it('should display channel name', () => {
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
