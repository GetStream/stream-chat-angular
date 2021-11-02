import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
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
export class MessageActionsBoxComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() isMine = false;
  @Input() message: StreamMessage | undefined;
  @Input() enabledActions: MessageActions[] = [];
  @Output() readonly displayedActionsCount = new EventEmitter<number>();

  constructor(
    private chatClientService: ChatClientService,
    private notificationService: NotificationService
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
    return this.enabledActions.indexOf('quote') !== -1;
  }

  get isEditVisible() {
    return this.enabledActions.indexOf('edit') !== -1;
  }

  get isDeleteVisible() {
    return this.enabledActions.indexOf('delete') !== -1;
  }

  get isMuteVisible() {
    return this.enabledActions.indexOf('mute') !== -1;
  }

  get isFlagVisible() {
    return this.enabledActions.indexOf('flag') !== -1 && !this.isMine;
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
    alert('Feature not yet implemented');
  }

  editClicked() {
    alert('Feature not yet implemented');
  }

  deleteClicked() {
    alert('Feature not yet implemented');
  }
}
