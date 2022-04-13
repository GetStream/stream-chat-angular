import {
  Component,
  ElementRef,
  Input,
  TemplateRef,
  OnChanges,
  SimpleChanges,
  ViewChild,
  OnDestroy,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import { UserResponse } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import { getDeviceWidth } from '../device-width';
import {
  AttachmentListContext,
  MentionTemplateContext,
  MessageActionsBoxContext,
  MessageReactionsContext,
  DefaultStreamChatGenerics,
  StreamMessage,
} from '../types';
import { parseDate } from './parse-date';
import emojiRegex from 'emoji-regex';
import { Subscription } from 'rxjs';
import { CustomTemplatesService } from '../custom-templates.service';
import { listUsers } from '../list-users';

type MessagePart = {
  content: string;
  type: 'text' | 'mention';
  user?: UserResponse;
};

/**
 * The `Message` component displays a message with additional information such as sender and date, and enables [interaction with the message (i.e. edit or react)](../concepts/message-interactions.mdx).
 */
@Component({
  selector: 'stream-message',
  templateUrl: './message.component.html',
  styles: [],
})
export class MessageComponent implements OnInit, OnChanges, OnDestroy {
  /**
   * The message to be displayed
   */
  @Input() message: StreamMessage | undefined;
  /**
   * The list of [channel capabilities](https://getstream.io/chat/docs/javascript/channel_capabilities/?language=javascript) that are enabled for the current user, the list of [supported interactions](../concepts/message-interactions.mdx) can be found in our message interaction guide. Unathorized actions won't be displayed on the UI. The [`MessageList`](./MessageListComponent.mdx) component automatically sets this based on [channel capabilities](https://getstream.io/chat/docs/javascript/channel_capabilities/?language=javascript).
   */
  @Input() enabledMessageActions: string[] = [];
  /**
   * If `true`, the message status (sending, sent, who read the message) is displayed.
   */
  @Input() isLastSentMessage: boolean | undefined;
  /**
   * Determines if the message is being dispalyed in a channel or in a [thread](https://getstream.io/chat/docs/javascript/threads/?language=javascript).
   */
  @Input() mode: 'thread' | 'main' = 'main';
  canReceiveReadEvents: boolean | undefined;
  canReactToMessage: boolean | undefined;
  isEditing: boolean | undefined;
  isActionBoxOpen = false;
  isReactionSelectorOpen = false;
  isPressedOnMobile = false;
  visibleMessageActionsCount = 0;
  messageTextParts: MessagePart[] = [];
  mentionTemplate: TemplateRef<MentionTemplateContext> | undefined;
  attachmentListTemplate: TemplateRef<AttachmentListContext> | undefined;
  messageActionsBoxTemplate: TemplateRef<MessageActionsBoxContext> | undefined;
  messageReactionsTemplate: TemplateRef<MessageReactionsContext> | undefined;
  private user: UserResponse<DefaultStreamChatGenerics> | undefined;
  private subscriptions: Subscription[] = [];
  @ViewChild('container') private container:
    | ElementRef<HTMLElement>
    | undefined;

  constructor(
    private chatClientService: ChatClientService,
    private channelService: ChannelService,
    private customTemplatesService: CustomTemplatesService,
    private cdRef: ChangeDetectorRef
  ) {
    this.user = this.chatClientService.chatClient.user;
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.customTemplatesService.mentionTemplate$.subscribe(
        (template) => (this.mentionTemplate = template)
      )
    );
    this.subscriptions.push(
      this.customTemplatesService.attachmentListTemplate$.subscribe(
        (template) => (this.attachmentListTemplate = template)
      )
    );
    this.subscriptions.push(
      this.customTemplatesService.messageActionsBoxTemplate$.subscribe(
        (template) => (this.messageActionsBoxTemplate = template)
      )
    );
    this.subscriptions.push(
      this.customTemplatesService.messageReactionsTemplate$.subscribe(
        (template) => (this.messageReactionsTemplate = template)
      )
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.message) {
      this.createMessageParts();
    }
    if (changes.enabledMessageActions) {
      this.canReactToMessage =
        this.enabledMessageActions.indexOf('send-reaction') !== -1;
      this.canReceiveReadEvents =
        this.enabledMessageActions.indexOf('read-events') !== -1;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  get isSentByCurrentUser() {
    return this.message?.user?.id === this.user?.id;
  }

  get readByText() {
    return listUsers(this.message!.readBy);
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
      this.message.status === 'sending' ||
      (this.mode === 'thread' && !this.message.parent_id)
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

  get replyCountParam() {
    return { replyCount: this.message?.reply_count };
  }

  get canDisplayReadStatus() {
    return (
      this.canReceiveReadEvents !== false &&
      this.enabledMessageActions.indexOf('read-events') !== -1
    );
  }

  get quotedMessageAttachments() {
    const originalAttachments = this.message?.quoted_message?.attachments;
    return originalAttachments && originalAttachments.length
      ? [originalAttachments[0]]
      : [];
  }

  getAttachmentListContext(): AttachmentListContext {
    return {
      messageId: this.message?.id || '',
      attachments: this.message?.attachments || [],
    };
  }

  getMessageReactionsContext(): MessageReactionsContext {
    return {
      messageReactionCounts: this.message?.reaction_counts || {},
      latestReactions: this.message?.latest_reactions || [],
      isSelectorOpen: this.isReactionSelectorOpen,
      isSelectorOpenChangeHandler: (isOpen) =>
        (this.isReactionSelectorOpen = isOpen),
      messageId: this.message?.id,
      ownReactions: this.message?.own_reactions || [],
    };
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

  setAsActiveParentMessage() {
    void this.channelService.setAsActiveParentMessage(this.message);
  }

  getMentionContext(messagePart: MessagePart): MentionTemplateContext {
    return {
      content: messagePart.content,
      user: messagePart.user!,
    };
  }

  getMessageActionsBoxContext(): MessageActionsBoxContext {
    return {
      isOpen: this.isActionBoxOpen,
      isMine: this.isSentByCurrentUser,
      enabledActions: this.enabledMessageActions,
      message: this.message,
      displayedActionsCountChaneHanler: (count) => {
        this.visibleMessageActionsCount = count;
        // message action box changes UI bindings in parent, so we'll have to rerun change detection
        this.cdRef.detectChanges();
      },
      isEditingChangeHandler: (isEditing) => {
        this.isEditing = isEditing;
        this.isActionBoxOpen = !this.isEditing;
      },
    };
  }

  private createMessageParts() {
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
        // Wrap emojis in span to display emojis correctly in Chrome https://bugs.chromium.org/p/chromium/issues/detail?id=596223
        const regex = new RegExp(emojiRegex(), 'g');
        // Based on this: https://stackoverflow.com/questions/4565112/javascript-how-to-find-out-if-the-user-browser-is-chrome
        /* eslint-disable @typescript-eslint/no-unsafe-member-access */
        const isChrome =
          !!(window as any).chrome &&
          typeof (window as any).opr === 'undefined';
        /* eslint-enable @typescript-eslint/no-unsafe-member-access */
        content = content.replace(
          regex,
          (match) =>
            `<span ${
              isChrome ? 'class="str-chat__emoji-display-fix"' : ''
            }>${match}</span>`
        );
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
