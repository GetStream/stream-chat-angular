import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { ThemeService } from '../theme.service';
import { AttachmentUpload } from '../types';
import { Attachment } from 'stream-chat';

/**
 * The `AttachmentPreviewList` component displays a preview of the attachments uploaded to a message. Users can delete attachments using the preview component, or retry upload if it failed previously.
 */
@Component({
  selector: 'stream-attachment-preview-list',
  templateUrl: './attachment-preview-list.component.html',
  styles: [],
})
export class AttachmentPreviewListComponent implements OnChanges, OnDestroy {
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
  themeVersion: '1' | '2';
  imagePreviewErrors: Attachment[] = [];
  private attachmentUploadsSubscription?: Subscription;

  constructor(themeService: ThemeService) {
    this.themeVersion = themeService.themeVersion;
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.attachmentUploads$) {
      this.attachmentUploadsSubscription?.unsubscribe();
      this.attachmentUploadsSubscription = this.attachmentUploads$?.subscribe(
        (attachments) => {
          if (attachments.length === 0) {
            this.imagePreviewErrors = [];
          }
        }
      );
    }
  }

  ngOnDestroy(): void {
    this.attachmentUploadsSubscription?.unsubscribe();
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
