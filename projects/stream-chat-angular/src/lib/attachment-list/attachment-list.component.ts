import {
  Component,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { Action, Attachment } from 'stream-chat';
import {
  ModalContext,
  DefaultStreamChatGenerics,
  AttachmentConfigration,
  VideoAttachmentConfiguration,
  ImageAttachmentConfiguration,
  AttachmentContext,
} from '../types';
import prettybytes from 'pretty-bytes';
import { isImageAttachment } from '../is-image-attachment';
import { ChannelService } from '../channel.service';
import { CustomTemplatesService } from '../custom-templates.service';
import { AttachmentConfigurationService } from '../attachment-configuration.service';
import { ThemeService } from '../theme.service';

/**
 * The `AttachmentList` component displays the attachments of a message
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
   * The parent id of the message the attachments belong to
   */
  @Input() parentMessageId: string | undefined;
  /**
   * The attachments to display
   */
  @Input() attachments: Attachment<DefaultStreamChatGenerics>[] = [];
  /**
   * Emits the state of the image carousel window
   */
  @Output() readonly imageModalStateChange = new EventEmitter<
    'opened' | 'closed'
  >();
  @HostBinding() class = 'str-chat__attachment-list-angular-host';
  orderedAttachments: Attachment<DefaultStreamChatGenerics>[] = [];
  imagesToView: Attachment<DefaultStreamChatGenerics>[] = [];
  imagesToViewCurrentIndex = 0;
  themeVersion: '1' | '2';
  @ViewChild('modalContent', { static: true })
  private modalContent!: TemplateRef<void>;
  private attachmentConfigurations: Map<
    Attachment,
    | AttachmentConfigration
    | VideoAttachmentConfiguration
    | ImageAttachmentConfiguration
  > = new Map();

  constructor(
    public readonly customTemplatesService: CustomTemplatesService,
    private channelService: ChannelService,
    private attachmentConfigurationService: AttachmentConfigurationService,
    themeService: ThemeService
  ) {
    this.themeVersion = themeService.themeVersion;
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.attachments) {
      const images = this.attachments.filter(this.isImage);
      const containsGallery = images.length >= 2;
      this.orderedAttachments = [
        ...(containsGallery ? this.createGallery(images) : images),
        ...this.attachments.filter((a) => this.isVideo(a)),
        ...this.attachments.filter((a) => this.isVoiceMessage(a)),
        ...this.attachments.filter((a) => this.isFile(a)),
      ];
      this.attachmentConfigurations = new Map();
      // Display link attachments only if there are no other attachments
      // Giphy-s always sent without other attachments
      if (this.orderedAttachments.length === 0) {
        this.orderedAttachments.push(
          ...this.attachments.filter((a) => this.isCard(a))
        );
      }
    }
  }

  trackByUrl(_: number, attachment: Attachment) {
    return (
      attachment.image_url ||
      attachment.img_url ||
      attachment.asset_url ||
      attachment.thumb_url
    );
  }

  isImage(attachment: Attachment) {
    return isImageAttachment(attachment);
  }

  isSvg(attachment: Attachment) {
    const filename = attachment.fallback || '';
    return !!filename.toLowerCase().endsWith('.svg');
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

  isVoiceMessage(attachment: Attachment) {
    return attachment.type === 'voiceRecording';
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
    void this.channelService.sendAction(
      this.messageId!,
      {
        [action.name!]: action.value!,
      },
      this.parentMessageId
    );
  }

  trackByActionValue(_: number, item: Action) {
    return item.value;
  }

  openImageModal(attachments: Attachment[], selectedIndex = 0) {
    this.imageModalStateChange.next('opened');
    this.imagesToView = attachments;
    this.imagesToViewCurrentIndex = selectedIndex;
  }

  stepImages(dir: -1 | 1) {
    this.imagesToViewCurrentIndex += dir * 1;
  }

  trackByImageUrl(_: number, item: Attachment) {
    return item.image_url || item.img_url || item.thumb_url;
  }

  getAttachmentContext(
    attachment: Attachment<DefaultStreamChatGenerics>
  ): AttachmentContext {
    return { attachment };
  }

  getImageAttachmentConfiguration(
    attachment: Attachment,
    type: 'gallery' | 'single',
    element: HTMLElement
  ): ImageAttachmentConfiguration {
    const existingConfiguration = this.attachmentConfigurations.get(attachment);
    if (existingConfiguration) {
      return existingConfiguration as ImageAttachmentConfiguration;
    }
    const configuration =
      this.attachmentConfigurationService.getImageAttachmentConfiguration(
        attachment,
        type,
        element
      );
    this.attachmentConfigurations.set(attachment, configuration);
    return configuration;
  }

  getCarouselImageAttachmentConfiguration(
    attachment: Attachment,
    element: HTMLElement
  ) {
    return this.attachmentConfigurationService.getImageAttachmentConfiguration(
      attachment,
      'carousel',
      element
    );
  }

  getVideoAttachmentConfiguration(
    attachment: Attachment,
    element: HTMLElement
  ): VideoAttachmentConfiguration {
    const existingConfiguration = this.attachmentConfigurations.get(attachment);
    if (existingConfiguration) {
      return existingConfiguration as VideoAttachmentConfiguration;
    }
    const configuration =
      this.attachmentConfigurationService.getVideoAttachmentConfiguration(
        attachment,
        element
      );
    this.attachmentConfigurations.set(attachment, configuration);
    return configuration;
  }

  getCardAttachmentConfiguration(attachment: Attachment) {
    const existingConfiguration = this.attachmentConfigurations.get(attachment);
    if (existingConfiguration) {
      return existingConfiguration;
    }
    if (attachment.type === 'giphy') {
      return this.attachmentConfigurationService.getGiphyAttachmentConfiguration(
        attachment
      );
    } else {
      const configuration =
        this.attachmentConfigurationService.getScrapedImageAttachmentConfiguration(
          attachment
        );
      this.attachmentConfigurations.set(attachment, configuration);
      return configuration;
    }
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
    this.imageModalStateChange.next('closed');
    this.imagesToView = [];
  }
}
