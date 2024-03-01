import { Injectable } from '@angular/core';

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
   * - user mentions -> you can customize this with your own template using the [`customTemplatesService.mentionTemplate$`](https://getstream.io/chat/docs/sdk/angular/services/CustomTemplatesService/#mentiontemplate)
   * - links -> you can customize this by providing you own [`customLinkRenderer`](#customlinkrenderer) method
   */
  displayAs: 'text' | 'html' = 'text';

  /**
   * You can provide a custom method to display links
   *
   * @param url the url the link should refer to
   * @returns the HTML markup as a string for the link
   */
  customLinkRenderer?: (url: string) => string;

  constructor() {}
}
