import { Component, Input } from '@angular/core';
import { ChatClientService } from '../chat-client.service';
import { NotificationService } from '../notification.service';
import { StreamMessage } from '../types';

export type MessageActions =
  | 'edit'
  | 'delete'
  | 'pin'
  | 'quote'
  | 'flag'
  | 'mute';

@Component({
  selector: 'stream-message-actions-box',
  templateUrl: './message-actions-box.component.html',
  styles: [],
})
export class MessageActionsBoxComponent {
  @Input() isOpen = false;
  @Input() isMine = false;
  @Input() message: StreamMessage | undefined;
  @Input() enabledActions: MessageActions[] = [];

  constructor(
    private chatClientService: ChatClientService,
    private notificationService: NotificationService
  ) {}

  get isQuoteEnabled() {
    return this.enabledActions.indexOf('quote') !== -1;
  }

  get isEditEnabled() {
    return this.enabledActions.indexOf('edit') !== -1;
  }

  get isDeleteEnabled() {
    return this.enabledActions.indexOf('delete') !== -1;
  }

  get isMuteEnabled() {
    return this.enabledActions.indexOf('mute') !== -1;
  }

  get isFlagEnabled() {
    return this.enabledActions.indexOf('flag') !== -1;
  }

  get isPinEnabled() {
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
    alert('Feature not yet implemented');
  }

  editClicked() {
    alert('Feature not yet implemented');
  }

  deleteClicked() {
    alert('Feature not yet implemented');
  }
}
