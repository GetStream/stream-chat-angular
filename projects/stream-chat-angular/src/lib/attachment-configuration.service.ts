import { Injectable } from '@angular/core';
import { Attachment } from 'stream-chat';
import {
  AttachmentConfigration,
  DefaultStreamChatGenerics,
  VideoAttachmentConfiguration,
} from './types';

/**
 * The `AttachmentConfigurationService` provides customization for certain attributes of attachments displayed inside the message component. If you're using your own CDN, you can integrate resizing features of it by providing your own handlers.
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
  ) => VideoAttachmentConfiguration;
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
   * You can turn on/off thumbnail generation for video attachments
   */
  shouldGenerateVideoThumbnail = true;

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

    const url = new URL(
      (attachment.img_url ||
        attachment.thumb_url ||
        attachment.image_url ||
        '') as string
    );
    const urlParams = url.searchParams;
    const originalHeight = Number(urlParams.get('oh')) || 1;
    const originalWidth = Number(urlParams.get('ow')) || 1;
    let sizeRestriction: { width: number; height: number } | undefined;
    let height: string;
    switch (location) {
      case 'carousel': {
        sizeRestriction = undefined;
        height = ''; // Set from CSS
        break;
      }
      case 'gallery': {
        sizeRestriction = this.getSizeRestrictionForFixedAspectRatio(
          originalHeight,
          originalWidth,
          150
        );
        height = ''; // Set from CSS:
        break;
      }
      case 'single': {
        sizeRestriction = this.getSizeRestrictionForFixedWidth(
          originalHeight,
          originalWidth,
          300,
          300
        );
        height = `${sizeRestriction.height}px`;
      }
    }

    if (sizeRestriction) {
      // Apply 2x for retina displays
      sizeRestriction.height *= 2;
      sizeRestriction.width *= 2;
      this.addResiziParamsToUrl(sizeRestriction, url);
    }

    return {
      url: url.href,
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
  ): VideoAttachmentConfiguration {
    if (this.customVideoAttachmentConfigurationHandler) {
      return this.customVideoAttachmentConfigurationHandler(attachment);
    }

    let height = '300px';
    let thumbUrl = undefined;
    if (attachment.thumb_url && this.shouldGenerateVideoThumbnail) {
      const url = new URL(attachment.thumb_url);
      const urlParams = url.searchParams;
      const originalHeight = Number(urlParams.get('oh')) || 1;
      const originalWidth = Number(urlParams.get('ow')) || 1;
      const sizeRestriction = this.getSizeRestrictionForFixedWidth(
        originalHeight,
        originalWidth,
        300,
        300
      );
      height = `${sizeRestriction.height}px`;
      sizeRestriction.height *= 2;
      sizeRestriction.width *= 2;
      this.addResiziParamsToUrl(sizeRestriction, url);
      thumbUrl = url.href;
    }
    return {
      url: attachment.asset_url || '',
      width: '100%', // Set from CSS
      height,
      thumbUrl: thumbUrl,
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

  private addResiziParamsToUrl(
    sizeRestriction: { width: number; height: number },
    url: URL
  ) {
    url.searchParams.append('h', sizeRestriction.height.toString());
    url.searchParams.append('w', sizeRestriction.width.toString());
  }

  private getSizeRestrictionForFixedWidth(
    originalHeight: number,
    originalWidth: number,
    maxHeight: number,
    width: number
  ) {
    if (originalHeight && originalWidth) {
      return {
        width,
        height: Math.round(
          Math.min(maxHeight, (width / originalWidth) * originalHeight)
        ),
      };
    } else {
      return this.getSizeRestrictionForFixedAspectRatio(
        1,
        1,
        Math.max(maxHeight, width)
      );
    }
  }

  private getSizeRestrictionForFixedAspectRatio(
    originalHeight: number,
    originalWidth: number,
    maxSize: number
  ) {
    return {
      height: Math.round(
        Math.max(maxSize, (maxSize / originalWidth) * originalHeight)
      ),
      width: Math.round(
        Math.max(maxSize, (maxSize / originalHeight) * originalWidth)
      ),
    };
  }
}
