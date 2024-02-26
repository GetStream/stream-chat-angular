import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageBouncePromptComponent } from './message-bounce-prompt.component';
import { generateMockMessages } from '../mocks';
import { ChannelService } from '../channel.service';
import { TranslateModule } from '@ngx-translate/core';
import { MessageActionsService } from '../message-actions.service';
import { ModalComponent } from '../modal/modal.component';
import { StreamMessage } from '../types';

describe('MessageBouncePromptComponent', () => {
  let component: MessageBouncePromptComponent;
  let fixture: ComponentFixture<MessageBouncePromptComponent>;
  let channelService: ChannelService;
  let nativeElement: HTMLElement;
  let queryModal: () => HTMLElement | null;
  let queryActionButton: (id: string) => HTMLElement | null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [MessageBouncePromptComponent, ModalComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MessageBouncePromptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    nativeElement = fixture.nativeElement as HTMLElement;
    channelService = TestBed.inject(ChannelService);

    queryModal = () =>
      nativeElement.querySelector('[data-testid="message-bounce-prompt"]');
    queryActionButton = (id: string) =>
      nativeElement.querySelector(`[data-testid="${id}"]`);

    spyOn(channelService, 'resendMessage');
    spyOn(channelService, 'deleteMessage');
  });

  it('should open modal', () => {
    expect(queryModal()).toBeNull();

    const message = generateMockMessages()[0];
    channelService.bouncedMessage$.next(message);
    fixture.detectChanges();

    expect(component.message).toBe(message);

    expect(queryModal()).not.toBeNull();
  });

  it('should close modal', () => {
    const message = generateMockMessages()[0];
    channelService.bouncedMessage$.next(message);
    fixture.detectChanges();

    expect(queryModal()).not.toBeNull();

    component.messageBounceModalOpenChanged(false);
    fixture.detectChanges();

    expect(queryModal()).toBeNull();
  });

  describe('modal actions', () => {
    let message: StreamMessage;

    beforeEach(() => {
      message = generateMockMessages()[0];
      channelService.bouncedMessage$.next(message);
      fixture.detectChanges();
    });

    it('should edit message', () => {
      const messageActionsService = TestBed.inject(MessageActionsService);
      const spy = jasmine.createSpy();
      messageActionsService.messageToEdit$.subscribe(spy);
      spy.calls.reset();
      queryActionButton('message-bounce-edit')?.click();
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledWith(message);
      expect(component.message).toBe(undefined);
      expect(component.isModalOpen).toBe(false);
    });

    it('should resend message', async () => {
      queryActionButton('message-bounce-send')?.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(channelService.resendMessage).toHaveBeenCalledWith(message);
      expect(component.message).toBe(undefined);
      expect(component.isModalOpen).toBe(false);
    });

    it('should delete message', async () => {
      queryActionButton('message-bounce-delete')?.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(channelService.deleteMessage).toHaveBeenCalledWith(message, true);
      expect(component.message).toBe(undefined);
      expect(component.isModalOpen).toBe(false);
    });
  });
});
