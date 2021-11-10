import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserResponse } from 'stream-chat';
import { DefaultUserType, StreamMessage } from '../types';
import { LoadingIndicatorComponent } from '../loading-indicator/loading-indicator.component';
import { MessageComponent } from './message.component';
import { AvatarComponent } from '../avatar/avatar.component';
import { ChatClientService } from '../chat-client.service';
import { IconComponent } from '../icon/icon.component';
import { MessageActionsBoxComponent } from '../message-actions-box/message-actions-box.component';
import { By } from '@angular/platform-browser';
import { mockCurrentUser, mockMessage } from '../mocks';
import { AttachmentListComponent } from '../attachment-list/attachment-list.component';
import { MessageReactionsComponent } from '../message-reactions/message-reactions.component';
import { TranslateModule } from '@ngx-translate/core';
import { ChannelService } from '../channel.service';

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
  let queryMessageOptions: () => HTMLElement | null;
  let queryActionIcon: () => HTMLElement | null;
  let queryText: () => HTMLElement | null;
  let messageActionsBoxComponent: MessageActionsBoxComponent;
  let queryAttachmentComponent: () => AttachmentListComponent;
  let queryMessageReactionsComponent: () => MessageReactionsComponent;
  let queryReactionIcon: () => HTMLElement | null;
  let queryMessageInner: () => HTMLElement | null;
  let queryLoadingIndicator: () => HTMLElement | null;
  let queryDeletedMessageContainer: () => HTMLElement | null;
  let querySystemMessageContainer: () => HTMLElement | null;
  let resendMessageSpy: jasmine.Spy;

  beforeEach(() => {
    resendMessageSpy = jasmine.createSpy('resendMessage');
    currentUser = mockCurrentUser();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [
        MessageComponent,
        AvatarComponent,
        LoadingIndicatorComponent,
        IconComponent,
        MessageActionsBoxComponent,
        AttachmentListComponent,
        MessageReactionsComponent,
      ],
      providers: [
        {
          provide: ChatClientService,
          useValue: { chatClient: { user: currentUser } },
        },
        {
          provide: ChannelService,
          useValue: { resendMessage: resendMessageSpy },
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
    queryMessageOptions = () =>
      nativeElement.querySelector('[data-testid=message-options]');
    queryActionIcon = () =>
      nativeElement.querySelector('[data-testid="action-icon"]');
    queryText = () => nativeElement.querySelector('[data-testid="text"]');
    queryReactionIcon = () =>
      nativeElement.querySelector('[data-testid="reaction-icon"]');
    queryMessageInner = () =>
      nativeElement.querySelector('[data-testid="inner-message"]');
    queryLoadingIndicator = () =>
      nativeElement.querySelector('[data-testid="loading-indicator"]');
    message = mockMessage();
    component.message = message;
    fixture.detectChanges();
    messageActionsBoxComponent = fixture.debugElement.query(
      By.directive(MessageActionsBoxComponent)
    ).componentInstance as MessageActionsBoxComponent;
    queryAttachmentComponent = () =>
      fixture.debugElement.query(By.directive(AttachmentListComponent))
        ?.componentInstance as AttachmentListComponent;
    queryMessageReactionsComponent = () =>
      fixture.debugElement.query(By.directive(MessageReactionsComponent))
        ?.componentInstance as MessageReactionsComponent;
    queryDeletedMessageContainer = () =>
      nativeElement.querySelector('[data-testid="message-deleted-component"]');
    querySystemMessageContainer = () =>
      nativeElement.querySelector('[data-testid="system-message"]');
    component.areReactionsEnabled = true;
    component.canReactToMessage = true;
    fixture.detectChanges();
  });

  it('should apply the correct CSS classes based on #message', () => {
    component.message = {
      ...component.message,
      ...{ reaction_counts: { wow: 1 } },
    } as StreamMessage;
    fixture.detectChanges();
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
    expect(classList?.contains('str-chat__message--with-reactions')).toBeTrue();

    component.message.user = { id: 'notcurrentUser', name: 'Jane' };
    component.areReactionsEnabled = false;
    fixture.detectChanges();
    classList = container?.classList;

    expect(classList?.contains('str-chat__message--me')).toBeFalse();
    expect(classList?.contains('str-chat__message-simple--me')).toBeFalse();
    expect(
      classList?.contains('str-chat__message--with-reactions')
    ).toBeFalse();
  });

  describe('should display the correct message status', () => {
    it('if message is being sent', () => {
      component.isLastSentMessage = false;
      fixture.detectChanges();
      let indicator = querySendingIndicator();

      expect(indicator).toBeNull();

      message.status = 'sending';
      fixture.detectChanges();

      indicator = querySendingIndicator();

      expect(indicator).not.toBeNull();
      expect(queryLoadingIndicator()).not.toBeNull();

      expect(queryReadIndicator()).toBeNull();
      expect(queryDeliveredIndicator()).toBeNull();
    });

    it('if message is delivered', () => {
      component.isLastSentMessage = true;
      component.message = { ...message, ...{ readBy: [] } };
      fixture.detectChanges();
      const deliveredIndicator = queryDeliveredIndicator();
      const icon = nativeElement.querySelector(
        '[data-testid="delivered-icon"]'
      );
      const readIndicator = queryReadIndicator();

      expect(deliveredIndicator).not.toBeNull();
      expect(queryLoadingIndicator()).toBeNull();
      expect(icon).not.toBeNull();
      expect(readIndicator).toBeNull();
    });

    it('if message is read - only read by one user', () => {
      component.isLastSentMessage = true;
      fixture.detectChanges();
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
      component.isLastSentMessage = true;
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

    it('but only for last message sent by the current user', () => {
      component.isLastSentMessage = false;
      fixture.detectChanges();

      expect(querySendingIndicator()).toBeNull();
      expect(queryDeliveredIndicator()).toBeNull();
      expect(queryReadIndicator()).toBeNull();

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
    delete message.user?.name;
    component.isLastSentMessage = true;
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
    expect(queryText()?.textContent).toContain(message.text);
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
      expect(errorMessage!.textContent).toContain('Message Failed');
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
      expect(clientErrorMessage!.textContent).toContain('Error · Unsent');
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

  describe('should not display message options', () => {
    it('if message is being sent', () => {
      component.message = { ...message, ...{ status: 'sending' } };
      fixture.detectChanges();

      expect(component.areOptionsVisible).toBe(false);
      expect(queryMessageOptions()).toBeNull();
    });

    it('if message sending failed', () => {
      message.status = 'failed';

      expect(component.areOptionsVisible).toBe(false);
    });

    it('if message is unsent', () => {
      message.type = 'error';

      expect(component.areOptionsVisible).toBe(false);
    });

    it('if message is system message', () => {
      message.type = 'system';

      expect(component.areOptionsVisible).toBe(false);
    });

    it('if message is ephemeral message', () => {
      message.type = 'ephemeral';

      expect(component.areOptionsVisible).toBe(false);
    });
  });

  it('should display message options for regular messages', () => {
    expect(queryMessageOptions()).not.toBeNull();
  });

  it('should display message actions for regular messages', () => {
    component.enabledMessageActions = ['delete'];
    fixture.detectChanges();

    expect(queryActionIcon()).not.toBeNull();
  });

  it(`shouldn't display message actions if there are no enabled message actions`, () => {
    component.enabledMessageActions = [];
    fixture.detectChanges();

    expect(queryActionIcon()).toBeNull();
  });

  it(`shouldn't display message actions if there is no visible message action`, () => {
    component.enabledMessageActions = ['flag'];
    fixture.detectChanges();

    expect(queryActionIcon()).toBeNull();
  });

  it('should open and close message actions box', () => {
    component.enabledMessageActions = ['edit', 'flag'];
    fixture.detectChanges();

    expect(messageActionsBoxComponent.isOpen).toBeFalse();

    queryActionIcon()?.click();
    fixture.detectChanges();

    expect(messageActionsBoxComponent.isOpen).toBeTrue();
  });

  it('should provide #enabledActions to message actions box', () => {
    expect(messageActionsBoxComponent.enabledActions).toBe(
      component.enabledMessageActions
    );
  });

  it('should provide #isMine to message actions box', () => {
    expect(messageActionsBoxComponent.isMine).toBeTrue();

    component.message = { ...message, ...{ user: { id: 'notcurrentuser' } } };
    fixture.detectChanges();

    expect(messageActionsBoxComponent.isMine).toBeFalse();
  });

  it('should provide #message to message actions box', () => {
    fixture.detectChanges();

    expect(messageActionsBoxComponent.message).toBe(message);
  });

  it('should add CSS class if text is clicked on mobile', () => {
    expect(component.isPressedOnMobile).toBeFalse();
    spyOnProperty(window, 'innerWidth').and.returnValue(300);
    const text = queryText();
    text?.click();
    fixture.detectChanges();

    expect(component.isPressedOnMobile).toBeTrue();
    expect(queryContainer()?.classList.contains('mobile-press')).toBeTrue();
  });

  it('should remove CSS class after message is deselected', () => {
    component.isPressedOnMobile = false;
    fixture.detectChanges();

    expect(queryContainer()?.classList.contains('mobile-press')).toBeFalse();
  });

  it(`shouldn't add CSS class if text was clicked on desktop`, () => {
    spyOnProperty(window, 'innerWidth').and.returnValue(1200);
    const text = queryText();
    text?.click();
    fixture.detectChanges();

    expect(component.isPressedOnMobile).toBeFalse();
    expect(queryContainer()?.classList.contains('mobile-press')).toBeFalse();
  });

  it('should display attachment if message has attachment', () => {
    expect(
      queryContainer()?.classList.contains('str-chat__message--has-attachment')
    ).toBeFalse();

    expect(
      queryMessageInner()?.classList.contains(
        'str-chat__message-light-text-inner--has-attachment'
      )
    ).toBeFalse();

    expect(queryAttachmentComponent()).toBeUndefined();

    const attachments = [{ image_url: 'image/url' }];
    component.message = {
      ...message,
      ...{ attachments },
    };
    fixture.detectChanges();
    const attachmentComponent = queryAttachmentComponent();

    expect(
      queryContainer()?.classList.contains('str-chat__message--has-attachment')
    ).toBeTrue();

    expect(
      queryMessageInner()?.classList.contains(
        'str-chat__message-light-text-inner--has-attachment'
      )
    ).toBeTrue();

    expect(attachmentComponent).not.toBeUndefined();
    expect(attachmentComponent.attachments).toBe(attachments);
  });

  it('should display reactions icon, if reactions are enabled and user can react to message', () => {
    expect(queryReactionIcon()).not.toBeNull();

    component.canReactToMessage = false;
    fixture.detectChanges();

    expect(queryReactionIcon()).toBeNull();

    component.canReactToMessage = true;
    component.areReactionsEnabled = false;
    fixture.detectChanges();

    expect(queryReactionIcon()).toBeNull();
  });

  it('should display message reactions, if reactions are enabled', () => {
    const reactions = { angry: 1 };
    const ownReactions = [
      {
        type: 'wow',
        created_at: '',
        updated_at: '',
        user: currentUser,
      },
    ];
    const latestReactions = [
      {
        type: 'angry',
        created_at: '',
        updated_at: '',
        user: { id: 'angryuser', name: 'Jack' } as UserResponse,
      },
      ...ownReactions,
    ];
    component.message = {
      ...message,
      ...{
        reaction_counts: reactions,
        latest_reactions: latestReactions,
        own_reactions: ownReactions,
      },
    };
    component.canReactToMessage = true;
    fixture.detectChanges();
    const messageReactionsComponent = queryMessageReactionsComponent();

    expect(messageReactionsComponent?.messageReactionCounts).toBe(reactions);
    expect(messageReactionsComponent?.latestReactions).toBe(latestReactions);
    expect(messageReactionsComponent?.isSelectorOpen).toBe(
      component.isReactionSelectorOpen
    );

    expect(messageReactionsComponent?.messageId).toBe(component.message.id);

    expect(messageReactionsComponent?.ownReactions).toBe(ownReactions);

    component.areReactionsEnabled = false;
    fixture.detectChanges();

    expect(queryMessageReactionsComponent()).toBeUndefined();

    component.isReactionSelectorOpen = true;
    component.areReactionsEnabled = true;
    fixture.detectChanges();
    queryMessageReactionsComponent().isSelectorOpenChange.emit(false);
    fixture.detectChanges();

    expect(component.isReactionSelectorOpen).toBeFalse();
  });

  it('should toggle reactions selector', () => {
    expect(component.isReactionSelectorOpen).toBeFalse();

    queryReactionIcon()?.click();
    fixture.detectChanges();

    expect(component.isReactionSelectorOpen).toBeTrue();
  });

  it(`shouldn't display empty text`, () => {
    component.message = { ...component.message!, ...{ text: '' } };
    fixture.detectChanges();

    expect(queryText()).toBeNull();
  });

  it('should display HTML content', () => {
    const htmlContent =
      '<a href="https://getstream.io/">https://getstream.io/</a>';
    component.message = { ...component.message!, ...{ html: htmlContent } };
    fixture.detectChanges();

    expect(queryText()?.innerHTML).toEqual(htmlContent);
  });

  it('should resend message, if sending is failed', () => {
    component.message = { ...component.message!, status: 'failed' };
    fixture.detectChanges();
    spyOn(component, 'resendMessage');
    queryMessageInner()!.click();

    expect(component.resendMessage).toHaveBeenCalledWith();
  });

  it(`shouldn't resend message, if message could be sent`, () => {
    component.message = { ...component.message!, status: 'received' };
    fixture.detectChanges();
    spyOn(component, 'resendMessage');
    queryMessageInner()!.click();

    expect(component.resendMessage).not.toHaveBeenCalled();
  });

  it(`shouldn't resend unathorized message`, () => {
    component.message = {
      ...component.message!,
      status: 'failed',
      errorStatusCode: 403,
    };
    fixture.detectChanges();
    spyOn(component, 'resendMessage');
    queryMessageInner()!.click();

    expect(component.resendMessage).not.toHaveBeenCalledWith();
  });

  it('should resend message', () => {
    component.resendMessage();

    expect(resendMessageSpy).toHaveBeenCalledWith(component.message);
  });

  it('should display deleted message placeholder', () => {
    expect(queryDeletedMessageContainer()).toBeNull();

    component.message = { ...message, deleted_at: new Date().toISOString() };
    fixture.detectChanges();

    expect(queryDeletedMessageContainer()).not.toBeNull();
    expect(queryAvatar()).toBeNull();
    expect(queryMessageOptions()).toBeNull();
  });

  it('should display system message', () => {
    expect(querySystemMessageContainer()).toBeNull();

    component.message = { ...message, type: 'system' };
    fixture.detectChanges();
    const systemMessage = querySystemMessageContainer();

    expect(systemMessage?.innerHTML).toContain(message.text);
  });
});
