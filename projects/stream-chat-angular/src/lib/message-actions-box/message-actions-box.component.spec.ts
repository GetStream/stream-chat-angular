import { SimpleChange } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Channel } from 'stream-chat';
import { TextareaComponent } from '../message-input/textarea/textarea.component';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import { textareaInjectionToken } from '../injection-tokens';
import { MessageInputComponent } from '../message-input/message-input.component';
import { TextareaDirective } from '../message-input/textarea.directive';
import {
  generateMockChannels,
  mockMessage,
  mockStreamChatClient,
  MockStreamChatClient,
} from '../mocks';
import { ModalComponent } from '../modal/modal.component';
import { NotificationService } from '../notification.service';
import { StreamMessage } from '../types';

import { MessageActionsBoxComponent } from './message-actions-box.component';

describe('MessageActionsBoxComponent', () => {
  let component: MessageActionsBoxComponent;
  let fixture: ComponentFixture<MessageActionsBoxComponent>;
  let queryActionBox: () => HTMLElement | null;
  let queryQuoteAction: () => HTMLElement | null;
  let queryPinAction: () => HTMLElement | null;
  let queryFlagAction: () => HTMLElement | null;
  let queryMuteAction: () => HTMLElement | null;
  let queryEditAction: () => HTMLElement | null;
  let queryDeleteAction: () => HTMLElement | null;
  let queryEditModal: () => ModalComponent;
  let queryModalCancelButton: () => HTMLElement | null;
  let queryModalSendButton: () => HTMLElement | null;
  let queryMessageInputComponent: () => MessageInputComponent;
  let message: StreamMessage;
  let nativeElement: HTMLElement;
  let mockChatClient: MockStreamChatClient;
  let channelService: {
    updateMessage: jasmine.Spy;
    activeChannel$: Observable<Channel>;
    deleteMessage: jasmine.Spy;
  };

  beforeEach(async () => {
    mockChatClient = mockStreamChatClient();
    channelService = {
      updateMessage: jasmine.createSpy(),
      activeChannel$: new BehaviorSubject(generateMockChannels(1)[0]),
      deleteMessage: jasmine.createSpy(),
    };
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [
        MessageActionsBoxComponent,
        ModalComponent,
        MessageInputComponent,
        TextareaComponent,
        TextareaDirective,
      ],
      providers: [
        { provide: ChatClientService, useValue: mockChatClient },
        { provide: ChannelService, useValue: channelService },
        {
          provide: textareaInjectionToken,
          useValue: TextareaComponent,
        },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MessageActionsBoxComponent);
    component = fixture.componentInstance;
    message = mockMessage();
    component.message = message;
    nativeElement = fixture.nativeElement as HTMLElement;
    queryActionBox = () =>
      nativeElement.querySelector('[data-testid="action-box"]');
    queryQuoteAction = () =>
      nativeElement.querySelector('[data-testid="quote-action"]');
    queryPinAction = () =>
      nativeElement.querySelector('[data-testid="pin-action"]');
    queryFlagAction = () =>
      nativeElement.querySelector('[data-testid="flag-action"]');
    queryMuteAction = () =>
      nativeElement.querySelector('[data-testid="mute-action"]');
    queryEditAction = () =>
      nativeElement.querySelector('[data-testid="edit-action"]');
    queryDeleteAction = () =>
      nativeElement.querySelector('[data-testid="delete-action"]');
    queryEditModal = () =>
      fixture.debugElement.query(By.directive(ModalComponent))
        .componentInstance as ModalComponent;
    queryModalCancelButton = () =>
      nativeElement.querySelector('[data-testid="cancel-button"]');
    queryModalSendButton = () =>
      nativeElement.querySelector('[data-testid="send-button"]');
    queryMessageInputComponent = () =>
      fixture.debugElement.query(By.directive(MessageInputComponent))
        .componentInstance as MessageInputComponent;
  });

  it('should apply the necessary CSS classes based on #isOpen', () => {
    component.isOpen = true;
    fixture.detectChanges();
    const actionBox = queryActionBox();
    const isOpenClass = 'str-chat__message-actions-box--open';

    expect(actionBox?.classList.contains(isOpenClass)).toBeTrue();

    component.isOpen = false;
    fixture.detectChanges();

    expect(actionBox?.classList.contains(isOpenClass)).toBeFalse();
  });

  it('should apply the necessary CSS classes based on #isMine', () => {
    component.isMine = true;
    fixture.detectChanges();
    const actionBox = queryActionBox();
    const isMineClass = 'str-chat__message-actions-box--mine';

    expect(actionBox?.classList.contains(isMineClass)).toBeTrue();

    component.isMine = false;
    fixture.detectChanges();

    expect(actionBox?.classList.contains(isMineClass)).toBeFalse();
  });

  it('should only display the #enabledActions', () => {
    component.enabledActions = [];
    fixture.detectChanges();

    expect(queryDeleteAction()).toBeNull();
    expect(queryEditAction()).toBeNull();
    expect(queryPinAction()).toBeNull();
    expect(queryMuteAction()).toBeNull();
    expect(queryFlagAction()).toBeNull();
    expect(queryQuoteAction()).toBeNull();

    component.enabledActions = ['pin', 'edit-any', 'delete-any'];
    fixture.detectChanges();

    expect(queryDeleteAction()).not.toBeNull();
    expect(queryEditAction()).not.toBeNull();
    expect(queryPinAction()).not.toBeNull();
    expect(queryMuteAction()).toBeNull();
    expect(queryFlagAction()).toBeNull();
    expect(queryQuoteAction()).toBeNull();
  });

  it(`should only display 'flag' action for other user's messages`, () => {
    component.enabledActions = ['flag-message'];
    component.isMine = false;
    fixture.detectChanges();

    expect(queryFlagAction()).not.toBeNull();

    component.isMine = true;
    fixture.detectChanges();

    expect(queryFlagAction()).toBeNull();
  });

  it('should handle quote action', () => {
    component.enabledActions = ['quote'];
    fixture.detectChanges();
    spyOn(window, 'alert').and.callThrough();
    const action = queryQuoteAction();
    action?.click();
    fixture.detectChanges();

    expect(window.alert).toHaveBeenCalledWith(jasmine.anything());
  });

  it('should display the pin action label correctly', () => {
    component.message = { ...message, ...{ pinned: false } };
    component.enabledActions = ['pin'];
    fixture.detectChanges();
    const pinAction = queryPinAction();

    expect(pinAction?.textContent).toContain('Pin');

    component.message = { ...message, ...{ pinned: true } };
    fixture.detectChanges();

    expect(pinAction?.textContent).toContain('Unpin');
  });

  it('should handle pin action', () => {
    component.enabledActions = ['pin'];
    fixture.detectChanges();
    spyOn(window, 'alert').and.callThrough();
    const action = queryPinAction();
    action?.click();
    fixture.detectChanges();

    expect(window.alert).toHaveBeenCalledWith(jasmine.anything());
  });

  it('should handle mute action', () => {
    component.enabledActions = ['mute'];
    fixture.detectChanges();
    spyOn(window, 'alert').and.callThrough();
    const action = queryMuteAction();
    action?.click();
    fixture.detectChanges();

    expect(window.alert).toHaveBeenCalledWith(jasmine.anything());
  });

  it('should handle flag action', async () => {
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    component.enabledActions = ['flag'];
    fixture.detectChanges();
    const action = queryFlagAction();
    action?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockChatClient.flagMessage).toHaveBeenCalledWith(message.id);
    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Message has been successfully flagged',
      'success'
    );
  });

  it(`should display error message, if flag action wasn't successful`, async () => {
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    mockChatClient.flagMessage.and.rejectWith();
    component.enabledActions = ['flag'];
    fixture.detectChanges();
    const action = queryFlagAction();
    action?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockChatClient.flagMessage).toHaveBeenCalledWith(message.id);
    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Error adding flag'
    );
  });

  it('should emit the number of displayed actions', () => {
    component.enabledActions = [
      'pin',
      'update-own-message',
      'delete-own-message',
      'flag',
    ];
    component.isMine = true;
    const spy = jasmine.createSpy();
    component.displayedActionsCount.subscribe(spy);
    component.ngOnChanges({
      isMine: {} as any as SimpleChange,
      enabledActions: {} as any as SimpleChange,
    });
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(3);

    spy.calls.reset();
    component.enabledActions = [
      'pin',
      'update-any-message',
      'delete',
      'flag',
      'quote',
      'mute',
    ];
    component.isMine = false;
    component.ngOnChanges({
      isMine: {} as any as SimpleChange,
      enabledActions: {} as any as SimpleChange,
    });
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(5);
  });

  describe('should display edit action', () => {
    it('if #enabledActions contains "edit" and #isMine', () => {
      component.enabledActions = ['edit'];
      component.isMine = false;
      fixture.detectChanges();

      expect(queryEditAction()).toBeNull();

      component.isMine = true;
      fixture.detectChanges();

      expect(queryEditAction()).not.toBeNull();
    });

    it('if #enabledActions contains "edit-any"', () => {
      component.enabledActions = ['edit-any'];
      component.isMine = false;
      fixture.detectChanges();

      expect(queryEditAction()).not.toBeNull();
    });
  });

  describe('should display delete action', () => {
    it('if #enabledActions contains "delete" and #isMine', () => {
      component.enabledActions = ['delete'];
      component.isMine = false;
      fixture.detectChanges();

      expect(queryDeleteAction()).toBeNull();

      component.isMine = true;
      fixture.detectChanges();

      expect(queryDeleteAction()).not.toBeNull();
    });

    it('if #enabledActions contains "delete-any-message"', () => {
      component.enabledActions = ['delete-any-message'];
      component.isMine = false;
      fixture.detectChanges();

      expect(queryDeleteAction()).not.toBeNull();
    });
  });

  it('should emit #isEditing if user starts to edit', () => {
    const spy = jasmine.createSpy();
    component.isEditing.subscribe(spy);
    component.enabledActions = ['pin', 'edit-any', 'delete', 'flag'];
    fixture.detectChanges();
    queryEditAction()?.click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(true);
  });

  it('should open modal if user starts to edit', () => {
    component.enabledActions = ['edit'];
    component.isMine = true;
    fixture.detectChanges();
    queryEditAction()?.click();
    fixture.detectChanges();

    expect(queryEditModal().isOpen).toBeTrue();
  });

  it('should display message input if user starts to edit', () => {
    component.enabledActions = ['edit-any'];
    fixture.detectChanges();
    queryEditAction()?.click();
    fixture.detectChanges();

    expect(queryMessageInputComponent().message).toBe(component.message);
  });

  it('should call update message if "Send" button is clicked', () => {
    component.enabledActions = ['edit-any'];
    component.isEditModalOpen = true;
    fixture.detectChanges();
    const messageInputComponent = queryMessageInputComponent();
    spyOn(messageInputComponent, 'messageSent');
    queryEditAction()?.click();
    fixture.detectChanges();
    queryModalSendButton()?.click();
    fixture.detectChanges();

    expect(messageInputComponent.messageSent).toHaveBeenCalledWith();
  });

  it('should close modal with "Cancel" button', () => {
    component.enabledActions = ['edit'];
    component.isMine = true;
    fixture.detectChanges();
    const spy = jasmine.createSpy();
    component.isEditing.subscribe(spy);
    queryEditAction()?.click();
    fixture.detectChanges();
    queryModalCancelButton()?.click();
    fixture.detectChanges();

    expect(queryEditModal().isOpen).toBeFalse();
    expect(spy).toHaveBeenCalledWith(false);
  });

  it('should update #isEditModalOpen if modal is closed', () => {
    component.enabledActions = ['edit'];
    component.isMine = true;
    component.isEditModalOpen = true;
    fixture.detectChanges();
    const spy = jasmine.createSpy();
    component.isEditing.subscribe(spy);
    queryEditAction()?.click();
    fixture.detectChanges();
    queryEditModal().close();
    fixture.detectChanges();

    expect(component.isEditModalOpen).toBeFalse();
    expect(spy).toHaveBeenCalledWith(false);
  });

  it('should close modal if message was updated successfully', () => {
    component.enabledActions = ['edit'];
    component.isMine = true;
    fixture.detectChanges();
    queryEditAction()?.click();
    fixture.detectChanges();
    const spy = jasmine.createSpy();
    component.isEditing.subscribe(spy);
    const messageInputComponent = queryMessageInputComponent();

    messageInputComponent.messageUpdate.emit();
    fixture.detectChanges();

    expect(queryEditModal().isOpen).toBeFalse();
    expect(spy).toHaveBeenCalledWith(false);
  });

  it('should delete message', () => {
    component.enabledActions = ['delete'];
    component.isMine = true;
    fixture.detectChanges();
    queryDeleteAction()?.click();
    fixture.detectChanges();

    expect(channelService.deleteMessage).toHaveBeenCalledWith(
      component.message
    );
  });

  it(`should display error notification if message couldn't be deleted`, fakeAsync(() => {
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    channelService.deleteMessage.and.rejectWith(new Error('Error'));
    component.enabledActions = ['delete-any'];
    fixture.detectChanges();
    queryDeleteAction()?.click();
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Error deleting message'
    );
  }));
});
