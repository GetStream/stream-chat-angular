import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import { MessageInputComponent } from '../message-input/message-input.component';
import { NotificationService } from '../notification.service';
import { StreamMessage } from '../types';

/**
 * @deprecated https://getstream.io/chat/docs/sdk/angular/components/message-actions/#required-enabledactions
 */
export type MessageActions =
  | 'edit'
  | 'delete'
  | 'edit-any'
  | 'delete-any'
  | 'pin'
  | 'quote'
  | 'flag'
  | 'mute';

/**
 * The `MessageActionsBox` component displays a list of message actions (i.e edit), that can be opened or closed. You can find the [list of the supported actions](../concepts/message-interactions.mdx) in the message interaction guide.
 */
@Component({
  selector: 'stream-message-actions-box',
  templateUrl: './message-actions-box.component.html',
  styles: [],
})
export class MessageActionsBoxComponent implements OnChanges {
  /**
   * The input used for message edit. By default, the [default message input component](./MessageInputComponent.mdx) is used. To change the input for message edit, provide [your own custom template](./MessageInputComponent.mdx/#customization).
   */
  @Input() messageInputTemplate: TemplateRef<any> | undefined;
  /**
   * Indicates if the list should be opened or closed. Adding a UI element to open and close the list is the parent's component responsibility.
   */
  @Input() isOpen = false;
  /**
   * Indicates if the message actions are belonging to a message that was sent by the current user or not.
   */
  @Input() isMine = false;
  /**
   * The message the actions will be executed on
   */
  @Input() message: StreamMessage | undefined;
  /**
   * The list of [channel capabilities](https://getstream.io/chat/docs/javascript/channel_capabilities/?language=javascript) that are enabled for the current user, the list of [supported interactions](../concepts/message-interactions.mdx) can be found in our message interaction guide. Unathorized actions won't be displayed on the UI.
   */
  @Input() enabledActions: string[] = [];
  /**
   * The number of authorized actions (it can be less or equal than the number of enabled actions)
   */
  @Output() readonly displayedActionsCount = new EventEmitter<number>();
  /**
   * An event which emits `true` if the edit message modal is open, and `false` when it is closed.
   */
  @Output() readonly isEditing = new EventEmitter<boolean>();
  isEditModalOpen = false;
  @ViewChild(MessageInputComponent) private messageInput:
    | MessageInputComponent
    | undefined;

  constructor(
    private chatClientService: ChatClientService,
    private notificationService: NotificationService,
    private channelService: ChannelService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.isMine || changes.enabledActions) {
      let displayedActionsCount = 0;
      if (this.isQuoteVisible) {
        displayedActionsCount++;
      }
      if (this.isEditVisible) {
        displayedActionsCount++;
      }
      if (this.isDeleteVisible) {
        displayedActionsCount++;
      }
      if (this.isMuteVisible) {
        displayedActionsCount++;
      }
      if (this.isFlagVisible) {
        displayedActionsCount++;
      }
      if (this.isPinVisible) {
        displayedActionsCount++;
      }
      this.displayedActionsCount.next(displayedActionsCount);
    }
  }

  get isQuoteVisible() {
    return (
      (this.enabledActions.indexOf('quote') !== -1 ||
        this.enabledActions.indexOf('quote-message') !== -1) &&
      !this.message?.quoted_message
    );
  }

  get isEditVisible() {
    return (
      ((this.enabledActions.indexOf('edit') !== -1 ||
        this.enabledActions.indexOf('update-own-message') !== -1) &&
        this.isMine) ||
      this.enabledActions.indexOf('edit-any') !== -1 ||
      this.enabledActions.indexOf('update-any-message') !== -1
    );
  }

  get isDeleteVisible() {
    return (
      ((this.enabledActions.indexOf('delete') !== -1 ||
        this.enabledActions.indexOf('delete-own-message') !== -1) &&
        this.isMine) ||
      this.enabledActions.indexOf('delete-any') !== -1 ||
      this.enabledActions.indexOf('delete-any-message') !== -1
    );
  }

  get isMuteVisible() {
    return this.enabledActions.indexOf('mute') !== -1;
  }

  get isFlagVisible() {
    return (
      (this.enabledActions.indexOf('flag') !== -1 ||
        this.enabledActions.indexOf('flag-message') !== -1) &&
      !this.isMine
    );
  }

  get isPinVisible() {
    return this.enabledActions.indexOf('pin') !== -1;
  }

  pinClicked() {
    alert('Feature not yet implemented');
  }

  async flagClicked() {
    try {
      await this.chatClientService.flagMessage(this.message!.id);
      this.notificationService.addTemporaryNotification(
        'streamChat.Message has been successfully flagged',
        'success'
      );
    } catch (err) {
      this.notificationService.addTemporaryNotification(
        'streamChat.Error adding flag'
      );
    }
  }

  muteClicked() {
    alert('Feature not yet implemented');
  }

  quoteClicked() {
    this.channelService.selectMessageToQuote(this.message);
  }

  editClicked() {
    this.isEditing.emit(true);
    this.isEditModalOpen = true;
  }

  sendClicked() {
    this.messageInput?.messageSent();
  }

  modalClosed = () => {
    this.isEditModalOpen = false;
    this.isEditing.emit(false);
  };

  async deleteClicked() {
    try {
      await this.channelService.deleteMessage(this.message!);
    } catch (error) {
      this.notificationService.addTemporaryNotification(
        'streamChat.Error deleting message'
      );
    }
  }
}
