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
import { mockCurrentUser, mockMessage } from '../mocks';
import { AttachmentListComponent } from '../attachment-list/attachment-list.component';
import { MessageReactionsComponent } from '../message-reactions/message-reactions.component';
import { TranslateModule } from '@ngx-translate/core';
import { ChannelService } from '../channel.service';
import { SimpleChange } from '@angular/core';
import { AvatarPlaceholderComponent } from '../avatar-placeholder/avatar-placeholder.component';

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
  let messageActionsBoxComponent: MessageActionsBoxComponent;
  let queryAttachmentComponent: () => AttachmentListComponent;
  let queryReactionIcon: () => HTMLElement | null;
  let queryMessageReactions: () => MessageReactionsComponent;
  let queryMessageInner: () => HTMLElement | null;
  let queryLoadingIndicator: () => HTMLElement | null;
  let queryDeletedMessageContainer: () => HTMLElement | null;
  let querySystemMessageContainer: () => HTMLElement | null;
  let queryMessageActionsContainer: () => HTMLElement | null;
  let queryReplyCountButton: () => HTMLButtonElement | null;
  let queryReplyInThreadIcon: () => HTMLElement | null;
  let resendMessageSpy: jasmine.Spy;
  let setAsActiveParentMessageSpy: jasmine.Spy;

  beforeEach(() => {
    resendMessageSpy = jasmine.createSpy('resendMessage');
    setAsActiveParentMessageSpy = jasmine.createSpy(
      'setAsActiveParentMessageSpy'
    );
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
          useValue: { chatClient: { user: currentUser } },
        },
        {
          provide: ChannelService,
          useValue: {
            resendMessage: resendMessageSpy,
            setAsActiveParentMessage: setAsActiveParentMessageSpy,
          },
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
    queryMessageActionsContainer = () =>
      nativeElement.querySelector('[data-testid="message-actions-container"]');
    queryReplyCountButton = () =>
      nativeElement.querySelector('[data-testid="reply-count-button"]');
    queryReplyInThreadIcon = () =>
      nativeElement.querySelector('[data-testid="reply-in-thread"]');
    message = mockMessage();
    component.message = message;
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();
    messageActionsBoxComponent = fixture.debugElement.query(
      By.directive(MessageActionsBoxComponent)
    )?.componentInstance as MessageActionsBoxComponent;
    queryAttachmentComponent = () =>
      fixture.debugElement.query(By.directive(AttachmentListComponent))
        ?.componentInstance as AttachmentListComponent;
    queryDeletedMessageContainer = () =>
      nativeElement.querySelector('[data-testid="message-deleted-component"]');
    querySystemMessageContainer = () =>
      nativeElement.querySelector('[data-testid="system-message"]');
    component.enabledMessageActions = [
      'read-events',
      'send-reaction',
      'send-reply',
    ];
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
    component.message.reaction_counts = {};
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
    fixture.detectChanges();

    expect(queryAvatar()?.name).toContain(currentUser.id);
    expect(queryLastReadUserAvatar()?.name).toContain(userWithoutName.id);

    component.message = {
      ...message,
      ...{ user: userWithoutName },
    };
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
    component.enabledMessageActions = ['flag-message'];
    fixture.detectChanges();

    expect(queryActionIcon()).toBeNull();
  });

  it('should open and close message actions box', () => {
    component.enabledMessageActions = ['update-own-message', 'flag-message'];
    fixture.detectChanges();

    expect(messageActionsBoxComponent.isOpen).toBeFalse();

    queryActionIcon()?.click();
    fixture.detectChanges();

    expect(messageActionsBoxComponent.isOpen).toBeTrue();
  });

  it('should close message actions box on mouseleave event', () => {
    component.enabledMessageActions = ['update-own-message', 'flag-message'];
    component.isActionBoxOpen = true;
    fixture.detectChanges();

    queryContainer()?.dispatchEvent(new Event('mouseleave'));
    fixture.detectChanges();

    expect(component.isActionBoxOpen).toBeFalse();
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
    component.message!.parent_id = 'parent-id';
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
    fixture.detectChanges();

    expect(queryText()).toBeNull();
  });

  it('should display HTML content', () => {
    const htmlContent =
      '<a href="https://getstream.io/">https://getstream.io/</a>';
    component.message = { ...component.message!, ...{ html: htmlContent } };
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();

    expect(queryText()?.innerHTML).toContain(htmlContent);
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

  it('should apply CSS class to actions if message is being edited', () => {
    const cssClass =
      'str-chat-angular__message-simple__actions__action--options--editing';
    const container = queryMessageActionsContainer();

    expect(container?.classList.contains(cssClass)).toBeFalse();

    component.isEditing = true;
    fixture.detectChanges();

    expect(container?.classList.contains(cssClass)).toBeTrue();
  });

  it('should watch for #isEditing event', () => {
    component.isEditing = false;
    fixture.detectChanges();
    messageActionsBoxComponent.isEditing.emit(true);
    fixture.detectChanges();

    expect(component.isEditing).toBeTrue();
  });

  it('should create message parts', () => {
    component.message = {
      text: '',
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual([]);

    component.message = {
      text: 'This is a message without user mentions',
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual([
      { content: 'This is a message without user mentions', type: 'text' },
    ]);

    component.message = {
      text: 'This is just an email, not a mention test@test.com',
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual([
      {
        content: 'This is just an email, not a mention test@test.com',
        type: 'text',
      },
    ]);

    component.message = {
      html: '<p>This is just an email, not a mention test@test.com</p>\n',
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual([
      {
        content: 'This is just an email, not a mention test@test.com',
        type: 'text',
      },
    ]);

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
      html: `<p><a href="https://getstream.io/">https://getstream.io/</a> this is the link @sara</p>\n`,
      mentioned_users: [{ id: 'sara' }],
    } as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    expect(component.messageTextParts).toEqual([
      {
        content:
          '<a href="https://getstream.io/">https://getstream.io/</a> this is the link ',
        type: 'text',
      },
      { content: '@sara', type: 'mention', user: { id: 'sara' } },
    ]);

    component.message = {
      html: `This is a message with lots of emojis: 😂😜😂😂, there are compound emojis as well 👨‍👩‍👧`,
      mentioned_users: [],
    } as any as StreamMessage;
    component.ngOnChanges({ message: {} as SimpleChange });

    const content = component.messageTextParts[0].content;

    expect(content).toContain('😂');
    expect(content).toContain('😜');
    expect(content).toContain('👨‍👩‍👧');
  });

  it('should display reply count for parent messages', () => {
    expect(queryReplyCountButton()).toBeNull();

    component.message = { ...message, reply_count: 1 };
    fixture.detectChanges();

    expect(queryReplyCountButton()).not.toBeNull();
    expect(queryReplyCountButton()?.innerHTML).toContain('streamChat.1 reply');
  });

  it('should select parent message if reply count is clicked', () => {
    expect(queryReplyCountButton()).toBeNull();

    component.message = { ...message, reply_count: 1 };
    fixture.detectChanges();
    queryReplyCountButton()?.click();
    fixture.detectChanges();

    expect(setAsActiveParentMessageSpy).toHaveBeenCalledWith(component.message);
  });

  it(`shouldn't display reply count for parent messages if user doesn't have the necessary capability`, () => {
    component.message = { ...message, reply_count: 1 };
    component.enabledMessageActions = [];
    component.ngOnChanges({ enabledMessageActions: {} as SimpleChange });
    fixture.detectChanges();

    expect(queryReplyCountButton()).toBeNull();
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
        enabledMessageActions: {} as SimpleChange,
      });
      fixture.detectChanges();

      expect(queryReplyInThreadIcon()).toBeNull();
    });

    it('should display message actions for thread replies', () => {
      component.enabledMessageActions = ['update-any-message'];
      component.message!.parent_id = 'parentMessage';
      component.ngOnChanges({
        enabledMessageActions: {} as SimpleChange,
      });
      fixture.detectChanges();

      expect(queryActionIcon()).not.toBeNull();
    });

    it('should display message reactions for thread replies', () => {
      component.enabledMessageActions = ['send-reaction'];
      component.message!.parent_id = 'parentMessage';
      component.ngOnChanges({
        enabledMessageActions: {} as SimpleChange,
      });
      fixture.detectChanges();

      expect(queryReactionIcon()).not.toBeNull();
    });
  });

  describe('quoted message', () => {
    const quotedMessageContainerSelector =
      '[data-testid="quoted-message-container"]';

    beforeEach(() => {
      const quotedMessage = mockMessage();
      quotedMessage.id = 'quoted-message';
      quotedMessage.user = { id: 'sara', name: 'Sara', image: 'url/to/img' };
      quotedMessage.attachments = [{ id: '1' }, { id: '2' }];
      quotedMessage.text = 'This message was quoted';
      component.message = {
        ...component.message!,
        quoted_message: quotedMessage as any as MessageResponseBase,
      };
      fixture.detectChanges();
      component.ngOnChanges({ message: {} as SimpleChange });
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
      fixture.detectChanges();

      expect(quotedMessageContainer?.classList).not.toContain('mine');
    });
  });
});
