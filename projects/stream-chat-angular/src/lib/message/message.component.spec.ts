import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  MessageResponseBase,
  ReactionResponse,
  UserResponse,
} from 'stream-chat';
import { DefaultStreamChatGenerics, StreamMessage } from '../types';
import { LoadingIndicatorComponent } from '../loading-indicator/loading-indicator.component';
import { MessageComponent } from './message.component';
import { AvatarComponent } from '../avatar/avatar.component';
import { ChatClientService } from '../chat-client.service';
import { IconComponent } from '../icon/icon.component';
import { MessageActionsBoxComponent } from '../message-actions-box/message-actions-box.component';
import { By } from '@angular/platform-browser';
import { generateMockMessages, mockCurrentUser, mockMessage } from '../mocks';
import { AttachmentListComponent } from '../attachment-list/attachment-list.component';
import { MessageReactionsComponent } from '../message-reactions/message-reactions.component';
import { TranslateModule } from '@ngx-translate/core';
import { ChannelService } from '../channel.service';
import { ChangeDetectionStrategy, SimpleChange } from '@angular/core';
import { AvatarPlaceholderComponent } from '../avatar-placeholder/avatar-placeholder.component';
import { ThemeService } from '../theme.service';
import { BehaviorSubject, of } from 'rxjs';
import { MessageActionsService } from '../message-actions.service';
import { MessageService } from '../message.service';

describe('MessageComponent', () => {
  let component: MessageComponent;
  let fixture: ComponentFixture<MessageComponent>;
  let nativeElement: HTMLElement;
  let message: StreamMessage;
  let currentUser: UserResponse<DefaultStreamChatGenerics>;
  let queryContainer: () => HTMLElement | null;
  let querySender: () => HTMLElement | null;
  let queryDate: () => HTMLElement | null;
  let querySendingIndicator: () => HTMLElement | null;
  let queryDeliveredIndicator: () => HTMLElement | null;
  let queryReadIndicator: () => HTMLElement | null;
  let queryReadByCounter: () => HTMLElement | null;
  let queryAvatar: () => AvatarPlaceholderComponent;
  let queryLastReadUserAvatar: () => AvatarPlaceholderComponent;
  let queryMessageOptions: () => HTMLElement | null;
  let queryActionIcon: () => HTMLElement | null;
  let queryText: () => HTMLElement | null;
  let queryMessageActionsBoxComponent: () =>
    | MessageActionsBoxComponent
    | undefined;
  let queryAttachmentComponent: () => AttachmentListComponent;
  let queryReactionIcon: () => HTMLElement | null;
  let queryMessageReactions: () => MessageReactionsComponent;
  let queryMessageInner: () => HTMLElement | null;
  let queryLoadingIndicator: () => HTMLElement | null;
  let queryDeletedMessageContainer: () => HTMLElement | null;
  let querySystemMessageContainer: () => HTMLElement | null;
  let queryReplyCountButton: () => HTMLButtonElement | null;
  let queryReplyInThreadIcon: () => HTMLElement | null;
  let queryTranslationNotice: () => HTMLElement | null;
  let querySeeOriginalButton: () => HTMLButtonElement | null;
  let querySeeTranslationButton: () => HTMLButtonElement | null;
  let resendMessageSpy: jasmine.Spy;
  let setAsActiveParentMessageSpy: jasmine.Spy;
  let jumpToMessageSpy: jasmine.Spy;
  let bouncedMessage$: BehaviorSubject<StreamMessage | undefined>;

  beforeEach(() => {
    resendMessageSpy = jasmine.createSpy('resendMessage');
    setAsActiveParentMessageSpy = jasmine.createSpy(
      'setAsActiveParentMessageSpy'
    );
    bouncedMessage$ = new BehaviorSubject<StreamMessage | undefined>(undefined);
    jumpToMessageSpy = jasmine.createSpy('jumpToMessage');
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
        AvatarPlaceholderComponent,
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
            resendMessage: resendMessageSpy,
            setAsActiveParentMessage: setAsActiveParentMessageSpy,
            jumpToMessage: jumpToMessageSpy,
            bouncedMessage$,
          },
        },
        {
          provide: ThemeService,
          useValue: { themeVersion: '2' },
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
    queryReadByCounter = () =>
      nativeElement.querySelector('[data-test-id="read-by-length"]');
    queryAvatar = () =>
      fixture.debugElement.query(By.css('[data-testid="avatar"]'))
        ?.componentInstance as AvatarPlaceholderComponent;
    queryLastReadUserAvatar = () =>
      fixture.debugElement.query(
        By.css('[data-test-id="last-read-user-avatar"]')
      ).componentInstance as AvatarPlaceholderComponent;
    queryMessageOptions = () =>
      nativeElement.querySelector('[data-testid=message-options]');
    queryActionIcon = () =>
      nativeElement.querySelector('[data-testid="action-icon"]');
    queryText = () => nativeElement.querySelector('[data-testid="text"]');
    queryReactionIcon = () =>
      nativeElement.querySelector('[data-testid="reaction-icon"]');
    queryMessageReactions = () =>
      fixture.debugElement.query(By.directive(MessageReactionsComponent))
        .componentInstance as MessageReactionsComponent;
    queryMessageInner = () =>
      nativeElement.querySelector('[data-testid="inner-message"]');
    queryLoadingIndicator = () =>
      nativeElement.querySelector('[data-testid="loading-indicator"]');
    queryReplyCountButton = () =>
      nativeElement.querySelector('[data-testid="reply-count-button"]');
    queryReplyInThreadIcon = () =>
      nativeElement.querySelector('[data-testid="reply-in-thread"]');
    message = mockMessage();
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
      ...{ reaction_counts: { wow: 1 } },
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
    component.message.reaction_counts = {};
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

    it('if message is read - only read by one user', () => {
      component.isLastSentMessage = true;
      fixture.detectChanges();
      const readIndicator = queryReadIndicator();
      const deliveredIndicator = queryDeliveredIndicator();
      const lastReadByUserAvatar = queryLastReadUserAvatar();

      expect(readIndicator).not.toBeNull();
      expect(deliveredIndicator).toBeNull();

      expect(
        nativeElement.querySelector('[data-testid="read-by-tooltip"]')
          ?.textContent
      ).toContain(message.readBy[0].name);

      expect(lastReadByUserAvatar.name).toBe(component.lastReadUser?.name);
      expect(lastReadByUserAvatar.type).toBe('user');
      expect(lastReadByUserAvatar.user).toBe(component.lastReadUser);
      expect(lastReadByUserAvatar.location).toBe('message-reader');

      expect(queryReadByCounter()).toBeNull();
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
      component.ngOnChanges({ message: {} as SimpleChange });
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
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();
    const avatar = queryAvatar();

    expect(avatar.name).toContain(senderName);
    expect(avatar.imageUrl).toContain(senderImage);
    expect(avatar.type).toBe('user');
    expect(avatar.location).toBe('message-sender');
    expect(avatar.user).toBe(component.message.user!);
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
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();

    expect(queryAvatar()?.name).toContain(currentUser.id);
    expect(queryLastReadUserAvatar()?.name).toContain(userWithoutName.id);

    component.message = {
      ...message,
      ...{ user: userWithoutName },
    };
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();

    expect(queryAvatar()?.name).toContain(userWithoutName.id);
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
      expect(queryMessageOptions()).toBeNull();
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

  it('should display message options for regular messages', () => {
    expect(queryMessageOptions()).not.toBeNull();
  });

  it('should display message actions for regular messages', () => {
    component.enabledMessageActions = ['delete'];
    component.ngOnChanges({ enabledMessageActions: {} as SimpleChange });
    fixture.detectChanges();

    expect(queryActionIcon()).not.toBeNull();
  });

  it(`shouldn't display message actions if there are no enabled message actions`, () => {
    component.enabledMessageActions = [];
    component.ngOnChanges({ enabledMessageActions: {} as SimpleChange });
    fixture.detectChanges();

    expect(queryActionIcon()).toBeNull();
  });

  it(`shouldn't display message actions if there is no visible message action`, () => {
    component.enabledMessageActions = ['flag-message'];
    component.ngOnChanges({ enabledMessageActions: {} as SimpleChange });
    fixture.detectChanges();

    expect(queryActionIcon()).toBeNull();
  });

  it('should open and close message actions box', () => {
    component.enabledMessageActions = ['update-own-message', 'flag-message'];
    component.ngOnChanges({ enabledMessageActions: {} as SimpleChange });
    fixture.detectChanges();

    expect(queryMessageActionsBoxComponent()).toBeUndefined();

    queryActionIcon()?.click();
    fixture.detectChanges();

    expect(queryMessageActionsBoxComponent()?.isOpen).toBeTrue();
  });

  it('should call custom message actions click handler', () => {
    const service = TestBed.inject(MessageActionsService);
    const spy = jasmine.createSpy();
    service.customActionClickHandler = spy;
    component.enabledMessageActions = ['update-own-message', 'flag-message'];
    component.ngOnChanges({ enabledMessageActions: {} as SimpleChange });
    fixture.detectChanges();

    queryActionIcon()?.click();

    expect(spy).toHaveBeenCalledWith({
      message: component.message,
      enabledActions: component.enabledMessageActions,
      isMine: component.isSentByCurrentUser,
      customActions: component.customActions,
    });
  });

  it('should provide #enabledActions to message actions box', () => {
    component.isActionBoxOpen = true;
    fixture.detectChanges();
    const messageActionsBoxComponent = queryMessageActionsBoxComponent()!;

    expect(messageActionsBoxComponent.enabledActions).toBe(
      component.enabledMessageActions
    );
  });

  it('should provide #isMine to message actions box', () => {
    component.isActionBoxOpen = true;
    fixture.detectChanges();
    const messageActionsBoxComponent = queryMessageActionsBoxComponent()!;

    expect(messageActionsBoxComponent.isMine).toBeTrue();

    component.message = { ...message, ...{ user: { id: 'notcurrentuser' } } };
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();

    expect(messageActionsBoxComponent.isMine).toBeFalse();
  });

  it('should provide #message to message actions box', () => {
    component.isActionBoxOpen = true;
    fixture.detectChanges();
    const messageActionsBoxComponent = queryMessageActionsBoxComponent()!;

    expect(messageActionsBoxComponent.message).toBe(message);
  });

  it('should provide #customActions to message actions box', () => {
    const customActions = [
      {
        actionName: 'forward',
        isVisible: () => true,
        actionHandler: () => {},
        actionLabelOrTranslationKey: 'Forward',
      },
    ];
    component.customActions = customActions;
    component.isActionBoxOpen = true;
    fixture.detectChanges();
    const messageActionsBoxComponent = queryMessageActionsBoxComponent()!;

    expect(messageActionsBoxComponent.customActions).toBe(customActions);
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

  it('should display reactions icon, if user can react to message', () => {
    const message = {
      ...mockMessage(),
      id: 'messagId',
      reaction_counts: { haha: 1 },
      latest_reactions: [
        { type: 'wow', user: { id: 'sara', name: 'Sara', image: 'image/url' } },
        { type: 'sad', user: { id: 'ben', name: 'Ben' } },
      ] as ReactionResponse[],
      own_reactions: [
        { type: 'wow', user: { id: 'sara', name: 'Sara', image: 'image/url' } },
      ] as any as ReactionResponse[],
      text: 'Hi',
    };
    component.message = message as any as StreamMessage;
    component.enabledMessageActions = [];
    component.ngOnChanges({
      enabledMessageActions: {} as SimpleChange,
      message: {} as SimpleChange,
    });
    fixture.detectChanges();

    expect(queryReactionIcon()).toBeNull();

    component.enabledMessageActions = ['send-reaction'];
    component.ngOnChanges({ enabledMessageActions: {} as SimpleChange });
    component.isReactionSelectorOpen = true;
    fixture.detectChanges();
    const messageReactions = queryMessageReactions();

    expect(queryReactionIcon()).not.toBeNull();
    expect(messageReactions.messageId).toBe(message.id);
    expect(messageReactions.latestReactions).toBe(message.latest_reactions);
    expect(messageReactions.messageReactionCounts).toBe(
      message.reaction_counts
    );

    expect(messageReactions.ownReactions).toBe(message.own_reactions);
    expect(messageReactions.isSelectorOpen).toBe(true);

    messageReactions.isSelectorOpenChange.next(false);

    expect(component.isReactionSelectorOpen).toBeFalse();
  });

  it('should toggle reactions selector', () => {
    component.enabledMessageActions = ['send-reaction'];
    component.ngOnChanges({ enabledMessageActions: {} as SimpleChange });
    fixture.detectChanges();

    expect(component.isReactionSelectorOpen).toBeFalse();

    queryReactionIcon()?.click();
    fixture.detectChanges();

    expect(component.isReactionSelectorOpen).toBeTrue();
  });

  it(`shouldn't display empty text`, () => {
    component.message = { ...component.message!, ...{ text: '' } };
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();

    expect(queryText()).toBeNull();
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

    component.message = { ...message, deleted_at: new Date().toISOString() };
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();

    expect(queryDeletedMessageContainer()).not.toBeNull();
    expect(queryAvatar()).toBeUndefined();
    expect(queryMessageOptions()).toBeNull();
  });

  it('should display system message', () => {
    expect(querySystemMessageContainer()).toBeNull();

    component.message = { ...message, type: 'system' };
    fixture.detectChanges();
    const systemMessage = querySystemMessageContainer();

    expect(systemMessage?.innerHTML).toContain(message.text);
  });

  it('should create message parts', () => {
    component.message = {
      text: '',
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual(undefined);
    expect(component.messageText).toEqual('');

    component.message = {
      text: 'This is a message without user mentions',
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual(undefined);
    expect(component.messageText).toEqual(
      'This is a message without user mentions'
    );

    component.message = {
      text: 'This is just an email, not a mention test@test.com',
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual(undefined);
    expect(component.messageText).toEqual(
      'This is just an email, not a mention test@test.com'
    );

    component.message = {
      text: 'This is just an email, not a mention test@test.com',
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual(undefined);
    expect(component.messageText).toEqual(
      'This is just an email, not a mention test@test.com'
    );

    component.message = {
      text: 'Hello @Jack',
      mentioned_users: [{ id: 'jack', name: 'Jack' }],
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual([
      { content: 'Hello ', type: 'text' },
      {
        content: '@Jack',
        type: 'mention',
        user: { id: 'jack', name: 'Jack' },
      },
    ]);

    component.message = {
      text: 'Hello @Jack, how are you?',
      mentioned_users: [{ id: 'jack', name: 'Jack' }],
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual([
      { content: 'Hello ', type: 'text' },
      {
        content: '@Jack',
        type: 'mention',
        user: { id: 'jack', name: 'Jack' },
      },
      { content: ', how are you?', type: 'text' },
    ]);

    component.message = {
      text: 'Hello @Jack and @Lucie, how are you?',
      mentioned_users: [
        { id: 'id2334', name: 'Jack' },
        { id: 'id3444', name: 'Lucie' },
      ],
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual([
      { content: 'Hello ', type: 'text' },
      {
        content: '@Jack',
        type: 'mention',
        user: { id: 'id2334', name: 'Jack' },
      },
      { content: ' and ', type: 'text' },
      {
        content: '@Lucie',
        type: 'mention',
        user: { id: 'id3444', name: 'Lucie' },
      },
      { content: ', how are you?', type: 'text' },
    ]);

    component.message = {
      text: 'https://getstream.io/ this is the link @sara',
      mentioned_users: [{ id: 'sara' }],
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual([
      {
        content:
          '<a href="https://getstream.io/" target="_blank" rel="nofollow">https://getstream.io/</a> this is the link ',
        type: 'text',
      },
      { content: '@sara', type: 'mention', user: { id: 'sara' } },
    ]);

    component.message = {
      text: `This is a message with lots of emojis: 😂😜😂😂, there are compound emojis as well 👨‍👩‍👧`,
      html: `This is a message with lots of emojis: 😂😜😂😂, there are compound emojis as well 👨‍👩‍👧`,
      mentioned_users: [],
    } as any as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    const content = component.messageTextParts![0].content;

    expect(content).toContain('😂');
    expect(content).toContain('😜');
    expect(content).toContain('👨‍👩‍👧');
  });

  it('should add class to emojis in Chrome', () => {
    const chrome = (window as typeof window & { chrome: Object }).chrome;
    (window as typeof window & { chrome: Object }).chrome =
      'the component now will think that this is a chrome browser';
    component.message = {
      text: 'This message contains an emoji 🥑',
      html: 'This message contains an emoji 🥑',
    } as any as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts![0].content).toContain(
      'class="str-chat__emoji-display-fix"'
    );

    component.message = {
      text: '@sara what do you think about 🥑s? ',
      html: '@sara what do you think about 🥑s? ',
      mentioned_users: [{ id: 'sara' }],
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts![2].content).toContain(
      'class="str-chat__emoji-display-fix"'
    );

    // Simulate a browser that isn't Google Chrome
    (window as typeof window & { chrome: Object | undefined }).chrome =
      undefined;

    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts![0].content).not.toContain(
      'class="str-chat__emoji-display-fix"'
    );

    // Revert changes to the window object
    (window as typeof window & { chrome: Object }).chrome = chrome;
  });

  it('should replace URL links inside text content', () => {
    component.message = {
      html: '<p>This is a message with a link <a href="https://getstream.io/" rel="nofollow">https://getstream.io/</a></p>\n',
      text: 'This is a message with a link https://getstream.io/',
    } as any as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts![0].content).toContain(
      ' <a href="https://getstream.io/" target="_blank" rel="nofollow">https://getstream.io/</a>'
    );

    component.message.html = undefined;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts![0].content).toContain(
      '<a href="https://getstream.io/" target="_blank" rel="nofollow">https://getstream.io/</a>'
    );
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

  it('should display reply in thread icon, if user has the necessary capability', () => {
    expect(queryReplyInThreadIcon()).not.toBeNull();

    component.enabledMessageActions = [];
    component.ngOnChanges({ enabledMessageActions: {} as SimpleChange });
    fixture.detectChanges();

    expect(queryReplyInThreadIcon()).toBeNull();
  });

  it('should select parent message, if reply in thread is clicked', () => {
    component.enabledMessageActions = ['send-reply'];
    component.ngOnChanges({ enabledMessageActions: {} as SimpleChange });
    fixture.detectChanges();

    queryReplyInThreadIcon()?.click();
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

    it('should not display message actions for parent meesage', () => {
      expect(queryActionIcon()).toBeNull();
      expect(queryReactionIcon()).toBeNull();
    });

    it('should not display reply count for parent meesage', () => {
      message.reply_count = 5;
      fixture.detectChanges();

      expect(queryReplyCountButton()).toBeNull();
    });

    it(`shouldn't display reply in thread for thread replies`, () => {
      component.enabledMessageActions = ['send-reply'];
      component.message!.parent_id = 'parentMessage';
      component.ngOnChanges({
        message: {} as SimpleChange,
        enabledMessageActions: {} as SimpleChange,
      });
      fixture.detectChanges();

      expect(queryReplyInThreadIcon()).toBeNull();
    });

    it('should display message actions for thread replies', () => {
      component.enabledMessageActions = ['update-any-message'];
      component.message!.parent_id = 'parentMessage';
      component.ngOnChanges({
        message: {} as SimpleChange,
        enabledMessageActions: {} as SimpleChange,
      });
      fixture.detectChanges();

      expect(queryActionIcon()).not.toBeNull();
    });

    it('should display message reactions for thread replies', () => {
      component.enabledMessageActions = ['send-reaction'];
      component.message!.parent_id = 'parentMessage';
      component.ngOnChanges({
        message: {} as SimpleChange,
        enabledMessageActions: {} as SimpleChange,
      });
      fixture.detectChanges();

      expect(queryReactionIcon()).not.toBeNull();
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

    expect(component.visibleMessageActionsCount).toBe(3);

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

    expect(component.visibleMessageActionsCount).toBe(4);

    const customActions = [
      {
        actionName: 'forward',
        isVisible: () => true,
        actionHandler: () => {},
        actionLabelOrTranslationKey: 'Forward',
      },
    ];
    component.customActions = customActions;
    const service = TestBed.inject(MessageActionsService);
    service.customActions$.next(customActions);
    component.ngOnChanges({ customActions: {} as SimpleChange });

    expect(component.visibleMessageActionsCount).toBe(5);
  });

  describe('quoted message', () => {
    const quotedMessageContainerSelector =
      '[data-testid="quoted-message-container"]';
    let quotedMessage: StreamMessage<DefaultStreamChatGenerics>;

    beforeEach(() => {
      quotedMessage = mockMessage();
      quotedMessage.id = 'quoted-message';
      quotedMessage.user = {
        id: 'sara',
        name: 'Sara',
        image: 'http://url/to/img',
      };
      quotedMessage.attachments = [{ id: '1' }, { id: '2' }];
      quotedMessage.text = 'This message was quoted';
      component.message = {
        ...component.message!,
        quoted_message:
          quotedMessage as any as MessageResponseBase<DefaultStreamChatGenerics>,
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
      expect(attachments.attachments).toEqual([{ id: '1' }]);
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

    it(`should display message translation if exists`, () => {
      component.message!.user!.id += 'not';
      component.message!.html = '<p>How are you?</p>';
      component.message!.translation = 'Hogy vagy?';
      component.ngOnChanges({ message: {} as SimpleChange });
      fixture.detectChanges();

      expect(queryText()?.innerHTML).toContain('Hogy vagy?');
    });

    it('should display translation notifce and user should be able to change between translation and original', () => {
      component.message!.user!.id = component.message!.user!.id + 'not';
      component.message!.text = 'How are you?';
      component.message!.html = '<p>How are you?</p>';
      component.message!.translation = 'Hogy vagy?';
      component.ngOnChanges({ message: {} as SimpleChange });
      fixture.detectChanges();

      expect(queryTranslationNotice()).not.toBeNull();
      expect(querySeeTranslationButton()).toBeNull();

      querySeeOriginalButton()?.click();
      fixture.detectChanges();

      expect(queryText()?.innerHTML).toContain('How are you?');

      expect(querySeeOriginalButton()).toBeNull();

      querySeeTranslationButton()?.click();
      fixture.detectChanges();

      expect(queryText()?.innerHTML).toContain('Hogy vagy?');
    });

    it(`shouldn't display translation notice if message isn't translated`, () => {
      component.message!.html = '<p>How are you?</p>';
      component.message!.user = currentUser;
      component.message!.translation = undefined;
      component.ngOnChanges({ message: {} as SimpleChange });
      fixture.detectChanges();

      expect(queryTranslationNotice()).toBeNull();
    });

    it('should respect #displayAs setting', () => {
      component.message = generateMockMessages()[0];
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
  });

  it('should replace URL links inside text content - custom link renderer', () => {
    const service = TestBed.inject(MessageService);
    service.customLinkRenderer = (url) =>
      `<a href="${url}" class="my-special-class">${url}</a>`;
    component.message = {
      html: '<p>This is a message with a link <a href="https://getstream.io/" rel="nofollow">https://getstream.io/</a></p>\n',
      text: 'This is a message with a link https://getstream.io/',
    } as any as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts![0].content).toContain(
      ' <a href="https://getstream.io/" class="my-special-class">https://getstream.io/</a>'
    );
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
});
