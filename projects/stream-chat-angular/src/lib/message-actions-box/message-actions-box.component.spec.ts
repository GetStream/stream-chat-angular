import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ChatClientService } from '../chat-client.service';
import {
  mockMessage,
  mockStreamChatClient,
  MockStreamChatClient,
} from '../mocks';
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
  let message: StreamMessage;
  let nativeElement: HTMLElement;
  let mockChatClient: MockStreamChatClient;

  beforeEach(async () => {
    mockChatClient = mockStreamChatClient();
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [MessageActionsBoxComponent],
      providers: [{ provide: ChatClientService, useValue: mockChatClient }],
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

    component.enabledActions = ['pin', 'edit', 'delete'];
    fixture.detectChanges();

    expect(queryDeleteAction()).not.toBeNull();
    expect(queryEditAction()).not.toBeNull();
    expect(queryPinAction()).not.toBeNull();
    expect(queryMuteAction()).toBeNull();
    expect(queryFlagAction()).toBeNull();
    expect(queryQuoteAction()).toBeNull();
  });

  it(`should only display 'flag' action for other user's messages`, () => {
    component.enabledActions = ['flag'];
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

  it('should handle edit action', () => {
    component.enabledActions = ['edit'];
    fixture.detectChanges();
    spyOn(window, 'alert').and.callThrough();
    const action = queryEditAction();
    action?.click();
    fixture.detectChanges();

    expect(window.alert).toHaveBeenCalledWith(jasmine.anything());
  });

  it('should handle delete action', () => {
    component.enabledActions = ['delete'];
    fixture.detectChanges();
    spyOn(window, 'alert').and.callThrough();
    const action = queryDeleteAction();
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
      'Message has been successfully flagged',
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
      'Error adding flag'
    );
  });
});
