import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormatMessageResponse, UserResponse } from 'stream-chat';
import {
  DefaultAttachmentType,
  DefaultChannelType,
  DefaultCommandType,
  DefaultMessageType,
  DefaultReactionType,
  DefaultUserType,
  StreamMessage,
} from '../types';
import { LoadingIndicatorComponent } from '../loading-indicator/loading-indicator.component';
import { MessageComponent } from './message.component';
import { AvatarComponent } from '../avatar/avatar.component';
import { ChatClientService } from '../chat-client.service';

describe('MessageComponent', () => {
  let component: MessageComponent;
  let fixture: ComponentFixture<MessageComponent>;
  let nativeElement: HTMLElement;
  let message: StreamMessage;
  let currentUser: UserResponse<DefaultUserType>;
  let queryContainer: () => HTMLElement | null;
  let querySender: () => HTMLElement | null;
  let queryDate: () => HTMLElement | null;
  let querySendingIndicator: () => HTMLElement | null;
  let queryDeliveredIndicator: () => HTMLElement | null;
  let queryReadIndicator: () => HTMLElement | null;
  let queryReadByCounter: () => HTMLElement | null;
  let queryAvatar: () => HTMLElement | null;
  let queryLastReadUserAvatar: () => HTMLElement | null;

  beforeEach(() => {
    currentUser = { id: 'currentUser', name: 'Bob', image: 'link/to/photo' };
    TestBed.configureTestingModule({
      declarations: [
        MessageComponent,
        AvatarComponent,
        LoadingIndicatorComponent,
      ],
      providers: [
        {
          provide: ChatClientService,
          useValue: { chatClient: { user: currentUser } },
        },
      ],
    });
    fixture = TestBed.createComponent(MessageComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement as HTMLElement;
    queryContainer = () =>
      nativeElement.querySelector('[data-testid="message-container"]');
    querySender = () => nativeElement.querySelector('[data-testid="sender"]');
    queryDate = () => nativeElement.querySelector('[data-testid="date"]');
    querySendingIndicator = () =>
      nativeElement.querySelector('[data-testid="sending-indicator"]');
    queryDeliveredIndicator = () =>
      nativeElement.querySelector('[data-testid="delivered-indicator"]');
    queryReadIndicator = () =>
      nativeElement.querySelector('[data-testid="read-indicator"]');
    queryReadByCounter = () =>
      nativeElement.querySelector('[data-test-id="read-by-length"]');
    queryAvatar = () => nativeElement.querySelector('[data-testid="avatar"]');
    queryLastReadUserAvatar = () =>
      nativeElement.querySelector('[data-test-id="last-read-user-avatar"]');
    message = {
      id: 'id',
      text: 'Hello from Angular SDK',
      user: currentUser,
      type: 'regular',
      status: 'received',
      created_at: new Date('2021-09-14T13:08:30.004112Z'),
      readBy: [{ id: 'alice', name: 'Alice' }],
    } as FormatMessageResponse<
      DefaultAttachmentType,
      DefaultChannelType,
      DefaultCommandType,
      DefaultMessageType,
      DefaultReactionType,
      DefaultUserType
    >;
    component.message = message;
    fixture.detectChanges();
  });

  it('should apply the correct CSS classes based on #message', () => {
    const container = queryContainer();
    let classList = container?.classList;

    expect(
      classList?.contains(`str-chat__message--${message.type as string}`)
    ).toBeTrue();

    expect(
      classList?.contains(`str-chat__message--${message.status}`)
    ).toBeTrue();

    expect(classList?.contains('str-chat__message--has-text')).toBeTrue();
    expect(classList?.contains('str-chat__message--me')).toBeTrue();
    expect(classList?.contains('str-chat__message-simple--me')).toBeTrue();

    message.user = { id: 'notcurrentUser', name: 'Jane' };
    fixture.detectChanges();
    classList = container?.classList;

    expect(classList?.contains('str-chat__message--me')).toBeFalse();
    expect(classList?.contains('str-chat__message-simple--me')).toBeFalse();
  });

  describe('should display the correct message status', () => {
    it('if message is being sent', () => {
      let indicator = querySendingIndicator();

      expect(indicator).toBeNull();

      message.status = 'sending';
      fixture.detectChanges();

      indicator = querySendingIndicator();

      expect(indicator).not.toBeNull();
      expect(
        nativeElement.querySelector('[data-testid="loading-indicator"]')
      ).not.toBeNull();
    });

    it('if message is delivered', () => {
      component.message = { ...message, ...{ readBy: [] } };
      fixture.detectChanges();
      const deliveredIndicator = queryDeliveredIndicator();
      const icon = nativeElement.querySelector(
        '[data-testid="delivered-icon"]'
      );
      const readIndicator = queryReadIndicator();

      expect(deliveredIndicator).not.toBeNull();
      expect(icon).not.toBeNull();
      expect(readIndicator).toBeNull();
    });

    it('if message is read - only read by one user', () => {
      const readIndicator = queryReadIndicator();
      const deliveredIndicator = queryDeliveredIndicator();

      expect(readIndicator).not.toBeNull();
      expect(deliveredIndicator).toBeNull();

      expect(
        nativeElement.querySelector('[data-testid="read-by-tooltip"]')
          ?.textContent
      ).toContain(message.readBy[0].name);

      expect(queryLastReadUserAvatar()).not.toBeNull();

      expect(queryReadByCounter()).toBeNull();
    });

    it('if message is read - read by multiple user', () => {
      const readBy = [
        { id: 'sara', name: 'Sara' },
        { id: 'jack', name: 'Jack' },
      ];
      component.message = {
        ...message,
        ...{
          readBy,
        },
      };
      fixture.detectChanges();
      const readByCounter = queryReadByCounter();

      expect(readByCounter?.textContent).toContain(readBy.length);

      expect(component.lastReadUser?.id).toBe(readBy[0].id);
    });

    it('but only for messages sent by the current user', () => {
      message.user = { id: 'notcurrentuser', name: 'Daniel' };
      fixture.detectChanges();

      expect(querySendingIndicator()).toBeNull();
      expect(queryDeliveredIndicator()).toBeNull();
      expect(queryReadIndicator()).toBeNull();
    });
  });

  it('should display avatar', () => {
    const senderName = 'Alice';
    const senderImage = 'link/to/profile/photo';
    component.message = {
      ...message,
      ...{ user: { id: 'id', name: senderName, image: senderImage } },
    };
    fixture.detectChanges();
    const avatar = queryAvatar();

    expect(avatar?.innerHTML).toContain(senderName);
    expect(avatar?.innerHTML).toContain(senderImage);
  });

  it('should use user id as a fallback if name is not provided', () => {
    const userWithoutName = {
      id: 'userwithoutname',
      image: 'photo/about/user',
    };
    delete currentUser.name;
    component.message = {
      ...message,
      ...{ readBy: [userWithoutName] },
    };
    fixture.detectChanges();

    expect(queryAvatar()?.innerHTML).toContain(currentUser.id);
    expect(queryLastReadUserAvatar()?.innerHTML).toContain(userWithoutName.id);

    component.message = {
      ...message,
      ...{ user: userWithoutName },
    };
    fixture.detectChanges();

    expect(queryAvatar()?.innerHTML).toContain(userWithoutName.id);
    expect(querySender()?.innerHTML).toContain(userWithoutName.id);
  });

  it('should display text message', () => {
    expect(
      nativeElement.querySelector('[data-testid="text"]')?.textContent
    ).toContain(message.text);
  });

  describe('should display error message', () => {
    let queryErrorMessage: () => HTMLElement | null;
    let queryClientErrorMessage: () => HTMLElement | null;

    beforeEach(() => {
      queryErrorMessage = () =>
        nativeElement.querySelector('[data-testid="error-message"]');
      queryClientErrorMessage = () =>
        nativeElement.querySelector('[data-testid="client-error-message"]');
    });

    it('if unathorized to send', () => {
      expect(queryErrorMessage()).toBeNull();

      component.message = {
        ...message,
        ...{ errorStatusCode: 403, status: 'failed' },
      };
      fixture.detectChanges();
      const errorMessage = queryErrorMessage();

      expect(errorMessage).not.toBeNull();
      expect(errorMessage!.textContent).toContain('Unauthorized');
    });

    it('if error occured during send', () => {
      expect(queryErrorMessage()).toBeNull();

      component.message = {
        ...message,
        ...{ errorStatusCode: 500, status: 'failed' },
      };
      fixture.detectChanges();
      const errorMessage = queryErrorMessage();

      expect(errorMessage).not.toBeNull();
      expect(querySendingIndicator()).toBeNull();
      expect(queryDeliveredIndicator()).toBeNull();
      expect(queryReadIndicator()).toBeNull();
      expect(errorMessage!.textContent).toContain('Message failed');
      expect(errorMessage!.textContent).not.toContain('Unauthorized');
    });

    it('if message was not sent due to client error', () => {
      expect(queryClientErrorMessage()).toBeNull();

      component.message = {
        ...message,
        ...{ type: 'error' },
      };
      fixture.detectChanges();
      const clientErrorMessage = queryClientErrorMessage();

      expect(clientErrorMessage).not.toBeNull();
      expect(clientErrorMessage!.textContent).toContain('Message not sent');
    });
  });

  it('should display message sender and date', () => {
    const sender = { id: 'sender', name: 'Jack' };
    component.message = { ...message, ...{ user: sender } };
    fixture.detectChanges();
    const senderElement = querySender();
    const dateElement = queryDate();

    expect(senderElement?.textContent).toContain(sender.name);
    expect(dateElement?.textContent).toContain('09/14/2021');
  });

  it('should display message date if message was sent by current user', () => {
    const senderElement = querySender();
    const dateElement = queryDate();

    expect(senderElement).toBeNull();
    expect(dateElement?.textContent).toContain('09/14/2021');
  });
});
