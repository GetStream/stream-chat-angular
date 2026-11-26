import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MentionTemplateContext, StreamMessage } from '../types';
import { UserResponse } from 'stream-chat';
import emojiRegex from 'emoji-regex';
import { find as findLinks } from 'linkifyjs';
import { MessageService } from '../message.service';
import { CustomTemplatesService } from '../custom-templates.service';

type MessagePart = {
  content: string;
  type: 'text' | 'mention';
  user?: UserResponse;
};

type DetectedLink = {
  start: number;
  end: number;
  value: string;
  href: string;
};

const linkifyOptions = { defaultProtocol: 'https' };
const allowedLinkSchemes = /^(?:https?|ftp|file):\/\//i;
const htmlTagDelimiters = /[<>]/;

/**
 * The `MessageTextComponent` displays the text content of a message.
 */
@Component({
  selector: 'stream-message-text',
  templateUrl: './message-text.component.html',
  styles: [],
})
export class MessageTextComponent implements OnChanges {
  /**
   * The message which text should be displayed
   */
  @Input() message: StreamMessage | undefined | StreamMessage['quoted_message'];
  /**
   * `true` if the component displayes a message quote
   */
  @Input() isQuoted: boolean = false;
  /**
   * `true` if the
   */
  @Input() shouldTranslate: boolean = false;
  messageTextParts: MessagePart[] | undefined = [];
  messageText?: string;
  displayAs: 'text' | 'html';
  private emojiRegexp = new RegExp(emojiRegex(), 'g');

  constructor(
    private messageService: MessageService,
    readonly customTemplatesService: CustomTemplatesService
  ) {
    this.displayAs = this.messageService.displayAs;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.message || changes.shouldTranslate) {
      this.createMessageParts();
    }
  }

  getMentionContext(messagePart: MessagePart): MentionTemplateContext {
    return {
      content: messagePart.content,
      user: messagePart.user!,
    };
  }

  private createMessageParts() {
    this.messageTextParts = undefined;
    this.messageText = undefined;
    let content = this.getMessageContent();
    if (
      (!this.message!.mentioned_users ||
        this.message!.mentioned_users.length === 0) &&
      !content?.match(this.emojiRegexp) &&
      !(content && this.detectLinks(content).length > 0)
    ) {
      this.messageTextParts = undefined;
      this.messageText = content;
      return;
    }
    if (!content) {
      return;
    }
    if (
      !this.message!.mentioned_users ||
      this.message!.mentioned_users.length === 0
    ) {
      content = this.fixEmojiDisplay(content);
      content = this.wrapLinksWithAnchorTag(content);
      this.messageTextParts = [{ content, type: 'text' }];
    } else {
      this.messageTextParts = [];
      let text = content;
      this.message!.mentioned_users.forEach((user) => {
        const mention = `@${user.name || user.id}`;
        const precedingText = text.substring(0, text.indexOf(mention));
        let formattedPrecedingText = this.fixEmojiDisplay(precedingText);
        formattedPrecedingText = this.wrapLinksWithAnchorTag(
          formattedPrecedingText
        );
        this.messageTextParts!.push({
          content: formattedPrecedingText,
          type: 'text',
        });
        this.messageTextParts!.push({
          content: mention,
          type: 'mention',
          user,
        });
        text = text.replace(precedingText + mention, '');
      });
      if (text) {
        text = this.fixEmojiDisplay(text);
        text = this.wrapLinksWithAnchorTag(text);
        this.messageTextParts.push({ content: text, type: 'text' });
      }
    }
  }

  private getMessageContent() {
    const originalContent = this.message?.text;
    if (this.shouldTranslate) {
      const translation = this.message?.translation;
      return translation || originalContent;
    } else {
      return originalContent;
    }
  }

  private fixEmojiDisplay(content: string) {
    // Wrap emojis in span to display emojis correctly in Chrome https://bugs.chromium.org/p/chromium/issues/detail?id=596223
    // Based on this: https://stackoverflow.com/questions/4565112/javascript-how-to-find-out-if-the-user-browser-is-chrome
    /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
    const isChrome =
      !!(window as any).chrome && typeof (window as any).opr === 'undefined';
    /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
    content = content.replace(
      this.emojiRegexp,
      (match) =>
        `<span ${
          isChrome ? 'class="str-chat__emoji-display-fix"' : ''
        }>${match}</span>`
    );

    return content;
  }

  private wrapLinksWithAnchorTag(content: string) {
    if (this.displayAs === 'html') {
      return content;
    }
    const links = this.detectLinks(content);
    if (links.length === 0) {
      return content;
    }
    let result = '';
    let lastIndex = 0;
    links.forEach((link) => {
      result += content.slice(lastIndex, link.start);
      if (this.messageService.customLinkRenderer) {
        result += this.messageService.customLinkRenderer(link.value);
      } else {
        const href = link.href.replace(/"/g, '&quot;');
        result += `<a href="${href}" target="_blank" rel="nofollow">${link.value}</a>`;
      }
      lastIndex = link.end;
    });
    result += content.slice(lastIndex);

    return result;
  }

  // Finds links with linkifyjs, which tokenizes in linear time, so long
  // messages stay fast to render. Keep the linkifyjs dependency at >= 4.4.0,
  // older versions are slow on some long inputs (see the message-text spec)
  private detectLinks(content: string): DetectedLink[] {
    const links: DetectedLink[] = [];
    findLinks(content, 'url', linkifyOptions).forEach((link) => {
      let detected: DetectedLink | undefined = link;
      // The content may already contain HTML (emoji wrappers), never let a link swallow a tag
      const tagIndex = link.value.search(htmlTagDelimiters);
      if (tagIndex !== -1) {
        const [trimmed] = findLinks(
          link.value.slice(0, tagIndex),
          'url',
          linkifyOptions
        );
        detected =
          trimmed?.start === 0
            ? { ...trimmed, start: link.start, end: link.start + trimmed.end }
            : undefined;
      }
      if (detected && allowedLinkSchemes.test(detected.href)) {
        links.push(detected);
      }
    });

    return links;
  }
}
