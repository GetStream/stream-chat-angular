import { Component, Input, OnChanges } from '@angular/core';
import { Attachment } from 'stream-chat';
import { ImageLoadService } from '../message-list/image-load.service';
import { DefaultAttachmentType } from '../types';
import prettybytes from 'pretty-bytes';

@Component({
  selector: 'stream-attachment-list',
  templateUrl: './attachment-list.component.html',
  styles: [],
})
export class AttachmentListComponent implements OnChanges {
  @Input() attachments: Attachment<DefaultAttachmentType>[] = [];
  orderedAttachments: Attachment<DefaultAttachmentType>[] = [];

  constructor(private imageLoadService: ImageLoadService) {}

  ngOnChanges(): void {
    this.orderedAttachments = [
      ...this.attachments.filter((a) => this.isImage(a)),
      ...this.attachments.filter((a) => this.isFile(a)),
      ...this.attachments.filter((a) => this.isCard(a)),
    ];
  }

  trackById(index: number) {
    return index;
  }

  isImage(attachment: Attachment) {
    return (
      attachment.type === 'image' &&
      !attachment.title_link &&
      !attachment.og_scrape_url
    );
  }

  isFile(attachment: Attachment) {
    return attachment.type === 'file';
  }

  isCard(attachment: Attachment) {
    return (
      !attachment.type ||
      (attachment.type === 'image' && !this.isImage(attachment))
    );
  }

  imageLoaded() {
    this.imageLoadService.imageLoad$.next();
  }

  hasFileSize(attachment: Attachment<DefaultAttachmentType>) {
    return (
      attachment.file_size && Number.isFinite(Number(attachment.file_size))
    );
  }

  getFileSize(attachment: Attachment<DefaultAttachmentType>) {
    return prettybytes(attachment.file_size!);
  }

  trimUrl(url?: string | null) {
    if (url !== undefined && url !== null) {
      const [trimmedUrl] = url
        .replace(/^(?:https?:\/\/)?(?:www\.)?/i, '')
        .split('/');

      return trimmedUrl;
    }
    return null;
  }
}
