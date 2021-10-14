import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { Channel, UserResponse } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import { generateMockChannels, mockCurrentUser } from '../mocks';
import { MessageInputComponent } from './message-input.component';

describe('MessageInputComponent', () => {
  let nativeElement: HTMLElement;
  let component: MessageInputComponent;
  let fixture: ComponentFixture<MessageInputComponent>;
  let queryTextarea: () => HTMLTextAreaElement | null;
  let querySendButton: () => HTMLButtonElement | null;
  let mockActiveChannel$: BehaviorSubject<Channel>;
  let sendMessageSpy: jasmine.Spy;
  let channel: Channel;
  let user: UserResponse;

  beforeEach(() => {
    channel = generateMockChannels(1)[0];
    mockActiveChannel$ = new BehaviorSubject(channel);
    user = mockCurrentUser();
    sendMessageSpy = jasmine.createSpy();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [MessageInputComponent],
      providers: [
        {
          provide: ChannelService,
          useValue: {
            activeChannel$: mockActiveChannel$,
            sendMessage: sendMessageSpy,
          },
        },
        {
          provide: ChatClientService,
          useValue: { chatClient: { user } },
        },
      ],
    });
    fixture = TestBed.createComponent(MessageInputComponent);
    component = fixture.componentInstance;
    spyOn(component, 'messageSent').and.callThrough();
    nativeElement = fixture.nativeElement as HTMLElement;
    queryTextarea = () =>
      nativeElement.querySelector('[data-testid="textarea"]');
    querySendButton = () =>
      nativeElement.querySelector('[data-testid="send-button"]');
    fixture.detectChanges();
  });

  it('should display textarea, and focus it', () => {
    const textarea = queryTextarea();

    expect(textarea).not.toBeNull();
    expect(textarea?.hasAttribute('autofocus')).toBeTrue();
  });

  it('should send message if enter is hit', () => {
    const textarea = queryTextarea();
    const message = 'This is my message';
    textarea!.value = message;
    const event = new KeyboardEvent('keyup', { key: 'Enter' });
    spyOn(event, 'preventDefault');
    textarea?.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.messageSent).toHaveBeenCalledWith(event);
    expect(event.preventDefault).toHaveBeenCalledWith();
  });

  it('should send message if button is clicked', () => {
    const textarea = queryTextarea();
    const message = 'This is my message';
    textarea!.value = message;
    querySendButton()?.click();
    fixture.detectChanges();

    expect(component.messageSent).toHaveBeenCalledWith();
  });

  it(`shouldn't send message if shift+enter is hit`, () => {
    const textarea = queryTextarea();
    textarea!.value = 'This is my message';
    textarea?.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Enter', shiftKey: true })
    );
    fixture.detectChanges();

    expect(component.messageSent).not.toHaveBeenCalled();
  });

  it('should send message', () => {
    const message = 'This is my message';
    queryTextarea()!.value = message;
    component.messageSent();
    fixture.detectChanges();

    expect(sendMessageSpy).toHaveBeenCalledWith(message);
  });

  it('reset textarea after message is sent', () => {
    const textarea = queryTextarea();
    const message = 'This is my message';
    textarea!.value = message;
    component.messageSent();
    fixture.detectChanges();

    expect(textarea?.value).toBe('');
  });
});
