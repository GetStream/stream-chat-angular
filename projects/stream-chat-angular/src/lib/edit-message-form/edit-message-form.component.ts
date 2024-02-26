import {
  Component,
  HostBinding,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CustomTemplatesService } from '../custom-templates.service';
import { MessageInputContext, ModalContext, StreamMessage } from '../types';
import { Observable, Subject, Subscription } from 'rxjs';
import { MessageActionsService } from '../message-actions.service';

/**
 * The edit message form displays a modal that's opened when a user edits a message. The component uses the [`MessageActionsService`](../../services/MessageActionsService) to know which message is being edited.
 *
 * By default this is displayed within the [`stream-channel` component](../../components/ChannelComponent).
 */
@Component({
  selector: 'stream-edit-message-form',
  templateUrl: './edit-message-form.component.html',
  styles: [],
})
export class EditMessageFormComponent implements OnInit, OnDestroy {
  @HostBinding() class = 'str-chat-angular__edit-message-form';
  sendMessage$: Observable<void>;
  isModalOpen = false;
  message?: StreamMessage;
  @ViewChild('editMessageForm', { static: true })
  private modalContent!: TemplateRef<void>;
  private sendMessageSubject = new Subject<void>();
  private subscriptions: Subscription[] = [];

  constructor(
    readonly customTemplatesService: CustomTemplatesService,
    private messageActionsService: MessageActionsService
  ) {
    this.sendMessage$ = this.sendMessageSubject.asObservable();
  }

  ngOnInit(): void {
    this.messageActionsService.messageToEdit$.subscribe((message) => {
      if ((message && !this.isModalOpen) || (!message && this.isModalOpen)) {
        this.message = message;
        this.isModalOpen = !!message;
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  getEditModalContext(): ModalContext {
    return {
      isOpen: this.isModalOpen,
      isOpenChangeHandler: (isOpen) => {
        this.isModalOpen = isOpen;
        if (!this.isModalOpen) {
          this.dismissed();
        }
      },
      content: this.modalContent,
    };
  }

  getMessageInputContext(): MessageInputContext {
    return {
      message: this.message,
      messageUpdateHandler: () => {
        this.dismissed();
      },
      isFileUploadEnabled: undefined,
      areMentionsEnabled: undefined,
      isMultipleFileUploadEnabled: undefined,
      mentionScope: undefined,
      mode: undefined,
      sendMessage$: this.sendMessage$,
    };
  }

  sendClicked() {
    this.sendMessageSubject.next();
  }

  dismissed() {
    this.isModalOpen = false;
    this.message = undefined;
    this.messageActionsService.messageToEdit$.next(undefined);
  }
}
