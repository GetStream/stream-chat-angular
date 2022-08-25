import { Injectable } from '@angular/core';
import { Attachment } from 'stream-chat';
import { AttachmentConfigration, DefaultStreamChatGenerics } from './types';

/**
 * The `AttachmentConfigurationService` provides customization for certain attributes of attachments displayed inside the message component.
 */
@Injectable({
  providedIn: 'root',
})
export class AttachmentConfigurationService<
  T extends DefaultStreamChatGenerics = DefaultStreamChatGenerics
> {
  /**
   * A custom handler can be provided to override the default image attachment (images uploaded from files) configuration. By default the SDK uses fixed image height (a size that's known before image is loaded), if you override that with dynamic image height (for example: height: 100%) the scrolling logic inside the message list can break.
   */
  customImageAttachmentConfigurationHandler?: (
    a: Attachment<T>,
    type: 'gallery' | 'single' | 'carousel'
  ) => AttachmentConfigration;
  /**
   * A custom handler can be provided to override the default video attachment (videos uploaded from files) configuration. By default the SDK uses fixed height (a size that's known before video is loaded), if you override that with dynamic height (for example: height: 100%) the scrolling logic inside the message list can break.
   */
  customVideoAttachmentConfigurationHandler?: (
    a: Attachment<T>
  ) => AttachmentConfigration;
  /**
   * A custom handler can be provided to override the default giphy attachment (GIFs sent with the /giphy command) configuration. By default the SDK uses fixed height (a size that's known before the GIF is loaded), if you override that with dynamic height (for example: height: 100%) the scrolling logic inside the message list can break.
   */
  customGiphyAttachmentConfigurationHandler?: (
    a: Attachment<T>
  ) => AttachmentConfigration;
  /**
   * A custom handler can be provided to override the default scraped image attachment (images found in links inside messages) configuration. By default the SDK uses fixed height (a size that's known before image is loaded), if you override that with dynamic height (for example: height: 100%) the scrolling logic inside the message list can break.
   */
  customScrapedImageAttachmentConfigurationHandler?: (
    a: Attachment<T>
  ) => AttachmentConfigration;

  /**
   * Handles the configuration for image attachments, it's possible to provide your own function to override the default logic
   * @param attachment The attachment to configure
   * @param location Specifies where the image is being displayed
   */
  getImageAttachmentConfiguration(
    attachment: Attachment<T>,
    location: 'gallery' | 'single' | 'carousel'
  ): AttachmentConfigration {
    if (this.customImageAttachmentConfigurationHandler) {
      return this.customImageAttachmentConfigurationHandler(
        attachment,
        location
      );
    }

    const height = {
      gallery: '', // Set from CSS,
      single: '300px',
      carousel: '', // Set from CSS
    }[location];

    return {
      url: (attachment.img_url ||
        attachment.thumb_url ||
        attachment.image_url ||
        '') as string,
      width: '',
      height,
    };
  }

  /**
   * Handles the configuration for video attachments, it's possible to provide your own function to override the default logic
   * @param attachment The attachment to configure
   */
  getVideoAttachmentConfiguration(
    attachment: Attachment<T>
  ): AttachmentConfigration {
    if (this.customVideoAttachmentConfigurationHandler) {
      return this.customVideoAttachmentConfigurationHandler(attachment);
    }

    return {
      url: attachment.asset_url || '',
      width: '100%', // Set from CSS
      height: '100%',
    };
  }

  /**
   * Handles the configuration for giphy attachments, it's possible to provide your own function to override the default logic
   * @param attachment The attachment to configure
   */
  getGiphyAttachmentConfiguration(
    attachment: Attachment<T>
  ): AttachmentConfigration {
    if (this.customGiphyAttachmentConfigurationHandler) {
      return this.customGiphyAttachmentConfigurationHandler(attachment);
    }

    const giphy = attachment.giphy?.fixed_height_downsampled;

    return {
      url: giphy?.url || attachment.image_url || attachment.thumb_url || '',
      height: giphy?.height ? `${giphy?.height}px` : '300px',
      width: giphy?.width ? `${giphy?.width}px` : '',
    };
  }

  /**
   * Handles the configuration for scraped image attachments, it's possible to provide your own function to override the default logic
   * @param attachment The attachment to configure
   */
  getScrapedImageAttachmentConfiguration(
    attachment: Attachment<T>
  ): AttachmentConfigration {
    if (this.customScrapedImageAttachmentConfigurationHandler) {
      return this.customScrapedImageAttachmentConfigurationHandler(attachment);
    }

    return {
      url: attachment.image_url || attachment.thumb_url || '',
      width: '',
      height: '', // Set from CSS
    };
  }
}
