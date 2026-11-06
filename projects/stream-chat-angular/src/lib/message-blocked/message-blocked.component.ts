import { LocalMessage } from 'stream-chat';
import { Component, ChangeDetectionStrategy, Input } from '@angular/core';

/**
 * The `MessageBlocked` component displays a message that has been blocked by moderation policies.
 */
@Component({
  selector: 'stream-message-blocked',
  templateUrl: './message-blocked.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageBlockedComponent {
  /**
   * The message that has been blocked.
   */
  @Input() message: LocalMessage | undefined;
  /**
   * Whether the message is the current user's own message.
   */
  @Input() isMyMessage = false;
}
