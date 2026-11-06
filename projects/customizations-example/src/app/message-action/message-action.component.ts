import { Component, Input } from '@angular/core';
import { LocalMessage } from 'stream-chat';
import { MessageActionHandlerExtraParams } from 'stream-chat-angular';

@Component({
  selector: 'app-message-action',
  templateUrl: './message-action.component.html',
  styleUrls: ['./message-action.component.scss'],
})
export class MessageActionComponent {
  @Input() actionName!: 'quote' | 'pin' | 'flag' | 'edit' | 'delete';
  @Input() actionLabelOrTranslationKey!: ((_: LocalMessage) => string) | string;
  @Input() message!: LocalMessage;
  @Input() extraParams!: MessageActionHandlerExtraParams;
  @Input() actionHandler!: (
    _: LocalMessage,
    __: MessageActionHandlerExtraParams
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
    actionLabelOrTranslationKey: ((_: LocalMessage) => string) | string
  ) {
    return typeof actionLabelOrTranslationKey === 'string'
      ? actionLabelOrTranslationKey
      : actionLabelOrTranslationKey(this.message);
  }
}
