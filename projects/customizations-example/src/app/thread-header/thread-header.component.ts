import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LocalMessage } from 'stream-chat';

@Component({
  selector: 'app-thread-header',
  templateUrl: './thread-header.component.html',
  styleUrls: ['./thread-header.component.scss'],
})
export class ThreadHeaderComponent {
  @Input() parentMessage: LocalMessage | undefined;
  @Output() readonly closeThread = new EventEmitter<void>();

  constructor() {}

  getReplyCountParam(parentMessage: LocalMessage | undefined) {
    return { replyCount: parentMessage?.reply_count };
  }
}
