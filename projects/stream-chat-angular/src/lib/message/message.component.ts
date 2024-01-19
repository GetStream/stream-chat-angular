import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  OnDestroy,
  OnInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  NgZone,
  AfterViewInit,
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
import { MessageService } from '../message.service';
import { MessageActionsService } from '../message-actions.service';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageComponent
  implements OnInit, OnChanges, OnDestroy, AfterViewInit
{
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
   *
   * @deprecated please use the [`MessageActionsService`](https://getstream.io/chat/docs/sdk/angular/services/MessageActionsService) to set this property.
   */
  @Input() customActions: CustomMessageActionItem[] = [];
  readonly themeVersion: '1' | '2';
  canReceiveReadEvents: boolean | undefined;
  canReactToMessage: boolean | undefined;
  isEditing: boolean | undefined;
  isActionBoxOpen = false;
  isReactionSelectorOpen = false;
  visibleMessageActionsCount = 0;
  messageTextParts: MessagePart[] | undefined = [];
  messageText?: string;
  popperTriggerClick = NgxPopperjsTriggers.click;
  popperTriggerHover = NgxPopperjsTriggers.hover;
  popperPlacementAuto = NgxPopperjsPlacements.AUTO;
  shouldDisplayTranslationNotice = false;
  displayedMessageTextContent: 'original' | 'translation' = 'original';
  imageAttachmentModalState: 'opened' | 'closed' = 'closed';
  shouldDisplayThreadLink = false;
  isSentByCurrentUser = false;
  readByText = '';
  displayAs: 'text' | 'html';
  lastReadUser: UserResponse<DefaultStreamChatGenerics> | undefined = undefined;
  isOnlyReadByMe = false;
  isReadByMultipleUsers = false;
  isMessageDeliveredAndRead = false;
  parsedDate = '';
  areOptionsVisible = false;
  hasAttachment = false;
  hasReactions = false;
  replyCountParam: { replyCount: number | undefined } = {
    replyCount: undefined,
  };
  canDisplayReadStatus = false;
  private quotedMessageAttachments: Attachment[] | undefined;
  user: UserResponse<DefaultStreamChatGenerics> | undefined;
  optionsRenderTimeoutEnded = false;
  private subscriptions: Subscription[] = [];
  private isViewInited = false;
  @ViewChild('container') private container:
    | ElementRef<HTMLElement>
    | undefined;
  private readonly urlRegexp =
    /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[A-Z0-9+&@#/%=~_|$])/gim;
  private emojiRegexp = new RegExp(emojiRegex(), 'g');

  constructor(
    private chatClientService: ChatClientService,
    private channelService: ChannelService,
    public customTemplatesService: CustomTemplatesService,
    private cdRef: ChangeDetectorRef,
    themeService: ThemeService,
    private dateParser: DateParserService,
    private ngZone: NgZone,
    private messageService: MessageService,
    private messageActionsService: MessageActionsService
  ) {
    this.themeVersion = themeService.themeVersion;
    this.displayAs = this.messageService.displayAs;
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.chatClientService.user$.subscribe((u) => {
        if (u !== this.user) {
          this.user = u;
          this.setIsSentByCurrentUser();
          this.setLastReadUser();
          this.cdRef.detectChanges();
        }
      })
    );
    this.subscriptions.push(
      this.messageActionsService.messageToEdit$.subscribe((m) => {
        let isEditing = false;
        if (m && m.id === this.message?.id) {
          isEditing = true;
        }
        if (isEditing !== this.isEditing) {
          this.isEditing = isEditing;
          if (this.isViewInited) {
            this.cdRef.detectChanges();
          }
        }
      })
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
      this.setIsSentByCurrentUser();
      this.setLastReadUser();
      this.readByText = this.message?.readBy
        ? listUsers(this.message.readBy)
        : '';
      this.isOnlyReadByMe = !!(
        this.message &&
        this.message.readBy &&
        this.message.readBy.length === 0
      );
      this.isReadByMultipleUsers = !!(
        this.message &&
        this.message.readBy &&
        this.message.readBy.length > 1
      );
      this.isMessageDeliveredAndRead = !!(
        this.message &&
        this.message.readBy &&
        this.message.status === 'received' &&
        this.message.readBy.length > 0
      );
      this.parsedDate =
        (this.message &&
          this.message.created_at &&
          this.dateParser.parseDateTime(this.message.created_at)) ||
        '';
      this.hasAttachment =
        !!this.message?.attachments && !!this.message.attachments.length;
      this.hasReactions =
        !!this.message?.reaction_counts &&
        Object.keys(this.message.reaction_counts).length > 0;
      this.replyCountParam = { replyCount: this.message?.reply_count };
    }
    if (changes.enabledMessageActions) {
      this.canReactToMessage =
        this.enabledMessageActions.indexOf('send-reaction') !== -1;
      this.canReceiveReadEvents =
        this.enabledMessageActions.indexOf('read-events') !== -1;
      this.canDisplayReadStatus =
        this.canReceiveReadEvents !== false &&
        this.enabledMessageActions.indexOf('read-events') !== -1;
    }
    if (changes.message || changes.enabledMessageActions || changes.mode) {
      this.shouldDisplayThreadLink =
        !!this.message?.reply_count && this.mode !== 'thread';
    }
    if (changes.message || changes.mode) {
      this.areOptionsVisible = this.message
        ? !(
            !this.message.type ||
            this.message.type === 'error' ||
            this.message.type === 'system' ||
            this.message.type === 'ephemeral' ||
            this.message.status === 'failed' ||
            this.message.status === 'sending' ||
            (this.mode === 'thread' && !this.message.parent_id)
          )
        : false;
    }
    if (
      changes.message ||
      changes.enabledMessageActions ||
      changes.customActions
    ) {
      if (this.message) {
        this.visibleMessageActionsCount =
          this.messageActionsService.getAuthorizedMessageActionsCount(
            this.message,
            this.enabledMessageActions
          );
      } else {
        this.visibleMessageActionsCount = 0;
      }
    }
  }

  ngAfterViewInit(): void {
    this.isViewInited = true;
    this.ngZone.runOutsideAngular(() => {
      this.container?.nativeElement.addEventListener('mouseleave', () =>
        this.mouseLeft()
      );
    });
    setTimeout(() => {
      this.optionsRenderTimeoutEnded = true;
      this.cdRef.detectChanges();
    }, 0);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
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

  mouseLeft() {
    if (this.isActionBoxOpen) {
      this.ngZone.run(() => {
        this.isActionBoxOpen = false;
      });
    }
  }

  private createMessageParts(shouldTranslate = true) {
    this.messageTextParts = undefined;
    this.messageText = undefined;
    let content = this.getMessageContent(shouldTranslate);
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
      content = this.wrapLinskWithAnchorTag(content);
      this.messageTextParts = [{ content, type: 'text' }];
    } else {
      this.messageTextParts = [];
      let text = content;
      this.message!.mentioned_users.forEach((user) => {
        const mention = `@${user.name || user.id}`;
        const precedingText = text.substring(0, text.indexOf(mention));
        let formattedPrecedingText = this.fixEmojiDisplay(precedingText);
        formattedPrecedingText = this.wrapLinskWithAnchorTag(
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
        text = this.wrapLinskWithAnchorTag(text);
        this.messageTextParts.push({ content: text, type: 'text' });
      }
    }
  }

  private getMessageContent(shouldTranslate: boolean) {
    const originalContent = this.message?.text;
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
    // Based on this: https://stackoverflow.com/questions/4565112/javascript-how-to-find-out-if-the-user-browser-is-chrome
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    const isChrome =
      !!(window as any).chrome && typeof (window as any).opr === 'undefined';
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    content = content.replace(
      this.emojiRegexp,
      (match) =>
        `<span ${
          isChrome ? 'class="str-chat__emoji-display-fix"' : ''
        }>${match}</span>`
    );

    return content;
  }

  private wrapLinskWithAnchorTag(content: string) {
    if (this.displayAs === 'html') {
      return content;
    }
    content = content.replace(
      this.urlRegexp,
      (match) => `<a href="${match}" rel="nofollow">${match}</a>`
    );

    return content;
  }

  private setIsSentByCurrentUser() {
    this.isSentByCurrentUser = this.message?.user?.id === this.user?.id;
  }

  private setLastReadUser() {
    this.lastReadUser = this.message?.readBy?.filter(
      (u) => u.id !== this.user?.id
    )[0];
  }
}
