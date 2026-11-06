import { Component, Input } from '@angular/core';
import { LocalMessage, MessageResponse } from 'stream-chat';

@Component({
  selector: 'app-message-text',
  templateUrl: './message-text.component.html',
  styleUrls: ['./message-text.component.scss'],
})
export class MessageTextComponent {
  @Input() message: LocalMessage | MessageResponse | undefined;
  @Input() isQuoted: boolean = false;
  @Input() shouldTranslate: boolean = false;
  @Input() translation: string | undefined;
  isExpanded = false;
}
