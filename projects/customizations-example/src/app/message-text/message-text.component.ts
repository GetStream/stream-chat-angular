import { Component, Input } from '@angular/core';
import { StreamMessage } from 'stream-chat-angular';

@Component({
  selector: 'app-message-text',
  templateUrl: './message-text.component.html',
  styleUrls: ['./message-text.component.scss'],
})
export class MessageTextComponent {
  @Input() message: StreamMessage | undefined | StreamMessage['quoted_message'];
  @Input() isQuoted: boolean = false;
  @Input() shouldTranslate: boolean = false;
  isExpanded = false;
}
