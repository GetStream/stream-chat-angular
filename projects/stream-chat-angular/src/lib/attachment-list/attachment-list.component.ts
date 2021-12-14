import { Component, Input, OnChanges } from '@angular/core';
import { Action, Attachment } from 'stream-chat';
import { ImageLoadService } from '../message-list/image-load.service';
import { DefaultAttachmentType } from '../types';
import prettybytes from 'pretty-bytes';
import { isImageAttachment } from '../is-image-attachment';
import { ChannelService } from '../channel.service';

@Component({
  selector: 'stream-attachment-list',
  templateUrl: './attachment-list.component.html',
  styles: [],
})
export class AttachmentListComponent implements OnChanges {
  @Input() messageId: string | undefined;
  @Input() attachments: Attachment<DefaultAttachmentType>[] = [];
  orderedAttachments: Attachment<DefaultAttachmentType>[] = [];

  constructor(
    private imageLoadService: ImageLoadService,
    private channelService: ChannelService
  ) {}

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
    return isImageAttachment(attachment);
  }

  isFile(attachment: Attachment) {
    return attachment.type === 'file';
  }

  isCard(attachment: Attachment) {
    return (
      !attachment.type ||
      (attachment.type === 'image' && !this.isImage(attachment)) ||
      attachment.type === 'giphy'
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

  sendAction(action: Action) {
    void this.channelService.sendAction(this.messageId!, {
      [action.name!]: action.value!,
    });
  }

  trackByActionValue(_: number, item: Action) {
    return item.value;
  }
}
