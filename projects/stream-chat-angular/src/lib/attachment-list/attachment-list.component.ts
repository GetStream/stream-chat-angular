import {
  Component,
  Input,
  OnChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { Action, Attachment } from 'stream-chat';
import { ImageLoadService } from '../message-list/image-load.service';
import { ModalContext, DefaultStreamChatGenerics } from '../types';
import prettybytes from 'pretty-bytes';
import { isImageAttachment } from '../is-image-attachment';
import { ChannelService } from '../channel.service';
import { CustomTemplatesService } from '../custom-templates.service';
import { ThemeService } from '../theme.service';

/**
 * The `AttachmentList` compontent displays the attachments of a message
 */
@Component({
  selector: 'stream-attachment-list',
  templateUrl: './attachment-list.component.html',
  styles: [],
})
export class AttachmentListComponent implements OnChanges {
  /**
   * The id of the message the attachments belong to
   */
  @Input() messageId: string | undefined;
  /**
   * The attachments to display
   */
  @Input() attachments: Attachment<DefaultStreamChatGenerics>[] = [];
  orderedAttachments: Attachment<DefaultStreamChatGenerics>[] = [];
  imagesToView: Attachment<DefaultStreamChatGenerics>[] = [];
  imagesToViewCurrentIndex = 0;
  themeVersion: '1' | '2';
  @ViewChild('modalContent', { static: true })
  private modalContent!: TemplateRef<void>;

  constructor(
    public readonly customTemplatesService: CustomTemplatesService,
    private imageLoadService: ImageLoadService,
    private channelService: ChannelService,
    themeService: ThemeService
  ) {
    this.themeVersion = themeService.themeVersion;
  }

  ngOnChanges(): void {
    const images = this.attachments.filter(this.isImage);
    const containsGallery = images.length >= 2;
    this.orderedAttachments = [
      ...(containsGallery ? this.createGallery(images) : images),
      ...this.attachments.filter((a) => this.isVideo(a)),
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

  isGallery(attachment: Attachment) {
    return attachment.type === 'gallery';
  }

  isVideo(attachment: Attachment) {
    return (
      attachment.type === 'video' &&
      attachment.asset_url &&
      !attachment.og_scrape_url // links from video share services (such as YouTube or Facebook) are can't be played
    );
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

  hasFileSize(attachment: Attachment<DefaultStreamChatGenerics>) {
    return (
      attachment.file_size && Number.isFinite(Number(attachment.file_size))
    );
  }

  getFileSize(attachment: Attachment<DefaultStreamChatGenerics>) {
    return prettybytes(Number(attachment.file_size!));
  }

  getModalContext(): ModalContext {
    return {
      isOpen: this.imagesToView && this.imagesToView.length > 0,
      isOpenChangeHandler: (isOpen) => (isOpen ? null : this.closeImageModal()),
      content: this.modalContent,
    };
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

  openImageModal(attachments: Attachment[], selectedIndex = 0) {
    this.imagesToView = attachments;
    this.imagesToViewCurrentIndex = selectedIndex;
  }

  stepImages(dir: -1 | 1) {
    this.imagesToViewCurrentIndex += dir * 1;
  }

  trackByImageUrl(_: number, item: Attachment) {
    return item.image_url || item.img_url || item.thumb_url;
  }

  get isImageModalPrevButtonVisible() {
    return this.imagesToViewCurrentIndex !== 0;
  }

  get isImageModalNextButtonVisible() {
    return this.imagesToViewCurrentIndex !== this.imagesToView.length - 1;
  }

  private createGallery(images: Attachment[]) {
    return [
      {
        type: 'gallery',
        images,
      },
    ];
  }

  private closeImageModal() {
    this.imagesToView = [];
  }
}
