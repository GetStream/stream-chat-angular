import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { AttachmentService } from '../attachment.service';
import { AttachmentUpload } from '../types';

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
