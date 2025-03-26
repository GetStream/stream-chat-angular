import { Injectable } from '@angular/core';
import { Attachment } from 'stream-chat';

/**
 * The message service contains configuration options related to displaying the message content
 */
@Injectable({
  providedIn: 'root',
})
export class MessageService {
  /**
   * Decides if the message content should be formatted as text or HTML
   *
   * If you display messages as text the following parts are still be displayed as HTML:
   * - user mentions -> you can customize this with your own template using the [`customTemplatesService.mentionTemplate$`](/chat/docs/sdk/angular/v7-rc/services/CustomTemplatesService/#mentiontemplate)
   * - links -> you can customize this by providing you own [`customLinkRenderer`](#customlinkrenderer) method
   */
  displayAs: 'text' | 'html' = 'text';

  /**
   * You can provide a custom method to display links
   * @param url the url the link should refer to
   * @returns the HTML markup as a string for the link
   */
  customLinkRenderer?: (url: string) => string;
  /**
   * The SDK supports the following attachment types: `image`, `file`, `giphy`, `video` and `voiceRecording` attachments.
   *
   * All other types are treated as custom attachments, however it's possible to override this logic, and provide a custom filtering method which can be used to treat some built-in attachments as custom.
   *
   * Provide a method which retruns `true` if an attachment should be considered as custom.
   */
  filterCustomAttachment?: (attachment: Attachment) => boolean;

  constructor() {}

  /**
   * Tells if an attachment is custom (you need to provide your own template to display them) or built-in (the SDK supports it out-of-the-box)
   * @param attachment
   * @returns `true` if the attachment is custom
   */
  isCustomAttachment(attachment: Attachment) {
    if (this.filterCustomAttachment) {
      return this.filterCustomAttachment(attachment);
    } else {
      return (
        attachment.type !== 'image' &&
        attachment.type !== 'file' &&
        attachment.type !== 'video' &&
        attachment.type !== 'voiceRecording' &&
        attachment.type !== 'giphy'
      );
    }
  }
}
