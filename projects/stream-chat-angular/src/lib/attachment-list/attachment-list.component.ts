import { Component, Input } from '@angular/core';
import { Attachment } from 'stream-chat';
import { ImageLoadService } from '../message-list/image-load.service';
import { DefaultAttachmentType } from '../types';

@Component({
  selector: 'stream-attachment-list',
  templateUrl: './attachment-list.component.html',
  styles: [],
})
export class AttachmentListComponent {
  @Input() attachments: Attachment<DefaultAttachmentType>[] = [];

  constructor(private imageLoadService: ImageLoadService) {}

  trackById(index: number) {
    return index;
  }

  imageLoaded() {
    this.imageLoadService.imageLoad$.next();
  }
}
