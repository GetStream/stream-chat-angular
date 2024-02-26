import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditMessageFormComponent } from './edit-message-form.component';
import { MessageInputComponent } from '../message-input/message-input.component';
import { ModalComponent } from '../modal/modal.component';
import { By } from '@angular/platform-browser';
import { MessageActionsService } from '../message-actions.service';
import { generateMockMessages } from '../mocks';
import { StreamMessage } from '../types';
import { TextareaComponent } from '../message-input/textarea/textarea.component';
import { TextareaDirective } from '../message-input/textarea.directive';
import { textareaInjectionToken } from '../injection-tokens';

describe('EditMessageFormComponent', () => {
  let component: EditMessageFormComponent;
  let fixture: ComponentFixture<EditMessageFormComponent>;
  let nativeElement: HTMLElement;
  let queryEditModal: () => ModalComponent | undefined;
  let queryModalCancelButton: () => HTMLElement | null;
  let queryMessageInputComponent: () => MessageInputComponent;
  let messageActionsService: MessageActionsService;
  let message: StreamMessage;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        EditMessageFormComponent,
        ModalComponent,
        MessageInputComponent,
        TextareaComponent,
        TextareaDirective,
      ],
      providers: [
        {
          provide: textareaInjectionToken,
          useValue: TextareaComponent,
        },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditMessageFormComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    queryEditModal = () =>
      fixture.debugElement.query(By.directive(ModalComponent))
        ?.componentInstance as ModalComponent | undefined;
    queryModalCancelButton = () =>
      nativeElement.querySelector('[data-testid="cancel-button"]');
    queryMessageInputComponent = () =>
      fixture.debugElement.query(By.directive(MessageInputComponent))
        .componentInstance as MessageInputComponent;
    messageActionsService = TestBed.inject(MessageActionsService);
    message = generateMockMessages()[0];
  });

  it('should open modal if user starts to edit', () => {
    expect(queryEditModal()?.isOpen).toBeFalsy();

    messageActionsService.messageToEdit$.next(message);
    fixture.detectChanges();

    expect(component.isModalOpen).toBe(true);
    expect(queryEditModal()?.isOpen).toBeTrue();
  });

  it('should display message input if user starts to edit', () => {
    messageActionsService.messageToEdit$.next(message);
    fixture.detectChanges();

    expect(queryMessageInputComponent().message).toBe(message);
    expect(queryMessageInputComponent().sendMessage$).toBe(
      component.sendMessage$
    );
  });

  it('should trigger message if "Send" button is clicked', () => {
    const spy = jasmine.createSpy();
    component.sendMessage$.subscribe(spy);
    component.sendClicked();

    expect(spy).toHaveBeenCalledWith(undefined);
  });

  it('should close modal with "Cancel" button', () => {
    const spy = jasmine.createSpy();
    messageActionsService.messageToEdit$.subscribe(spy);
    messageActionsService.messageToEdit$.next(message);
    fixture.detectChanges();
    spy.calls.reset();
    queryModalCancelButton()?.click();
    fixture.detectChanges();

    expect(queryEditModal()).toBeUndefined();
    expect(spy).toHaveBeenCalledWith(undefined);
  });

  it('should close modal if message was updated successfully', () => {
    messageActionsService.messageToEdit$.next(message);
    fixture.detectChanges();
    const spy = jasmine.createSpy();
    messageActionsService.messageToEdit$.subscribe(spy);
    spy.calls.reset();
    const messageInputComponent = queryMessageInputComponent();

    messageInputComponent.messageUpdate.emit();
    fixture.detectChanges();

    expect(queryEditModal()).toBeUndefined();
    expect(spy).toHaveBeenCalledWith(undefined);
  });
});
