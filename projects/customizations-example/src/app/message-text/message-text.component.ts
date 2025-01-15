import { Component, Input } from '@angular/core';
import { MessageResponseBase } from 'stream-chat';
import { DefaultStreamChatGenerics, StreamMessage } from 'stream-chat-angular';

@Component({
  selector: 'app-message-text',
  templateUrl: './message-text.component.html',
  styleUrls: ['./message-text.component.scss'],
})
export class MessageTextComponent {
  @Input() message:
    | StreamMessage<DefaultStreamChatGenerics>
    | undefined
    | MessageResponseBase<DefaultStreamChatGenerics>;
  @Input() isQuoted: boolean = false;
  @Input() shouldTranslate: boolean = false;
  isExpanded = false;
}
