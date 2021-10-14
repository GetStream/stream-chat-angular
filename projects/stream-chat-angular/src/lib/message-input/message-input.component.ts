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
  @ViewChild('input') private messageInput!: ElementRef<HTMLInputElement>;

  constructor(private channelService: ChannelService) {}

  messageSent(event?: Event) {
    event?.preventDefault();
    const text = this.messageInput.nativeElement.value;
    this.messageInput.nativeElement.value = '';
    void this.channelService.sendMessage(text);
  }

  get accept() {
    return this.acceptedFileTypes ? this.acceptedFileTypes?.join(',') : '';
  }

  filesSelected(files: FileList | null) {
    if (!files) {
      return;
    }
    this.files = Array.from(files).filter(
      (file) =>
        file.type.startsWith('image/') && !file.type.endsWith('.photoshop')
    ); // photoshop files begin with 'image/'
  }
}
