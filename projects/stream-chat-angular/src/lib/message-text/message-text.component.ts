import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import {
  DefaultStreamChatGenerics,
  MentionTemplateContext,
  StreamMessage,
} from '../types';
import { MessageResponseBase, UserResponse } from 'stream-chat';
import emojiRegex from 'emoji-regex';
import { MessageService } from '../message.service';
import { CustomTemplatesService } from '../custom-templates.service';

type MessagePart = {
  content: string;
  type: 'text' | 'mention';
  user?: UserResponse;
};

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
  @Input() message:
    | StreamMessage<DefaultStreamChatGenerics>
    | undefined
    | MessageResponseBase<DefaultStreamChatGenerics>;
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
  private readonly urlRegexp: RegExp;
  private emojiRegexp = new RegExp(emojiRegex(), 'g');

  constructor(
    private messageService: MessageService,
    readonly customTemplatesService: CustomTemplatesService
  ) {
    this.displayAs = this.messageService.displayAs;
    try {
      this.urlRegexp = new RegExp(
        '(?:(?:https?|ftp|file):\\/\\/|www\\.|ftp\\.|(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,})(?![^\\s]*@[^\\s]*)(?:[^\\s()<>]+|\\([\\w\\d]+\\))*(?<!@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
        'gim'
      );
    } catch {
      this.urlRegexp =
        /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[A-Z0-9+&@#/%=~_|$])/gim;
    }
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
      !content?.match(this.urlRegexp)
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
    content = content.replace(this.urlRegexp, (match) => {
      if (this.messageService.customLinkRenderer) {
        return this.messageService.customLinkRenderer(match);
      } else {
        let href = match;
        if (
          !href.startsWith('http') &&
          !href.startsWith('ftp') &&
          !href.startsWith('file')
        ) {
          href = `https://${match}`;
        }
        return `<a href="${href}" target="_blank" rel="nofollow">${match}</a>`;
      }
    });

    return content;
  }
}
