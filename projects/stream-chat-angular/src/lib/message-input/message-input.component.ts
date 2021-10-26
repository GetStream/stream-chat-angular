import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { Attachment } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { NotificationService } from '../notification.service';
import { AttachmentUpload } from '../types';

@Component({
  selector: 'stream-message-input',
  templateUrl: './message-input.component.html',
  styles: [],
})
export class MessageInputComponent implements OnDestroy {
  @Input() isFileUploadEnabled = true;
  @Input() acceptedFileTypes: string[] | undefined;
  @Input() isMultipleFileUploadEnabled = true;
  attachmentUploads: AttachmentUpload[] = [];
  private attachmentUploadInProgressCounter = 0;
  @ViewChild('input') private messageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;
  private subscriptions: Subscription[] = [];

  constructor(
    private channelService: ChannelService,
    private notificationService: NotificationService
  ) {
    this.subscriptions.push(
      this.channelService.activeChannel$.subscribe(() => {
        if (this.messageInput) {
          this.messageInput.nativeElement.value = '';
        }
        this.attachmentUploads = [];
      })
    );
  }
  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  async messageSent(event?: Event) {
    event?.preventDefault();
    if (this.attachmentUploadInProgressCounter > 0) {
      return;
    }
    const text = this.messageInput.nativeElement.value;
    const attachments = this.attachmentUploads
      .filter((r) => r.state === 'success')
      .map((r) => {
        const attachment: Attachment = {
          type: r.type,
        };
        if (r.type === 'image') {
          attachment.fallback = r.file.name;
          attachment.image_url = r.url;
        } else {
          attachment.asset_url = r.url;
          attachment.title = r.file.name;
          attachment.file_size = r.file.size;
        }

        return attachment;
      });
    this.messageInput.nativeElement.value = '';
    await this.channelService.sendMessage(text, attachments);
    this.attachmentUploads = [];
  }

  get accept() {
    return this.acceptedFileTypes ? this.acceptedFileTypes?.join(',') : '';
  }

  async filesSelected(fileList: FileList | null) {
    if (!fileList) {
      return;
    }
    const imageFiles: File[] = [];
    const dataFiles: File[] = [];

    Array.from(fileList).forEach((file) => {
      if (file.type.startsWith('image/') && !file.type.endsWith('.photoshop')) {
        // photoshop files begin with 'image/'
        imageFiles.push(file);
      } else {
        dataFiles.push(file);
      }
    });
    imageFiles.forEach((f) => this.createPreview(f));
    const newUploads = [
      ...imageFiles.map((file) => ({
        file,
        state: 'uploading' as 'uploading',
        type: 'image' as 'image',
      })),
      ...dataFiles.map((file) => ({
        file,
        state: 'uploading' as 'uploading',
        type: 'file' as 'file',
      })),
    ];
    this.attachmentUploads = [...this.attachmentUploads, ...newUploads];
    this.clearFileInput();
    await this.uploadAttachments(newUploads);
  }

  async retryAttachmentUpload(file: File) {
    const upload = this.attachmentUploads.find((u) => u.file === file);
    if (!upload) {
      return;
    }
    upload.state = 'uploading';
    await this.uploadAttachments([upload]);
  }

  async deleteAttachment(upload: AttachmentUpload) {
    if (upload.state === 'success') {
      try {
        await this.channelService.deleteAttachment(upload);
        this.attachmentUploads.splice(
          this.attachmentUploads.indexOf(upload),
          1
        );
      } catch (error) {
        // TODO error handling
      }
    } else {
      this.attachmentUploads.splice(this.attachmentUploads.indexOf(upload), 1);
    }
  }

  trackByFile(
    _: number,
    item: {
      file: File;
      state: 'error' | 'success' | 'uploading';
      url?: string;
    }
  ) {
    return item.file;
  }

  private createPreview(file: File) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const upload = this.attachmentUploads.find(
        (upload) => upload.file === file
      );
      if (!upload) {
        return;
      }
      upload.previewUri = event.target?.result || undefined;
    };
    reader.readAsDataURL(file as Blob);
  }

  private async uploadAttachments(uploads: AttachmentUpload[]) {
    this.attachmentUploadInProgressCounter++;
    const result = await this.channelService.uploadAttachments(uploads);
    result.forEach((r) => {
      const upload = this.attachmentUploads.find(
        (upload) => upload.file === r.file
      );
      if (!upload) {
        if (r.url) {
          void this.channelService.deleteAttachment(r);
        }
        return;
      }
      upload.state = r.state;
      upload.url = r.url;
      if (upload.state === 'error') {
        this.notificationService.addTemporaryNotification(
          upload.type === 'image'
            ? 'Error uploading image'
            : 'Error uploading file'
        );
      }
    });
    this.attachmentUploadInProgressCounter--;
  }

  private clearFileInput() {
    this.fileInput.nativeElement.value = '';
  }
}
