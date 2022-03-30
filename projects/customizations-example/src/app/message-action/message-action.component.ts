import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-message-action',
  templateUrl: './message-action.component.html',
  styleUrls: ['./message-action.component.scss'],
})
export class MessageActionComponent {
  @Input() actionName!: 'quote' | 'pin' | 'flag' | 'edit' | 'delete';
  @Input() actionLabelOrTranslationKey!: (() => string) | string;
  @Input() actionHandler!: () => any;

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

  getActionLabel(actionLabelOrTranslationKey: (() => string) | string) {
    return typeof actionLabelOrTranslationKey === 'string'
      ? actionLabelOrTranslationKey
      : actionLabelOrTranslationKey();
  }
}
