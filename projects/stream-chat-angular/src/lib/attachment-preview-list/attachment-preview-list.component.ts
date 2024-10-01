import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  TemplateRef,
} from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { AttachmentUpload, CustomAttachmentPreviewListContext } from '../types';
import { CustomTemplatesService } from '../custom-templates.service';
import { AttachmentService } from '../attachment.service';
import { Attachment } from 'stream-chat';

/**
 * The `AttachmentPreviewList` component displays a preview of the attachments uploaded to a message. Users can delete attachments using the preview component, or retry upload if it failed previously.
 */
@Component({
  selector: 'stream-attachment-preview-list',
  templateUrl: './attachment-preview-list.component.html',
  styles: [],
})
export class AttachmentPreviewListComponent implements OnInit, OnDestroy {
  /**
   * A stream that emits the current file uploads and their states
   */
  @Input() attachmentUploads$: Observable<AttachmentUpload[]> | undefined;
  /**
   * An output to notify the parent component if the user tries to retry a failed upload
   */
  @Output() readonly retryAttachmentUpload = new EventEmitter<File>();
  /**
   * An output to notify the parent component if the user wants to delete a file
   */
  @Output() readonly deleteAttachment = new EventEmitter<AttachmentUpload>();
  customAttachments: Attachment[] = [];
  customAttachmentsPreview?: TemplateRef<CustomAttachmentPreviewListContext>;
  private subscriptions: Subscription[] = [];

  constructor(
    private customTemplateService: CustomTemplatesService,
    public readonly attachmentService: AttachmentService
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.customTemplateService.customAttachmentPreviewListTemplate$.subscribe(
        (t) => (this.customAttachmentsPreview = t)
      )
    );
    this.subscriptions.push(
      this.attachmentService.customAttachments$.subscribe(
        (a) => (this.customAttachments = a)
      )
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  attachmentUploadRetried(file: File) {
    this.retryAttachmentUpload.emit(file);
  }

  attachmentDeleted(upload: AttachmentUpload) {
    this.deleteAttachment.emit(upload);
  }

  trackByFile(_: number, item: AttachmentUpload) {
    return item.file;
  }
}
