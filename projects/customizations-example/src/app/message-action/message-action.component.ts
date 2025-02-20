import { Component, Input } from '@angular/core';
import {
  DefaultStreamChatGenerics,
  MessageActionHandlerExtraParams,
  StreamMessage,
} from 'stream-chat-angular';

@Component({
  selector: 'app-message-action',
  templateUrl: './message-action.component.html',
  styleUrl: './message-action.component.scss',
})
export class MessageActionComponent {
  @Input() actionName!: 'quote' | 'pin' | 'flag' | 'edit' | 'delete';
  @Input() actionLabelOrTranslationKey!:
    | ((m: StreamMessage<DefaultStreamChatGenerics>) => string)
    | string;
  @Input() message!: StreamMessage<DefaultStreamChatGenerics>;
  @Input() extraParams!: MessageActionHandlerExtraParams;
  @Input() actionHandler!: (
    message: StreamMessage,
    extraParams: MessageActionHandlerExtraParams,
  ) => void;

  constructor() {}

  getIconName() {
    const iconMapping = {
      quote: 'format_quote',
      edit: 'edit',
      delete: 'delete',
      flag: 'flag',
      pin: 'push_pin',
    };
    return iconMapping[this.actionName];
  }

  getActionLabel(
    actionLabelOrTranslationKey:
      | ((m: StreamMessage<DefaultStreamChatGenerics>) => string)
      | string,
  ) {
    return typeof actionLabelOrTranslationKey === 'string'
      ? actionLabelOrTranslationKey
      : actionLabelOrTranslationKey(this.message);
  }
}
