import { SimpleChange } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Channel, MessageResponseBase } from 'stream-chat';
import { TextareaComponent } from '../message-input/textarea/textarea.component';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import { textareaInjectionToken } from '../injection-tokens';
import {
  generateMockChannels,
  mockMessage,
  mockStreamChatClient,
  MockStreamChatClient,
} from '../mocks';
import { NotificationService } from '../notification.service';
import { DefaultStreamChatGenerics, StreamMessage } from '../types';

import { MessageActionsBoxComponent } from './message-actions-box.component';
import { MessageActionsService } from '../message-actions.service';

describe('MessageActionsBoxComponent', () => {
  let component: MessageActionsBoxComponent;
  let fixture: ComponentFixture<MessageActionsBoxComponent>;
  let queryQuoteAction: () => HTMLElement | null;
  let queryPinAction: () => HTMLElement | null;
  let queryFlagAction: () => HTMLElement | null;
  let queryMuteAction: () => HTMLElement | null;
  let queryEditAction: () => HTMLElement | null;
  let queryDeleteAction: () => HTMLElement | null;
  let message: StreamMessage;
  let nativeElement: HTMLElement;
  let mockChatClient: MockStreamChatClient;
  let channelService: {
    updateMessage: jasmine.Spy;
    activeChannel$: Observable<Channel<DefaultStreamChatGenerics>>;
    deleteMessage: jasmine.Spy;
    selectMessageToQuote: jasmine.Spy;
    messageToQuote$: Observable<StreamMessage | undefined>;
    pinMessage: jasmine.Spy;
    unpinMessage: jasmine.Spy;
  };

  beforeEach(async () => {
    mockChatClient = mockStreamChatClient();
    channelService = {
      updateMessage: jasmine.createSpy(),
      activeChannel$: new BehaviorSubject(generateMockChannels(1)[0]),
      deleteMessage: jasmine.createSpy(),
      selectMessageToQuote: jasmine.createSpy(),
      messageToQuote$: new Observable(),
      pinMessage: jasmine.createSpy(),
      unpinMessage: jasmine.createSpy(),
    };
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [MessageActionsBoxComponent],
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
    component.ngOnInit();
    message = mockMessage();
    component.message = message;
    component.isOpen = true;
    component.ngOnChanges({
      message: {} as SimpleChange,
      isOpen: {} as SimpleChange,
    });
    nativeElement = fixture.nativeElement as HTMLElement;
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
  });

  it('should only display the #enabledActions', () => {
    component.enabledActions = [];
    component.ngOnChanges({ enabledActions: {} as SimpleChange });
    fixture.detectChanges();

    expect(queryDeleteAction()).toBeNull();
    expect(queryEditAction()).toBeNull();
    expect(queryPinAction()).toBeNull();
    expect(queryMuteAction()).toBeNull();
    expect(queryFlagAction()).toBeNull();
    expect(queryQuoteAction()).toBeNull();

    component.enabledActions = [
      'pin-message',
      'update-any-message',
      'delete-any',
    ];
    component.ngOnChanges({ enabledActions: {} as SimpleChange });
    fixture.detectChanges();

    expect(queryDeleteAction()).not.toBeNull();
    expect(queryEditAction()).not.toBeNull();
    expect(queryPinAction()).not.toBeNull();
    expect(queryMuteAction()).toBeNull();
    expect(queryFlagAction()).toBeNull();
    expect(queryQuoteAction()).toBeNull();
  });

  it(`should only display 'flag-message' action for other user's messages`, () => {
    component.enabledActions = ['flag-message'];
    component.isMine = false;
    component.ngOnChanges({
      enabledActions: {} as SimpleChange,
      isMine: {} as SimpleChange,
    });
    fixture.detectChanges();

    expect(queryFlagAction()).not.toBeNull();

    component.isMine = true;
    component.ngOnChanges({
      isMine: {} as SimpleChange,
    });
    fixture.detectChanges();

    expect(queryFlagAction()).toBeNull();
  });

  it('should handle quote action', () => {
    component.enabledActions = ['quote-message'];
    component.ngOnChanges({ enabledActions: {} as SimpleChange });
    fixture.detectChanges();
    const spy = TestBed.inject(ChannelService).selectMessageToQuote;
    const action = queryQuoteAction();
    action?.click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(component.message);

    component.enabledActions = ['quote-message'];
    component.ngOnChanges({ enabledActions: {} as SimpleChange });
    fixture.detectChanges();
    action?.click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(component.message);
  });

  it(`shouldn't disable quote action, if message already has a quoted message`, () => {
    component.message = {
      ...component.message!,
      quoted_message:
        mockMessage() as any as MessageResponseBase<DefaultStreamChatGenerics>,
    };
    component.enabledActions = ['quote-message'];
    component.ngOnChanges({
      message: {} as SimpleChange,
      enabledActions: {} as SimpleChange,
    });
    fixture.detectChanges();

    expect(queryQuoteAction()).not.toBeNull();
  });

  it('should display the pin action label correctly', () => {
    component.message = { ...message, ...{ pinned: false } };
    component.enabledActions = ['pin-message'];
    component.ngOnChanges({
      message: {} as SimpleChange,
      enabledActions: {} as SimpleChange,
    });
    fixture.detectChanges();
    const pinAction = queryPinAction();

    expect(pinAction?.textContent).toContain('Pin');

    component.message = { ...message, ...{ pinned: true } };
    component.ngOnChanges({ message: {} as SimpleChange });
    fixture.detectChanges();

    expect(pinAction?.textContent).toContain('Unpin');
  });

  it('should handle pin action', () => {
    component.enabledActions = ['pin-message'];
    component.ngOnChanges({ enabledActions: {} as SimpleChange });
    fixture.detectChanges();
    const action = queryPinAction();
    action?.click();
    fixture.detectChanges();

    expect(channelService.pinMessage).toHaveBeenCalledWith(component.message);

    component.message = { ...component.message!, pinned: true };
    action?.click();
    fixture.detectChanges();

    expect(channelService.unpinMessage).toHaveBeenCalledWith(component.message);
  });

  it('should handle flag action', async () => {
    const notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'addTemporaryNotification');
    component.enabledActions = ['flag-message'];
    component.ngOnChanges({ enabledActions: {} as SimpleChange });
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
    component.enabledActions = ['flag-message'];
    component.ngOnChanges({ enabledActions: {} as SimpleChange });
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

  describe('should display edit action', () => {
    it('if #enabledActions contains "edit" and #isMine', () => {
      component.enabledActions = ['update-own-message'];
      component.isMine = false;
      component.ngOnChanges({
        enabledActions: {} as SimpleChange,
        isMine: {} as SimpleChange,
      });
      fixture.detectChanges();

      expect(queryEditAction()).toBeNull();

      component.isMine = true;
      component.ngOnChanges({ isMine: {} as SimpleChange });
      fixture.detectChanges();

      expect(queryEditAction()).not.toBeNull();
    });

    it('if #enabledActions contains "edit-any"', () => {
      component.enabledActions = ['update-any-message'];
      component.isMine = false;
      component.ngOnChanges({
        enabledActions: {} as SimpleChange,
        isMine: {} as SimpleChange,
      });
      fixture.detectChanges();

      expect(queryEditAction()).not.toBeNull();
    });
  });

  it('should emit #isEditing if user starts to edit', () => {
    const spy = jasmine.createSpy();
    const actionsService = TestBed.inject(MessageActionsService);
    actionsService.messageToEdit$.subscribe(spy);
    spy.calls.reset();
    component.enabledActions = [
      'pin-message',
      'update-any-message',
      'delete',
      'flag-message',
    ];
    component.ngOnChanges({
      enabledActions: {} as SimpleChange,
    });
    fixture.detectChanges();
    queryEditAction()?.click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(component.message);
  });

  describe('should display delete action', () => {
    it('if #enabledActions contains "delete" and #isMine', () => {
      component.enabledActions = ['delete'];
      component.isMine = false;
      component.ngOnChanges({
        enabledActions: {} as SimpleChange,
        isMine: {} as SimpleChange,
      });
      fixture.detectChanges();

      expect(queryDeleteAction()).toBeNull();

      component.isMine = true;
      component.ngOnChanges({
        isMine: {} as SimpleChange,
      });
      fixture.detectChanges();

      expect(queryDeleteAction()).not.toBeNull();
    });

    it('if #enabledActions contains "delete-any-message"', () => {
      component.enabledActions = ['delete-any-message'];
      component.isMine = false;
      component.ngOnChanges({
        enabledActions: {} as SimpleChange,
        isMine: {} as SimpleChange,
      });
      fixture.detectChanges();

      expect(queryDeleteAction()).not.toBeNull();
    });
  });

  it('should delete message', () => {
    component.enabledActions = ['delete'];
    component.isMine = true;
    component.ngOnChanges({
      enabledActions: {} as SimpleChange,
      isMine: {} as SimpleChange,
    });
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
    component.ngOnChanges({
      enabledActions: {} as SimpleChange,
    });
    fixture.detectChanges();
    queryDeleteAction()?.click();
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(notificationService.addTemporaryNotification).toHaveBeenCalledWith(
      'streamChat.Error deleting message'
    );
  }));

  it('should display custom message actions', () => {
    const customAction = {
      actionName: 'forward',
      isVisible: () => true,
      actionHandler: () => {},
      actionLabelOrTranslationKey: 'Forward',
    };
    component.customActions = [customAction];
    component.ngOnChanges({ customActions: {} as SimpleChange });

    expect(component.visibleMessageActionItems).toContain(customAction);
  });
});
