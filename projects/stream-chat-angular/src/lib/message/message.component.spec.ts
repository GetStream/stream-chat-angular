import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';

import { UserResponse } from 'stream-chat';
import { StreamMessage } from '../types';
import { LoadingIndicatorComponent } from '../icon/loading-indicator/loading-indicator.component';
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
import { ChangeDetectionStrategy, SimpleChange } from '@angular/core';
import { AvatarPlaceholderComponent } from '../avatar-placeholder/avatar-placeholder.component';
import { BehaviorSubject, of } from 'rxjs';
import { MessageActionsService } from '../message-actions.service';
import { NgxFloatUiModule } from 'ngx-float-ui';
import { MessageTextComponent } from '../message-text/message-text.component';
import { MessageBlockedComponent } from '../message-blocked/message-blocked.component';

describe('MessageComponent', () => {
  let component: MessageComponent;
  let fixture: ComponentFixture<MessageComponent>;
  let nativeElement: HTMLElement;
  let message: StreamMessage;
  let currentUser: UserResponse;
  let queryContainer: () => HTMLElement | null;
  let querySender: () => HTMLElement | null;
  let queryDate: () => HTMLElement | null;
  let querySendingIndicator: () => HTMLElement | null;
  let queryDeliveredIndicator: () => HTMLElement | null;
  let queryReadIndicator: () => HTMLElement | null;
  let queryAvatar: () => AvatarPlaceholderComponent;
  let queryMessageTextComponent: (testId: string) => MessageTextComponent;
  let queryMessageActionsBoxComponent: () =>
    | MessageActionsBoxComponent
    | undefined;
  let queryAttachmentComponent: () => AttachmentListComponent;
  let queryMessageInner: () => HTMLElement | null;
  let queryLoadingIndicator: () => HTMLElement | null;
  let queryDeletedMessageContainer: () => HTMLElement | null;
  let querySystemMessageContainer: () => HTMLElement | null;
  let queryReplyCountButton: () => HTMLButtonElement | null;
  let queryTranslationNotice: () => HTMLElement | null;
  let querySeeOriginalButton: () => HTMLButtonElement | null;
  let querySeeTranslationButton: () => HTMLButtonElement | null;
  let queryMessageBubble: () => HTMLElement | null;
  let queryMessageOptions: () => HTMLElement | null;
  let queryMessageOptionsButton: () => HTMLElement | null;
  let resendMessageSpy: jasmine.Spy;
  let setAsActiveParentMessageSpy: jasmine.Spy;
  let jumpToMessageSpy: jasmine.Spy;
  let bouncedMessage$: BehaviorSubject<StreamMessage | undefined>;
  const mockChannel = {
    cid: 'messaging:general',
    data: {
      member_count: 5,
    },
  };

  beforeEach(() => {
    resendMessageSpy = jasmine.createSpy('resendMessage');
    setAsActiveParentMessageSpy = jasmine.createSpy(
      'setAsActiveParentMessageSpy'
    );
    bouncedMessage$ = new BehaviorSubject<StreamMessage | undefined>(undefined);
    jumpToMessageSpy = jasmine.createSpy('jumpToMessage');
    currentUser = mockCurrentUser();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), NgxFloatUiModule],
      declarations: [
        MessageComponent,
        AvatarComponent,
        LoadingIndicatorComponent,
        IconComponent,
        MessageActionsBoxComponent,
        AttachmentListComponent,
        MessageReactionsComponent,
        AvatarPlaceholderComponent,
        MessageTextComponent,
        MessageBlockedComponent,
      ],
      providers: [
        {
          provide: ChatClientService,
          useValue: {
            chatClient: { user: currentUser },
            user$: of(currentUser),
          },
        },
        {
          provide: ChannelService,
          useValue: {
            _activeChannel$: of(mockChannel),
            get activeChannel$() {
              return this._activeChannel$;
            },
            set activeChannel$(value) {
              this._activeChannel$ = value;
            },
            resendMessage: resendMessageSpy,
            setAsActiveParentMessage: setAsActiveParentMessageSpy,
            jumpToMessage: jumpToMessageSpy,
            bouncedMessage$,
          },
        },
      ],
    }).overrideComponent(MessageComponent, {
      set: { changeDetection: ChangeDetectionStrategy.Default },
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
    queryAvatar = () =>
      fixture.debugElement.query(By.css('[data-testid="avatar"]'))
        ?.componentInstance as AvatarPlaceholderComponent;
    queryMessageTextComponent = (testId: string) =>
      fixture.debugElement.query(By.css(`[data-testid="${testId}"]`))
        ?.componentInstance as MessageTextComponent;
    queryMessageInner = () =>
      nativeElement.querySelector('[data-testid="inner-message"]');
    queryLoadingIndicator = () =>
      nativeElement.querySelector('[data-testid="loading-indicator"]');
    queryReplyCountButton = () =>
      nativeElement.querySelector('[data-testid="reply-count-button"]');
    queryMessageOptions = () =>
      nativeElement.querySelector('[data-testid="message-options"]');
    queryMessageOptionsButton = () =>
      nativeElement.querySelector('[data-testid="message-options-button"]');
    message = mockMessage();
    message.cid = mockChannel.cid;
    component.message = message;
    component.ngOnChanges({ message: {} as SimpleChange });
    component.ngAfterViewInit();
    fixture.detectChanges();
    queryMessageActionsBoxComponent = () =>
      fixture.debugElement.query(By.directive(MessageActionsBoxComponent))
        ?.componentInstance as MessageActionsBoxComponent;
    queryAttachmentComponent = () =>
      fixture.debugElement.query(By.directive(AttachmentListComponent))
        ?.componentInstance as AttachmentListComponent;
    queryDeletedMessageContainer = () =>
      nativeElement.querySelector('[data-testid="message-deleted-component"]');
    querySystemMessageContainer = () =>
      nativeElement.querySelector('[data-testid="system-message"]');
    queryTranslationNotice = () =>
      nativeElement.querySelector('[data-testid="translation-notice"]');
    querySeeOriginalButton = () =>
      nativeElement.querySelector('[data-testid="see-original"]');
    querySeeTranslationButton = () =>
      nativeElement.querySelector('[data-testid="see-translation"]');
    queryMessageBubble = () =>
      nativeElement.querySelector('[data-testid="message-bubble"]');
    component.enabledMessageActions = [
      'read-events',
      'send-reaction',
      'send-reply',
    ];
    component.ngOnChanges({ enabledMessageActions: {} as SimpleChange });
    fixture.detectChanges();
  });

  it('should apply the correct CSS classes based on #message', () => {
    component.message = {
      ...component.message,
      ...{ reaction_groups: { wow: { count: 1, sum_scores: 1 } } },
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });
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
    expect(
      classList?.contains('str-chat__message-with-thread-link')
    ).toBeFalse();

    component.message.user = { id: 'notcurrentUser', name: 'Jane' };
    component.message.reaction_groups = {};
    component.message.reply_count = 3;
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();
    classList = container?.classList;

    expect(classList?.contains('str-chat__message--me')).toBeFalse();
    expect(classList?.contains('str-chat__message-simple--me')).toBeFalse();
    expect(classList?.contains('str-chat__message--other')).toBeTrue();
    expect(
      classList?.contains('str-chat__message--with-reactions')
    ).toBeFalse();

    expect(
      classList?.contains('str-chat__message-with-thread-link')
    ).toBeTrue();
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
      component.ngOnChanges({ message: {} as SimpleChange });
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

    it(`should display delivered icon, if user can't receive delivered events`, () => {
      component.isLastSentMessage = true;
      component.enabledMessageActions = [];
      component.ngOnChanges({ enabledMessageActions: {} as SimpleChange });
      fixture.detectChanges();
      const readIndicator = queryReadIndicator();
      const deliveredIndicator = queryDeliveredIndicator();

      expect(readIndicator).toBeNull();
      expect(deliveredIndicator).not.toBeNull();
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
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();
    const avatar = queryAvatar();

    expect(avatar.name).toContain(senderName);
    expect(avatar.imageUrl).toContain(senderImage);
    expect(avatar.type).toBe('user');
    expect(avatar.location).toBe('message-sender');
    expect(avatar.user).toBe(component.message.user!);
  });

  it('should display text message', () => {
    const messageTextComponent = queryMessageTextComponent('text');

    expect(messageTextComponent.message).toBe(component.message);
    expect(messageTextComponent.shouldTranslate).toBe(
      component.displayedMessageTextContent === 'translation'
    );
    expect(messageTextComponent.isQuoted).toBe(false);
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
      component.ngOnChanges({ message: {} as SimpleChange });
      fixture.detectChanges();
      const errorMessage = queryErrorMessage();

      expect(errorMessage).not.toBeNull();
      expect(errorMessage!.textContent).toContain('Unauthorized');
      expect(
        nativeElement.querySelector('.str-chat__message-send-can-be-retried')
      ).toBeNull();
    });

    it('if error occured during send', () => {
      expect(queryErrorMessage()).toBeNull();

      component.message = {
        ...message,
        ...{ errorStatusCode: 500, status: 'failed' },
      };
      component.ngOnChanges({ message: {} as SimpleChange });
      fixture.detectChanges();
      const errorMessage = queryErrorMessage();

      expect(errorMessage).not.toBeNull();
      expect(querySendingIndicator()).toBeNull();
      expect(queryDeliveredIndicator()).toBeNull();
      expect(queryReadIndicator()).toBeNull();
      expect(errorMessage!.textContent).toContain('Message Failed');
      expect(errorMessage!.textContent).not.toContain('Unauthorized');
      expect(
        nativeElement.querySelector('.str-chat__message-send-can-be-retried')
      ).not.toBeNull();
    });

    it('if message was not sent due to client error', () => {
      expect(queryClientErrorMessage()).toBeNull();

      component.message = {
        ...message,
        ...{ type: 'error' },
      };
      component.ngOnChanges({ message: {} as SimpleChange });
      fixture.detectChanges();
      const clientErrorMessage = queryClientErrorMessage();

      expect(clientErrorMessage).not.toBeNull();
      expect(clientErrorMessage!.textContent).toContain('Error · Unsent');
    });

    it('if message was not sent due to moderation error', () => {
      expect(queryClientErrorMessage()).toBeNull();

      component.message = {
        ...message,
        moderation_details: {
          original_text: 'Ricciardo should retire',
          action: 'MESSAGE_RESPONSE_ACTION_BOUNCE',
          harms: [
            {
              name: 'hammurabi_filter',
              phrase_list_ids: [139],
            },
          ],
          error_msg: 'this message did not meet our content guidelines',
        },
        type: 'error',
      };
      component.ngOnChanges({ message: {} as SimpleChange });
      fixture.detectChanges();

      expect(
        nativeElement.querySelector('.str-chat__message-send-can-be-retried')
      ).not.toBeNull();

      const spy = jasmine.createSpy();
      bouncedMessage$.subscribe(spy);

      queryMessageInner()!.click();

      expect(spy).toHaveBeenCalledWith(component.message);
    });
  });

  it('should display message sender and date', () => {
    const sender = { id: 'sender', name: 'Jack' };
    component.message = { ...message, ...{ user: sender } };
    component.ngOnChanges({ message: {} as SimpleChange });
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
      component.ngOnChanges({ message: {} as SimpleChange });
      fixture.detectChanges();

      expect(component.areOptionsVisible).toBe(false);
    });

    it('if message sending failed', () => {
      message.status = 'failed';
      component.ngOnChanges({ message: {} as SimpleChange });

      expect(component.areOptionsVisible).toBe(false);
    });

    it('if message is unsent', () => {
      message.type = 'error';
      component.ngOnChanges({ message: {} as SimpleChange });

      expect(component.areOptionsVisible).toBe(false);
    });

    it('if message is system message', () => {
      message.type = 'system';
      component.ngOnChanges({ message: {} as SimpleChange });

      expect(component.areOptionsVisible).toBe(false);
    });

    it('if message is ephemeral message', () => {
      message.type = 'ephemeral';
      component.ngOnChanges({ message: {} as SimpleChange });

      expect(component.areOptionsVisible).toBe(false);
    });
  });

  describe('message menu when touch support is available', () => {
    beforeEach(() => {
      component.hasTouchSupport = true;
      component['registerMenuTriggerEventHandlers']();
      fixture.detectChanges();
    });

    it('should display message options for regular messages on long press', fakeAsync(() => {
      spyOn(component['messageMenuTrigger'], 'show');
      component.hasTouchSupport = true;

      const messageBubble = queryMessageBubble()!;
      const touchStart = new TouchEvent('touchstart');
      messageBubble.dispatchEvent(touchStart);
      tick(200);

      expect(component['messageMenuTrigger'].show).not.toHaveBeenCalled();

      tick(200);

      expect(component['messageMenuTrigger'].show).toHaveBeenCalled();
    }));

    it(`shouldn't display message options for regular messages on short press`, fakeAsync(() => {
      spyOn(component['messageMenuTrigger'], 'show');
      component.hasTouchSupport = true;

      const messageBubble = queryMessageBubble()!;
      const touchStart = new MouseEvent('touchstart');
      messageBubble.dispatchEvent(touchStart);
      tick(200);

      const mouseUpEvent = new MouseEvent('touchend');
      messageBubble.dispatchEvent(mouseUpEvent);

      expect(component['messageMenuTrigger'].show).not.toHaveBeenCalled();
    }));

    it(`shouldn't display message options if #areOptionsVisible is false`, fakeAsync(() => {
      component.areOptionsVisible = false;
      component.hasTouchSupport = true;
      spyOn(component['messageMenuTrigger'], 'show');

      const messageBubble = queryMessageBubble()!;
      const mouseDownEvent = new TouchEvent('touchstart');
      messageBubble.dispatchEvent(mouseDownEvent);
      tick(400);

      expect(component['messageMenuTrigger'].show).not.toHaveBeenCalled();
    }));

    it('should call custom message actions click handler', fakeAsync(() => {
      const service = TestBed.inject(MessageActionsService);
      const spy = jasmine.createSpy();
      service.customActionClickHandler = spy;
      component.enabledMessageActions = ['update-own-message', 'flag-message'];
      component.ngOnChanges({ enabledMessageActions: {} as SimpleChange });
      fixture.detectChanges();
      spyOn(component['messageMenuTrigger'], 'show');
      const messageBubble = queryMessageBubble()!;
      const mouseDownEvent = new TouchEvent('touchstart');
      messageBubble.dispatchEvent(mouseDownEvent);
      tick(400);
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledWith({
        message: component.message,
        enabledActions: component.enabledMessageActions,
        isMine: component.isSentByCurrentUser,
        customActions: service.customActions$.getValue(),
        messageTextHtmlElement: component['messageTextElement']?.nativeElement,
      });

      expect(component['messageMenuTrigger'].show).not.toHaveBeenCalled();
    }));

    it(`shouldn't display the message options button`, () => {
      expect(queryMessageOptions()).toBeNull();
    });
  });

  describe('message menu without touch support', () => {
    beforeEach(() => {
      component.hasTouchSupport = false;
      fixture.detectChanges();
    });

    it('should display message options for regular messages', () => {
      expect(component.areMessageOptionsOpen).toBeFalse();

      queryMessageOptionsButton()?.click();
      fixture.detectChanges();

      expect(component.areMessageOptionsOpen).toBeTrue();
    });

    it(`shouldn't display message options for regular messages on long click`, fakeAsync(() => {
      const messageBubble = queryMessageBubble()!;
      const mouseDownEvent = new MouseEvent('mousedown', { button: 0 });
      messageBubble.dispatchEvent(mouseDownEvent);
      tick(200);
      const mouseUpEvent = new MouseEvent('mouseup');
      messageBubble.dispatchEvent(mouseUpEvent);
      fixture.detectChanges();

      expect(component.areMessageOptionsOpen).toBeFalse();
    }));

    it(`shouldn't display message options if #areOptionsVisible is false`, fakeAsync(() => {
      component.areOptionsVisible = false;

      queryMessageOptionsButton()?.click();
      fixture.detectChanges();

      expect(component.areMessageOptionsOpen).toBeTrue();
    }));

    it('should call custom message actions click handler', () => {
      const service = TestBed.inject(MessageActionsService);
      const spy = jasmine.createSpy();
      service.customActionClickHandler = spy;
      queryMessageOptionsButton()?.click();
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledWith({
        message: component.message,
        enabledActions: component.enabledMessageActions,
        isMine: component.isSentByCurrentUser,
        customActions: service.customActions$.getValue(),
        messageTextHtmlElement: component['messageTextElement']?.nativeElement,
      });
    });
  });

  it(`shouldn't display message options if there are no enabled message actions`, () => {
    component.enabledMessageActions = [];
    component.ngOnChanges({ enabledMessageActions: {} as SimpleChange });
    fixture.detectChanges();

    expect(component.areOptionsVisible).toBeFalse();
  });

  it(`shouldn't display message actions if there is no visible message action`, () => {
    component.enabledMessageActions = ['flag-message'];
    const service = TestBed.inject(MessageActionsService);
    service.defaultActions.find(
      (a) => a.actionName === 'copy-message-text'
    )!.isVisible = () => false;
    component.ngOnChanges({ enabledMessageActions: {} as SimpleChange });
    fixture.detectChanges();

    expect(component.areOptionsVisible).toBeFalse();
  });

  it('should provide #isMine to message actions box', () => {
    fixture.detectChanges();
    const messageActionsBoxComponent = queryMessageActionsBoxComponent()!;

    expect(messageActionsBoxComponent.isMine).toBeTrue();

    component.message = { ...message, ...{ user: { id: 'notcurrentuser' } } };
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();

    expect(messageActionsBoxComponent.isMine).toBeFalse();
  });

  it('should provide #message to message actions box', () => {
    fixture.detectChanges();
    const messageActionsBoxComponent = queryMessageActionsBoxComponent()!;

    expect(messageActionsBoxComponent.message).toBe(message);
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
    component.message.parent_id = 'parent-id';
    component.ngOnChanges({ message: {} as SimpleChange });
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
    expect(attachmentComponent.messageId).toBe(component.message.id);
    expect(attachmentComponent.parentMessageId).toBe(
      component.message.parent_id
    );
  });

  it('should resend message, if sending is failed', () => {
    component.message = { ...component.message!, status: 'failed' };
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();
    spyOn(component, 'resendMessage');
    queryMessageInner()!.click();

    expect(component.resendMessage).toHaveBeenCalledWith();
  });

  it(`shouldn't resend message, if message could be sent`, () => {
    component.message = { ...component.message!, status: 'received' };
    component.ngOnChanges({ message: {} as SimpleChange });
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
    component.ngOnChanges({ message: {} as SimpleChange });
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

    component.message = { ...message, deleted_at: new Date() };
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();

    expect(queryDeletedMessageContainer()).not.toBeNull();
    expect(queryAvatar()).toBeUndefined();
    expect(component.areOptionsVisible).toBeFalse();
  });

  it('should display system message', () => {
    expect(querySystemMessageContainer()).toBeNull();

    component.message = { ...message, type: 'system' };
    fixture.detectChanges();
    const systemMessage = querySystemMessageContainer();

    expect(systemMessage?.innerHTML).toContain(message.text);
  });

  it('should display reply count for parent messages', () => {
    expect(queryReplyCountButton()).toBeNull();

    component.message = { ...message, reply_count: 1 };
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();

    expect(queryReplyCountButton()).not.toBeNull();
    expect(queryReplyCountButton()?.innerHTML).toContain('streamChat.1 reply');
  });

  it('should select parent message if reply count is clicked', () => {
    expect(queryReplyCountButton()).toBeNull();

    component.message = { ...message, reply_count: 1 };
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();
    queryReplyCountButton()?.click();
    fixture.detectChanges();

    expect(setAsActiveParentMessageSpy).toHaveBeenCalledWith(component.message);
  });

  describe('in thread mode', () => {
    beforeEach(() => {
      component.mode = 'thread';
      component.enabledMessageActions = ['update-own-message', 'delete'];
      component.ngOnChanges({
        mode: {} as SimpleChange,
        enabledMessageActions: {} as SimpleChange,
      });
      fixture.detectChanges();
    });

    it('should only display sending message status', () => {
      message.status = 'sending';
      component.isLastSentMessage = true;
      fixture.detectChanges();

      expect(querySendingIndicator()).not.toBeNull();

      message.readBy = [];
      message.status = 'received';
      fixture.detectChanges();

      expect(queryDeliveredIndicator()).toBeNull();
    });

    it('should not display message options for parent meesage', () => {
      expect(component.areOptionsVisible).toBeFalse();
    });

    it('should not display reply count for parent meesage', () => {
      message.reply_count = 5;
      fixture.detectChanges();

      expect(queryReplyCountButton()).toBeNull();
    });
  });

  it('should apply necessary CSS class, if highlighted', () => {
    expect(
      nativeElement.querySelector('.str-chat__message--highlighted')
    ).toBeNull();

    component.isHighlighted = true;
    fixture.detectChanges();

    expect(
      nativeElement.querySelector('.str-chat__message--highlighted')
    ).not.toBeNull();
  });

  it('should set the number of visibe actions', () => {
    component.enabledMessageActions = [
      'pin-message',
      'update-own-message',
      'delete-own-message',
      'flag-message',
    ];
    component.ngOnChanges({
      enabledMessageActions: {} as any as SimpleChange,
    });

    expect(component.visibleMessageActionsCount).toBe(3 + 1);

    component.enabledMessageActions = [
      'pin-message',
      'update-any-message',
      'delete',
      'flag-message',
      'quote-message',
    ];
    component.message!.user_id = 'not' + currentUser.id;
    component.ngOnChanges({
      message: {} as any as SimpleChange,
      enabledMessageActions: {} as any as SimpleChange,
    });

    expect(component.visibleMessageActionsCount).toBe(4 + 1);

    const customActions = [
      {
        actionName: 'forward',
        isVisible: () => true,
        actionHandler: () => {},
        actionLabelOrTranslationKey: 'Forward',
      },
    ];
    const service = TestBed.inject(MessageActionsService);
    service.customActions$.next(customActions);

    expect(component.visibleMessageActionsCount).toBe(5 + 1);
  });

  describe('quoted message', () => {
    const quotedMessageContainerSelector =
      '[data-testid="quoted-message-container"]';
    let quotedMessage: StreamMessage;

    beforeEach(() => {
      quotedMessage = mockMessage();
      quotedMessage.id = 'quoted-message';
      quotedMessage.user = {
        id: 'sara',
        name: 'Sara',
        image: 'http://url/to/img',
      };
      quotedMessage.attachments = [{ image_url: '1' }, { image_url: '2' }];
      quotedMessage.text = 'This message was quoted';
      component.message = {
        ...component.message!,
        quoted_message: quotedMessage as any,
      };
      component.ngOnChanges({ message: {} as SimpleChange });
      fixture.detectChanges();
    });

    it('should display quoted message', () => {
      expect(
        nativeElement.querySelector(quotedMessageContainerSelector)
      ).not.toBeNull();
      const avatar = fixture.debugElement
        .query(By.css(quotedMessageContainerSelector))
        .query(By.directive(AvatarPlaceholderComponent))
        .componentInstance as AvatarPlaceholderComponent;
      const attachments = fixture.debugElement
        .query(By.css(quotedMessageContainerSelector))
        .query(By.directive(AttachmentListComponent))
        .componentInstance as AttachmentListComponent;

      expect(avatar.name).toBe(component.message!.quoted_message!.user!.name);
      expect(avatar.imageUrl).toBe(
        component.message!.quoted_message!.user!.image
      );

      expect(avatar.type).toBe('user');
      expect(avatar.location).toBe('quoted-message-sender');
      expect(avatar.user).toBe(component.message!.quoted_message!.user!);
      expect(attachments.attachments).toEqual([{ image_url: '1' }]);
      expect(
        nativeElement.querySelector('[data-testid="quoted-message-text"]')
          ?.innerHTML
      ).toContain('This message was quoted');

      component.message = { ...component.message!, quoted_message: undefined };
      component.ngOnChanges({ message: {} as SimpleChange });
      fixture.detectChanges();

      expect(
        nativeElement.querySelector(quotedMessageContainerSelector)
      ).toBeNull();
    });

    it('should apply necessary CSS classes for quoted message', () => {
      const quotedMessageContainer = nativeElement.querySelector(
        quotedMessageContainerSelector
      );

      expect(quotedMessageContainer?.classList).toContain('mine');

      component.message = { ...component.message!, user: { id: 'otheruser' } };
      component.ngOnChanges({ message: {} as SimpleChange });
      fixture.detectChanges();

      expect(quotedMessageContainer?.classList).not.toContain('mine');
    });

    it('should display reply if we reply with attachments without text', () => {
      component.message!.attachments = [
        { image_url: 'http://url/to/image', type: 'image' },
      ];
      component.message!.text = undefined;
      component.ngOnChanges({ message: {} as SimpleChange });
      fixture.detectChanges();

      expect(queryAttachmentComponent()).toBeDefined();
    });

    it('should jump to quoted message upon click', () => {
      nativeElement
        .querySelector<HTMLElement>(quotedMessageContainerSelector)!
        .click();

      expect(jumpToMessageSpy).toHaveBeenCalledWith(
        quotedMessage.id,
        quotedMessage.parent_id
      );
    });

    it('should display translation notifce and user should be able to change between translation and original', () => {
      component.message!.translation = 'Hogy vagy?';
      component.ngOnChanges({ message: {} as SimpleChange });
      fixture.detectChanges();

      expect(queryTranslationNotice()).not.toBeNull();
      expect(querySeeTranslationButton()).toBeNull();
      expect(queryMessageTextComponent('text').shouldTranslate).toBeTrue();
      expect(
        queryMessageTextComponent('quoted-message-text').shouldTranslate
      ).toBeTrue();

      querySeeOriginalButton()?.click();
      fixture.detectChanges();

      expect(queryMessageTextComponent('text').shouldTranslate).toBeFalse();
      expect(
        queryMessageTextComponent('quoted-message-text').shouldTranslate
      ).toBeFalse();

      expect(querySeeOriginalButton()).toBeNull();

      querySeeTranslationButton()?.click();
      fixture.detectChanges();

      expect(queryMessageTextComponent('text').shouldTranslate).toBeTrue();
      expect(
        queryMessageTextComponent('quoted-message-text').shouldTranslate
      ).toBeTrue();
    });

    it(`shouldn't display translation notice if message isn't translated`, () => {
      component.message!.translation = undefined;
      component.ngOnChanges({ message: {} as SimpleChange });
      fixture.detectChanges();

      expect(queryTranslationNotice()).toBeNull();
    });
  });

  it(`shouldn't display edited flag if message wasn't edited`, () => {
    expect(
      nativeElement.querySelector('[data-testid="edited-flag"]')
    ).toBeNull();
  });

  it(`should display edited flag if message was edited, edited info should be collapsed`, () => {
    component.message!.message_text_updated_at = new Date().toISOString();
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();

    expect(
      nativeElement.querySelector('[data-testid="edited-flag"]')
    ).not.toBeNull();

    expect(
      nativeElement.querySelector('[data-testid="edited-timestamp"]')
    ).not.toBeNull();
  });

  it(`should display edited flag if message was edited, display timestamp if clicked`, () => {
    component.message!.message_text_updated_at = new Date().toISOString();
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();
    queryMessageInner()?.click();
    fixture.detectChanges();
    const timestamp = nativeElement.querySelector(
      '[data-testid="edited-timestamp"]'
    );

    expect(timestamp?.innerHTML).toContain(component.pasedEditedDate);
  });

  describe('should display blocked message', () => {
    let queryBlockedMessageComponent: () => MessageBlockedComponent | null;

    beforeEach(() => {
      queryBlockedMessageComponent = () =>
        fixture.debugElement.query(By.directive(MessageBlockedComponent))
          ?.componentInstance as MessageBlockedComponent;
    });

    it('should display blocked message component when moderation_details.action is MESSAGE_RESPONSE_ACTION_REMOVE', () => {
      component.message = {
        ...mockMessage(),
        type: 'error',
        moderation_details: {
          action: 'MESSAGE_RESPONSE_ACTION_REMOVE',
        },
      } as StreamMessage;
      component.ngOnChanges({ message: {} as SimpleChange });
      fixture.detectChanges();

      const blockedMessageComponent = queryBlockedMessageComponent();
      expect(blockedMessageComponent).not.toBeNull();
      expect(queryContainer()).toBeNull();
    });

    it('should display blocked message component when moderation.action is remove', () => {
      component.message = {
        ...mockMessage(),
        type: 'error',
        moderation: {
          action: 'remove',
        },
      } as StreamMessage;
      component.ngOnChanges({ message: {} as SimpleChange });
      fixture.detectChanges();

      const blockedMessageComponent = queryBlockedMessageComponent();
      expect(blockedMessageComponent).not.toBeNull();
      expect(queryContainer()).toBeNull();
    });

    it('should pass appropriate inputs to blocked message component', () => {
      const blockedMessage = {
        ...mockMessage(),
        type: 'error',
        moderation_details: {
          action: 'MESSAGE_RESPONSE_ACTION_REMOVE',
        },
      } as StreamMessage;

      component.message = blockedMessage;
      component.ngOnChanges({ message: {} as SimpleChange });
      fixture.detectChanges();

      const messageBlockedComponent = fixture.debugElement.query(
        By.css('stream-message-blocked')
      )?.componentInstance;

      expect(messageBlockedComponent).not.toBeNull();
      expect(messageBlockedComponent.message).toBe(blockedMessage);
      expect(messageBlockedComponent.isMyMessage).toBe(
        component.isSentByCurrentUser
      );
    });

    it('should display normal message when error type but no moderation action', () => {
      component.message = {
        ...mockMessage(),
        type: 'error',
      } as StreamMessage;
      component.ngOnChanges({ message: {} as SimpleChange });
      fixture.detectChanges();

      expect(queryBlockedMessageComponent()).toBeUndefined();
      expect(queryContainer()).not.toBeNull();
    });
  });
});
