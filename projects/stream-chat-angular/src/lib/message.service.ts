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
   */
  displayAs: 'text' | 'html' = 'text';

  constructor() {}
}
