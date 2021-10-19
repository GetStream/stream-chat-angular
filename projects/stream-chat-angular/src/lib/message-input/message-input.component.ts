import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { ChannelService } from '../channel.service';

@Component({
  selector: 'stream-message-input',
  templateUrl: './message-input.component.html',
  styles: [],
})
export class MessageInputComponent implements OnDestroy {
  @Input() isFileUploadEnabled = true;
  @Input() acceptedFileTypes: string[] | undefined;
  @Input() isMultipleFileUploadEnabled = true;
  fileUploads: {
    file: File;
    state: 'error' | 'success' | 'uploading';
    url?: string;
    previewUri?: string | ArrayBuffer;
  }[] = [];
  private isFileUploadInProgressCounter = 0;
  @ViewChild('input') private messageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;
  private subscriptions: Subscription[] = [];

  constructor(private channelService: ChannelService) {
    this.subscriptions.push(
      this.channelService.activeChannel$.subscribe(() => {
        if (this.messageInput) {
          this.messageInput.nativeElement.value = '';
        }
        this.fileUploads = [];
      })
    );
  }
  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  async messageSent(event?: Event) {
    event?.preventDefault();
    if (this.isFileUploadInProgressCounter > 0) {
      return;
    }
    const text = this.messageInput.nativeElement.value;
    const attachments = this.fileUploads
      .filter((r) => r.state === 'success')
      .map((r) => ({ fallback: r.file.name, image_url: r.url, type: 'image' }));
    this.messageInput.nativeElement.value = '';
    await this.channelService.sendMessage(text, attachments);
    this.fileUploads = [];
  }

  get accept() {
    return this.acceptedFileTypes ? this.acceptedFileTypes?.join(',') : '';
  }

  async filesSelected(fileList: FileList | null) {
    if (!fileList) {
      return;
    }
    const files = Array.from(fileList).filter(
      (file) =>
        file.type.startsWith('image/') && !file.type.endsWith('.photoshop') // photoshop files begin with 'image/'
    );
    files.forEach((f) => this.createPreview(f));
    this.fileUploads = [
      ...this.fileUploads,
      ...files.map((file) => ({
        file,
        state: 'uploading' as 'uploading',
      })),
    ];
    this.clearFileInput();
    await this.uploadAttachments(files);
  }

  async retryFileUpload(file: File) {
    const upload = this.fileUploads.find((u) => u.file === file);
    if (!upload) {
      return;
    }
    upload.state = 'uploading';
    await this.uploadAttachments([file]);
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
      const upload = this.fileUploads.find((upload) => upload.file === file);
      if (!upload) {
        return;
      }
      upload.previewUri = event.target?.result || undefined;
    };
    reader.readAsDataURL(file as Blob);
  }

  private async uploadAttachments(files: File[]) {
    this.isFileUploadInProgressCounter++;
    const result = await this.channelService.uploadAttachments(files);
    result.forEach((r) => {
      const upload = this.fileUploads.find((upload) => upload.file === r.file);
      if (!upload) {
        return;
      }
      upload.state = r.state;
      upload.url = r.url;
    });
    this.isFileUploadInProgressCounter--;
  }

  private clearFileInput() {
    this.fileInput.nativeElement.value = '';
  }
}
