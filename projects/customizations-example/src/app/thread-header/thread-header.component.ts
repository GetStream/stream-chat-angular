import { Component, EventEmitter, Input, Output } from '@angular/core';
import { StreamMessage } from 'stream-chat-angular';

@Component({
  selector: 'app-thread-header',
  templateUrl: './thread-header.component.html',
  styleUrls: ['./thread-header.component.scss'],
})
export class ThreadHeaderComponent {
  @Input() parentMessage: StreamMessage | undefined;
  @Output() readonly closeThread = new EventEmitter<void>();

  constructor() {}

  getReplyCountParam(parentMessage: StreamMessage | undefined) {
    return { replyCount: parentMessage?.reply_count };
  }
}
