import { Injectable } from '@angular/core';
import { Attachment } from 'stream-chat';
import {
  AttachmentConfigration,
  DefaultStreamChatGenerics,
  ImageAttachmentConfiguration,
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
    type: 'gallery' | 'single' | 'carousel',
    containerElement: HTMLElement
  ) => ImageAttachmentConfiguration;
  /**
   * A custom handler can be provided to override the default video attachment (videos uploaded from files) configuration. By default the SDK uses fixed height (a size that's known before video is loaded), if you override that with dynamic height (for example: height: 100%) the scrolling logic inside the message list can break.
   */
  customVideoAttachmentConfigurationHandler?: (
    a: Attachment<T>,
    containerElement: HTMLElement
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
   * @param element The default resizing logics reads the height/max-height and max-width propperties of this element and reduces file size based on the given values. File size reduction is done by Stream's CDN.
   */
  getImageAttachmentConfiguration(
    attachment: Attachment<T>,
    location: 'gallery' | 'single' | 'carousel',
    element: HTMLElement
  ): ImageAttachmentConfiguration {
    if (this.customImageAttachmentConfigurationHandler) {
      return this.customImageAttachmentConfigurationHandler(
        attachment,
        location,
        element
      );
    }

    const defaultOriginalDimension = 1000000;
    const urlString = (attachment.img_url ||
      attachment.thumb_url ||
      attachment.image_url ||
      '') as string;
    let url: URL;
    try {
      url = new URL(urlString);
    } catch (error) {
      return {
        url: urlString,
        width: '', // Not set to respect responsive width
        height: '', // Set from CSS
        originalHeight: defaultOriginalDimension,
        originalWidth: defaultOriginalDimension,
      };
    }
    const originalHeight =
      Number(url.searchParams.get('oh')) > 1
        ? Number(url.searchParams.get('oh'))
        : defaultOriginalDimension;
    const originalWidth =
      Number(url.searchParams.get('ow')) > 1
        ? Number(url.searchParams.get('ow'))
        : defaultOriginalDimension;
    const displayWarning = location === 'gallery' || location === 'single';
    const sizeRestriction = this.getSizingRestrictions(
      url,
      element,
      displayWarning
    );

    if (sizeRestriction) {
      // Apply 2x for retina displays
      sizeRestriction.height *= 2;
      sizeRestriction.width *= 2;
      this.addResizingParamsToUrl(sizeRestriction, url);
    }

    return {
      url: url.href,
      width: '', // Not set to respect responsive width
      height: '', // Set from CSS
      originalHeight,
      originalWidth,
    };
  }

  /**
   * Handles the configuration for video attachments, it's possible to provide your own function to override the default logic
   * @param attachment The attachment to configure
   * @param element The default resizing logics reads the height/max-height and max-width propperties of this element and reduces file size based on the given values. File size reduction is done by Stream's CDN.
   */
  getVideoAttachmentConfiguration(
    attachment: Attachment<T>,
    element: HTMLElement
  ): VideoAttachmentConfiguration {
    if (this.customVideoAttachmentConfigurationHandler) {
      return this.customVideoAttachmentConfigurationHandler(
        attachment,
        element
      );
    }

    let thumbUrl: string | undefined = undefined;
    let originalHeight = 1000000;
    let originalWidth = 1000000;
    if (attachment.thumb_url && this.shouldGenerateVideoThumbnail) {
      let url: URL;
      try {
        url = new URL(attachment.thumb_url);

        originalHeight =
          Number(url.searchParams.get('oh')) > 1
            ? Number(url.searchParams.get('oh'))
            : originalHeight;
        originalWidth =
          Number(url.searchParams.get('ow')) > 1
            ? Number(url.searchParams.get('ow'))
            : originalWidth;
        const displayWarning = true;
        const sizeRestriction = this.getSizingRestrictions(
          url,
          element,
          displayWarning
        );
        if (sizeRestriction) {
          sizeRestriction.height *= 2;
          sizeRestriction.width *= 2;
          this.addResizingParamsToUrl(sizeRestriction, url);
        }
        thumbUrl = url.href;
      } catch {
        thumbUrl = attachment.thumb_url;
      }
    }
    return {
      url: attachment.asset_url || '',
      width: '', // Not set to respect responsive width
      height: '', // Set from CSS
      thumbUrl: thumbUrl,
      originalHeight,
      originalWidth,
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

  private addResizingParamsToUrl(
    sizeRestriction: { width: number; height: number },
    url: URL
  ) {
    url.searchParams.set('h', sizeRestriction.height.toString());
    url.searchParams.set('w', sizeRestriction.width.toString());
  }

  private getSizingRestrictions(
    url: URL,
    htmlElement: HTMLElement,
    displayWarning = false
  ) {
    const urlParams = url.searchParams;
    const originalHeight = Number(urlParams.get('oh')) || 1;
    const originalWidth = Number(urlParams.get('ow')) || 1;
    const cssSizeRestriction = this.getCSSSizeRestriction(htmlElement);
    let sizeRestriction: { width: number; height: number } | undefined;

    if (
      (cssSizeRestriction.maxHeight || cssSizeRestriction.height) &&
      cssSizeRestriction.maxWidth
    ) {
      sizeRestriction = this.getSizeRestrictions(
        originalHeight,
        originalWidth,
        (cssSizeRestriction.maxHeight || cssSizeRestriction.height)!,
        cssSizeRestriction.maxWidth
      );
    } else {
      sizeRestriction = undefined;
      if (displayWarning) {
        console.warn(
          `Invalid value set for height/max-height and/or max-width for HTML element, this can cause scrolling issues inside the message list, more info https://getstream.io/chat/docs/sdk/angular/components/AttachmentListComponent/#image-and-video-sizing, attachment URL: ${url.toString()}`
        );
      }
    }

    return sizeRestriction;
  }

  private getSizeRestrictions(
    originalHeight: number,
    originalWidth: number,
    maxHeight: number,
    maxWidth: number
  ) {
    return {
      height: Math.round(
        Math.max(maxHeight, (maxWidth / originalWidth) * originalHeight)
      ),
      width: Math.round(
        Math.max(maxHeight, (maxWidth / originalHeight) * originalWidth)
      ),
    };
  }

  private getCSSSizeRestriction(htmlElement: HTMLElement) {
    const computedStylesheet = getComputedStyle(htmlElement);
    const height = this.getValueRepresentationOfCSSProperty(
      computedStylesheet.getPropertyValue('height')
    );
    const maxHeight = this.getValueRepresentationOfCSSProperty(
      computedStylesheet.getPropertyValue('max-height')
    );
    const maxWidth = this.getValueRepresentationOfCSSProperty(
      computedStylesheet.getPropertyValue('max-width')
    );

    return { height, maxHeight, maxWidth };
  }

  private getValueRepresentationOfCSSProperty(property: string) {
    return Number(property.replace('px', '')) || undefined;
  }
}
