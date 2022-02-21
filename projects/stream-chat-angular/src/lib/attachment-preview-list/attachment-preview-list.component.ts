import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { AttachmentService } from '../attachment.service';
import { AttachmentUpload } from '../types';

/**
 * The `AttachmentPreviewList` compontent displays a preview of the attachments uploaded to a message. Users can delete attachments using the preview component, or retry upload if it failed previously.
 */
@Component({
  selector: 'stream-attachment-preview-list',
  templateUrl: './attachment-preview-list.component.html',
  styles: [],
})
export class AttachmentPreviewListComponent {
  attachmentUploads$: Observable<AttachmentUpload[]>;

  constructor(private attachmentService: AttachmentService) {
    this.attachmentUploads$ = this.attachmentService.attachmentUploads$;
  }

  async retryAttachmentUpload(file: File) {
    await this.attachmentService.retryAttachmentUpload(file);
  }

  async deleteAttachment(upload: AttachmentUpload) {
    await this.attachmentService.deleteAttachment(upload);
  }

  trackByFile(_: number, item: AttachmentUpload) {
    return item.file;
  }
}
