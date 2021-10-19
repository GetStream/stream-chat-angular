import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { ChannelService } from '../channel.service';

@Component({
  selector: 'stream-message-input',
  templateUrl: './message-input.component.html',
  styles: [],
})
export class MessageInputComponent {
  @Input() isFileUploadEnabled = true;
  @Input() acceptedFileTypes: string[] | undefined;
  @Input() isMultipleFileUploadEnabled = true;
  private files: File[] = [];
  private isFileUploadInProgress = false;
  private fileUploadResult: {
    file: File;
    state: 'error' | 'success';
    url?: string;
  }[] = [];
  @ViewChild('input') private messageInput!: ElementRef<HTMLInputElement>;

  constructor(private channelService: ChannelService) {}

  async messageSent(event?: Event) {
    event?.preventDefault();
    if (this.isFileUploadInProgress) {
      return;
    }
    const text = this.messageInput.nativeElement.value;
    const attachments = this.fileUploadResult
      .filter((r) => r.state === 'success')
      .map((r) => ({ fallback: r.file.name, image_url: r.url, type: 'image' }));
    this.messageInput.nativeElement.value = '';
    await this.channelService.sendMessage(text, attachments);
    this.fileUploadResult = [];
    this.files = [];
  }

  get accept() {
    return this.acceptedFileTypes ? this.acceptedFileTypes?.join(',') : '';
  }

  async filesSelected(files: FileList | null) {
    this.isFileUploadInProgress = true;
    if (!files) {
      return;
    }
    this.files = Array.from(files).filter(
      (file) =>
        file.type.startsWith('image/') && !file.type.endsWith('.photoshop')
    ); // photoshop files begin with 'image/'
    this.fileUploadResult = await this.channelService.uploadAttachments(
      this.files
    );
    this.isFileUploadInProgress = false;
  }
}
