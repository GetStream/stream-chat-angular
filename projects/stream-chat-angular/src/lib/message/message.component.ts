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
import { Attachment, UserResponse } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import {
  AttachmentListContext,
  MentionTemplateContext,
  MessageActionsBoxContext,
  MessageReactionsContext,
  DefaultStreamChatGenerics,
  StreamMessage,
  DeliveredStatusContext,
  SendingStatusContext,
  ReadStatusContext,
  CustomMessageActionItem,
  SystemMessageContext,
} from '../types';
import emojiRegex from 'emoji-regex';
import { Subscription } from 'rxjs';
import { CustomTemplatesService } from '../custom-templates.service';
import { listUsers } from '../list-users';
import { ThemeService } from '../theme.service';
import { NgxPopperjsTriggers, NgxPopperjsPlacements } from 'ngx-popperjs';
import { DateParserService } from '../date-parser.service';

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
  /**
   * Highlighting is used to add visual emphasize to a message when jumping to the message
   */
  @Input() isHighlighted = false;
  /**
   * A list of custom message actions to be displayed in the action box
   */
  @Input() customActions: CustomMessageActionItem[] = [];
  readonly themeVersion: '1' | '2';
  canReceiveReadEvents: boolean | undefined;
  canReactToMessage: boolean | undefined;
  isEditing: boolean | undefined;
  isActionBoxOpen = false;
  isReactionSelectorOpen = false;
  visibleMessageActionsCount = 0;
  messageTextParts: MessagePart[] = [];
  mentionTemplate: TemplateRef<MentionTemplateContext> | undefined;
  customDeliveredStatusTemplate:
    | TemplateRef<DeliveredStatusContext>
    | undefined;
  customSendingStatusTemplate: TemplateRef<SendingStatusContext> | undefined;
  customReadStatusTemplate: TemplateRef<ReadStatusContext> | undefined;
  attachmentListTemplate: TemplateRef<AttachmentListContext> | undefined;
  messageActionsBoxTemplate: TemplateRef<MessageActionsBoxContext> | undefined;
  messageReactionsTemplate: TemplateRef<MessageReactionsContext> | undefined;
  systemMessageTemplate: TemplateRef<SystemMessageContext> | undefined;
  popperTriggerClick = NgxPopperjsTriggers.click;
  popperTriggerHover = NgxPopperjsTriggers.hover;
  popperPlacementAuto = NgxPopperjsPlacements.AUTO;
  shouldDisplayTranslationNotice = false;
  displayedMessageTextContent: 'original' | 'translation' = 'original';
  imageAttachmentModalState: 'opened' | 'closed' = 'closed';
  private quotedMessageAttachments: Attachment[] | undefined;
  private user: UserResponse<DefaultStreamChatGenerics> | undefined;
  private subscriptions: Subscription[] = [];
  @ViewChild('container') private container:
    | ElementRef<HTMLElement>
    | undefined;

  constructor(
    private chatClientService: ChatClientService,
    private channelService: ChannelService,
    private customTemplatesService: CustomTemplatesService,
    private cdRef: ChangeDetectorRef,
    themeService: ThemeService,
    private dateParser: DateParserService
  ) {
    this.themeVersion = themeService.themeVersion;
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.chatClientService.user$.subscribe((u) => {
        this.user = u;
      })
    );
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
    this.subscriptions.push(
      this.customTemplatesService.deliveredStatusTemplate$.subscribe(
        (template) => (this.customDeliveredStatusTemplate = template)
      )
    );
    this.subscriptions.push(
      this.customTemplatesService.sendingStatusTemplate$.subscribe(
        (template) => (this.customSendingStatusTemplate = template)
      )
    );
    this.subscriptions.push(
      this.customTemplatesService.readStatusTemplate$.subscribe(
        (template) => (this.customReadStatusTemplate = template)
      )
    );
    this.subscriptions.push(
      this.customTemplatesService.systemMessageTemplate$.subscribe(
        (template) => (this.systemMessageTemplate = template)
      )
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.message) {
      this.shouldDisplayTranslationNotice = false;
      this.displayedMessageTextContent = 'original';
      this.createMessageParts();
      const originalAttachments = this.message?.quoted_message?.attachments;
      this.quotedMessageAttachments =
        originalAttachments && originalAttachments.length
          ? [originalAttachments[0]]
          : [];
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

  get shouldDisplayThreadLink() {
    return (
      !!this.message?.reply_count &&
      this.mode !== 'thread' &&
      this.enabledMessageActions.indexOf('send-reply') !== -1
    );
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
    return this.dateParser.parseDateTime(this.message.created_at);
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

  getAttachmentListContext(): AttachmentListContext {
    return {
      messageId: this.message?.id || '',
      attachments: this.message?.attachments || [],
      parentMessageId: this.message?.parent_id,
      imageModalStateChangeHandler: (state) =>
        (this.imageAttachmentModalState = state),
    };
  }

  getMessageContext(): SystemMessageContext {
    return {
      message: this.message,
      enabledMessageActions: this.enabledMessageActions,
      isHighlighted: this.isHighlighted,
      isLastSentMessage: this.isLastSentMessage,
      mode: this.mode,
      customActions: this.customActions,
      parsedDate: this.parsedDate,
    };
  }

  getQuotedMessageAttachmentListContext(): AttachmentListContext {
    return {
      messageId: this.message?.quoted_message?.id || '',
      attachments: this.quotedMessageAttachments!,
      parentMessageId: this?.message?.quoted_message?.parent_id,
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
      displayedActionsCountChangeHandler: (count) => {
        this.visibleMessageActionsCount = count;
        // message action box changes UI bindings in parent, so we'll have to rerun change detection
        this.cdRef.detectChanges();
      },
      isEditingChangeHandler: (isEditing) => {
        this.isEditing = isEditing;
        this.isActionBoxOpen = !this.isEditing;
      },
      customActions: this.customActions || [],
    };
  }

  getDeliveredStatusContext(): DeliveredStatusContext {
    return {
      message: this.message!,
    };
  }

  getSendingStatusContext(): SendingStatusContext {
    return {
      message: this.message!,
    };
  }

  getReadStatusContext(): ReadStatusContext {
    return {
      message: this.message!,
      readByText: this.readByText,
    };
  }

  jumpToMessage(messageId: string, parentMessageId?: string) {
    void this.channelService.jumpToMessage(messageId, parentMessageId);
  }

  displayTranslatedMessage() {
    this.createMessageParts(true);
  }

  displayOriginalMessage() {
    this.createMessageParts(false);
  }

  private createMessageParts(shouldTranslate = true) {
    let content = this.getMessageContent(shouldTranslate);
    if (!content) {
      this.messageTextParts = [];
    } else {
      let isHTML = false;
      // Backend will wrap HTML content with <p></p>\n
      if (content.startsWith('<p>')) {
        content = content.replace('<p>', '');
        isHTML = true;
      }
      if (content.endsWith('</p>\n')) {
        content = content.replace('</p>\n', '');
        isHTML = true;
      }
      if (
        !this.message!.mentioned_users ||
        this.message!.mentioned_users.length === 0
      ) {
        content = this.fixEmojiDisplay(content);
        if (!isHTML) {
          content = this.wrapLinskWithAnchorTag(content);
        }
        this.messageTextParts = [{ content, type: 'text' }];
      } else {
        this.messageTextParts = [];
        let text = content;
        this.message!.mentioned_users.forEach((user) => {
          const mention = `@${user.name || user.id}`;
          let precedingText = text.substring(0, text.indexOf(mention));
          precedingText = this.fixEmojiDisplay(precedingText);
          if (!isHTML) {
            precedingText = this.wrapLinskWithAnchorTag(precedingText);
          }
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
          text = this.fixEmojiDisplay(text);
          if (!isHTML) {
            text = this.wrapLinskWithAnchorTag(text);
          }
          this.messageTextParts.push({ content: text, type: 'text' });
        }
      }
    }
  }

  private getMessageContent(shouldTranslate: boolean) {
    const originalContent = this.message?.html || this.message?.text;
    if (shouldTranslate) {
      const translation = this.message?.translation;
      if (translation) {
        this.shouldDisplayTranslationNotice = true;
        this.displayedMessageTextContent = 'translation';
      }
      return translation || originalContent;
    } else {
      this.displayedMessageTextContent = 'original';
      return originalContent;
    }
  }

  private fixEmojiDisplay(content: string) {
    // Wrap emojis in span to display emojis correctly in Chrome https://bugs.chromium.org/p/chromium/issues/detail?id=596223
    const regex = new RegExp(emojiRegex(), 'g');
    // Based on this: https://stackoverflow.com/questions/4565112/javascript-how-to-find-out-if-the-user-browser-is-chrome
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    const isChrome =
      !!(window as any).chrome && typeof (window as any).opr === 'undefined';
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    content = content.replace(
      regex,
      (match) =>
        `<span ${
          isChrome ? 'class="str-chat__emoji-display-fix"' : ''
        }>${match}</span>`
    );

    return content;
  }

  private wrapLinskWithAnchorTag(content: string) {
    const urlRegexp =
      /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[A-Z0-9+&@#/%=~_|$])/gim;
    content = content.replace(
      urlRegexp,
      (match) => `<a href="${match}" rel="nofollow">${match}</a>`
    );

    return content;
  }
}
