import {
  Component,
  ElementRef,
  Input,
  TemplateRef,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { UserResponse } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import { getDeviceWidth } from '../device-width';
import { DefaultUserType, StreamMessage } from '../types';
import { parseDate } from './parse-date';
import { getReadByText } from './read-by-text';

@Component({
  selector: 'stream-message',
  templateUrl: './message.component.html',
  styles: [],
})
export class MessageComponent implements OnChanges {
  @Input() messageInputTemplate: TemplateRef<any> | undefined;
  @Input() mentionTemplate: TemplateRef<any> | undefined;
  @Input() message: StreamMessage | undefined;
  @Input() enabledMessageActions: string[] = [];
  /**
   * @deprecated https://getstream.io/chat/docs/sdk/angular/components/message_list/#caution-arereactionsenabled-deprecated
   */
  @Input() areReactionsEnabled: boolean | undefined;
  /**
   * @deprecated https://getstream.io/chat/docs/sdk/angular/components/message_list/#canreacttomessage-deprecated
   */
  @Input() canReactToMessage: boolean | undefined;
  @Input() isLastSentMessage: boolean | undefined;
  /**
   * @deprecated https://getstream.io/chat/docs/sdk/angular/components/message_list/#canreceivereadevents-deprecated
   */
  @Input() canReceiveReadEvents: boolean | undefined;
  isEditing: boolean | undefined;
  isActionBoxOpen = false;
  isReactionSelectorOpen = false;
  isPressedOnMobile = false;
  visibleMessageActionsCount = 0;
  messageTextParts: {
    content: string;
    type: 'text' | 'mention';
    user?: UserResponse;
  }[] = [];
  private user: UserResponse<DefaultUserType> | undefined;
  @ViewChild('container') private container:
    | ElementRef<HTMLElement>
    | undefined;

  constructor(
    private chatClientService: ChatClientService,
    private channelService: ChannelService
  ) {
    this.user = this.chatClientService.chatClient.user;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.message) {
      let content = this.message?.html || this.message?.text;
      if (!content) {
        this.messageTextParts = [];
      } else {
        // Backend will wrap HTML content with <p></p>\n
        if (content.startsWith('<p>')) {
          content = content.replace('<p>', '');
        }
        if (content.endsWith('</p>\n')) {
          content = content.replace('</p>\n', '');
        }
        if (
          !this.message!.mentioned_users ||
          this.message!.mentioned_users.length === 0
        ) {
          this.messageTextParts = [{ content, type: 'text' }];
        } else {
          this.messageTextParts = [];
          let text = content;
          this.message!.mentioned_users.forEach((user) => {
            const mention = `@${user.name || user.id}`;
            const precedingText = text.substring(0, text.indexOf(mention));
            this.messageTextParts.push({
              content: precedingText,
              type: 'text',
            });
            this.messageTextParts.push({
              content: mention,
              type: 'mention',
              user,
            });
            text = text.replace(precedingText + mention, '');
          });
          if (text) {
            this.messageTextParts.push({ content: text, type: 'text' });
          }
        }
      }
    }
  }

  get isSentByCurrentUser() {
    return this.message?.user?.id === this.user?.id;
  }

  get readByText() {
    return getReadByText(this.message!.readBy);
  }

  get lastReadUser() {
    return this.message?.readBy.filter((u) => u.id !== this.user?.id)[0];
  }

  get isOnlyReadByMe() {
    return this.message && this.message.readBy.length === 0;
  }

  get isReadByMultipleUsers() {
    return this.message && this.message.readBy.length > 1;
  }

  get isMessageDeliveredAndRead() {
    return (
      this.message &&
      this.message.readBy &&
      this.message.status === 'received' &&
      this.message.readBy.length > 0
    );
  }

  get parsedDate() {
    if (!this.message || !this.message?.created_at) {
      return;
    }
    return parseDate(this.message.created_at);
  }

  get areOptionsVisible() {
    if (!this.message) {
      return false;
    }
    return !(
      !this.message.type ||
      this.message.type === 'error' ||
      this.message.type === 'system' ||
      this.message.type === 'ephemeral' ||
      this.message.status === 'failed' ||
      this.message.status === 'sending'
    );
  }

  get hasAttachment() {
    return !!this.message?.attachments && !!this.message.attachments.length;
  }

  get hasReactions() {
    return (
      !!this.message?.reaction_counts &&
      Object.keys(this.message.reaction_counts).length > 0
    );
  }

  resendMessage() {
    void this.channelService.resendMessage(this.message!);
  }

  textClicked() {
    if (getDeviceWidth().device !== 'mobile') {
      this.isPressedOnMobile = false;
      return;
    }
    if (this.isPressedOnMobile) {
      return;
    }
    this.isPressedOnMobile = true;
    const eventHandler = (event: Event) => {
      if (!this.container?.nativeElement.contains(event.target as Node)) {
        this.isPressedOnMobile = false;
        window.removeEventListener('click', eventHandler);
      }
    };
    window.addEventListener('click', eventHandler);
  }
}
