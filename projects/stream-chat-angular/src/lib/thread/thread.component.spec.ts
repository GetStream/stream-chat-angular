import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ChannelService } from '../channel.service';
import { MessageListComponent } from '../message-list/message-list.component';
import { mockChannelService, MockChannelService, mockMessage } from '../mocks';

import { ThreadComponent } from './thread.component';

describe('ThreadComponent', () => {
  let component: ThreadComponent;
  let fixture: ComponentFixture<ThreadComponent>;
  let queryReplyCount: () => HTMLElement | null;
  let queryCloseButton: () => HTMLElement | null;
  let channelServiceMock: MockChannelService;

  beforeEach(async () => {
    channelServiceMock = mockChannelService();
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [ThreadComponent, MessageListComponent],
      providers: [{ provide: ChannelService, useValue: channelServiceMock }],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ThreadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;
    queryReplyCount = () =>
      nativeElement.querySelector('[data-testid="reply-count"]');
    queryCloseButton = () =>
      nativeElement.querySelector('[data-testid="close-button"]');
  });

  it('should show reply count', () => {
    const message = mockMessage();
    message.id = 'parent-message';
    message.reply_count = 5;
    channelServiceMock.activeChannelMessages$.next([message]);
    channelServiceMock.activeParentMessage$.next(message);
    fixture.detectChanges();

    expect(component.getReplyCountParam(message).replyCount).toBe(5);
    expect(queryReplyCount()?.innerHTML).toContain(
      'streamChat.{{ replyCount }} replies'
    );
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
