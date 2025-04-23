import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { StreamMessage } from '../types';

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
  @Input() message: StreamMessage | undefined;
  @Input() isMyMessage = false;
}
