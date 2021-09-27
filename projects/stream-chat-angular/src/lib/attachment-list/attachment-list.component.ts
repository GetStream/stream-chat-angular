import { Component, Input } from '@angular/core';
import { Attachment } from 'stream-chat';
import { DefaultAttachmentType } from '../types';

@Component({
  selector: 'stream-attachment-list',
  templateUrl: './attachment-list.component.html',
  styles: [],
})
export class AttachmentListComponent {
  @Input() attachments: Attachment<DefaultAttachmentType>[] = [];

  constructor() {}

  trackById(index: number, item: Attachment) {
    return item.id;
  }
}
