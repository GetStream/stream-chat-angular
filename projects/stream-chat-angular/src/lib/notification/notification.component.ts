import { Component, Input } from '@angular/core';
import { NotificationType } from '../notification.service';

@Component({
  selector: 'stream-notification',
  templateUrl: './notification.component.html',
  styles: [],
})
export class NotificationComponent {
  @Input() type: NotificationType | undefined;

  constructor() {}
}
