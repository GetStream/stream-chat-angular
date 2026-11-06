import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  OnInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  NgZone,
} from '@angular/core';
import {
  Attachment,
  Channel,
  LocalMessage,
  nsToDate,
  nsToRfc3339,
  UserResponse,
} from 'stream-chat';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import {
  AttachmentListContext,
  MessageActionsBoxContext,
  MessageReactionsContext,
  DeliveredStatusContext,
  SendingStatusContext,
  ReadStatusContext,
  SystemMessageContext,
  CustomMetadataContext,
  MessageTextContext,
  MessageBlockedContext,
} from '../types';
import { Observable, pairwise, Subscription, take } from 'rxjs';
import { CustomTemplatesService } from '../custom-templates.service';
import { listUsers } from '../list-users';
import { DateParserService } from '../date-parser.service';
import { MessageActionsService } from '../message-actions.service';
import {
  NgxFloatUiContentComponent,
  NgxFloatUiLooseDirective,
} from 'ngx-float-ui';
import { TranslateService } from '@ngx-translate/core';
import { isSafari } from '../is-safari';
import { getMessageTranslation } from '../get-message-translation';
import { watchReadBy } from '../read-by';

/**
 * The `Message` component displays a message with additional information such as sender and date, and enables [interaction with the message (i.e. edit or react)](/chat/docs/sdk/angular/concepts/message-interactions/).
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
  @Input() message: LocalMessage | undefined;
  /**
   * The channel of the message, it's used to display who read the message. The [`MessageList`](/chat/docs/sdk/angular/components/MessageListComponent/) component automatically sets this.
   */
  @Input() channel: Channel | undefined;
  /**
   * The list of [channel capabilities](/chat/docs/node/chat-permission-policies/) that are enabled for the current user, the list of [supported interactions](/chat/docs/sdk/angular/concepts/message-interactions/) can be found in our message interaction guide. Unathorized actions won't be displayed on the UI. The [`MessageList`](/chat/docs/sdk/angular/components/MessageListComponent/) component automatically sets this based on [channel capabilities](/chat/docs/node/chat-permission-policies/).
   */
  @Input() enabledMessageActions: string[] = [];
  /**
   * If `true`, the message status (sending, sent, who read the message) is displayed.
   */
  @Input() isLastSentMessage: boolean | undefined;
  /**
   * Determines if the message is being dispalyed in a channel or in a [thread](/chat/docs/javascript/threads/).
   */
  @Input() mode: 'thread' | 'main' = 'main';
  /**
   * Highlighting is used to add visual emphasize to a message when jumping to the message
   */
  @Input() isHighlighted = false;
  /**
   * An Observable that emits when the message list is scrolled, it's used to prevent opening the message menu while scroll is in progress
   */
  @Input() scroll$?: Observable<void>;
  canReceiveReadEvents: boolean | undefined;
  canReactToMessage: boolean | undefined;
  isEditedFlagOpened = false;
  shouldDisplayTranslationNotice = false;
  displayedMessageTextContent: 'original' | 'translation' = 'original';
  nestedModalState: 'opened' | 'closed' = 'closed';
  shouldDisplayThreadLink = false;
  isSentByCurrentUser = false;
  readByText = '';
  /**
   * The users who have read the message, only set for the last message sent by the current user (in other cases it's an empty array)
   */
  readBy: UserResponse[] = [];
  isMessageDeliveredAndRead = false;
  /**
   * The translation of the message text, if there is any
   */
  translation?: string;
  /**
   * The translation of the quoted message text, if there is any
   */
  quotedMessageTranslation?: string;
  parsedDate = '';
  pasedEditedDate = '';
  editedDateTime?: string;
  areOptionsVisible = false;
  hasAttachment = false;
  hasReactions = false;
  replyCountParam: { replyCount: number | undefined } = {
    replyCount: undefined,
  };
  areMessageOptionsOpen = false;
  canDisplayReadStatus = false;
  hasTouchSupport = isSafari()
    ? 'ontouchstart' in window || navigator.maxTouchPoints > 0
    : window.matchMedia('(any-hover: none)').matches;
  private quotedMessageAttachments: Attachment[] | undefined;
  private subscriptions: Subscription[] = [];
  private isViewInited = false;
  private userId?: string;
  @ViewChild('messageMenuTrigger')
  messageMenuTrigger!: NgxFloatUiLooseDirective;
  @ViewChild('messageMenuFloat')
  messageMenuFloat!: NgxFloatUiContentComponent;
  @ViewChild('messageTextElement') messageTextElement?: ElementRef<HTMLElement>;
  @ViewChild('messageBubble') messageBubble?: ElementRef<HTMLElement>;
  private showMessageMenuTimeout?: ReturnType<typeof setTimeout>;
  private shouldPreventMessageMenuClose = false;
  private _visibleMessageActionsCount = 0;
  private channelMemberCount?: number;
  private translationLanguage?: string;
  private stopWatchingReadBy?: () => void;
  private readByWatchedFor?: { message: LocalMessage; channel: Channel };

  constructor(
    private chatClientService: ChatClientService,
    private channelService: ChannelService,
    public customTemplatesService: CustomTemplatesService,
    private cdRef: ChangeDetectorRef,
    private dateParser: DateParserService,
    public messageActionsService: MessageActionsService,
    private ngZone: NgZone,
    private translateService: TranslateService
  ) {}

  get visibleMessageActionsCount() {
    return this._visibleMessageActionsCount;
  }

  set visibleMessageActionsCount(count: number) {
    this._visibleMessageActionsCount = count;
    if (this.areOptionsVisible && this._visibleMessageActionsCount === 0) {
      this.areOptionsVisible = false;
    }
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.chatClientService.user$.subscribe((u) => {
        if (u?.id !== this.userId) {
          this.userId = u?.id;
          this.setIsSentByCurrentUser();
          this.updateTranslations();
          this.updateReadByWatcher();
          if (this.isViewInited) {
            this.cdRef.detectChanges();
          }
        }
      })
    );
    this.subscriptions.push(
      this.messageActionsService.customActions$.subscribe(() => {
        if (this.message) {
          const numberOfEnabledActions =
            this.messageActionsService.getAuthorizedMessageActionsCount(
              this.message,
              this.enabledMessageActions
            );
          if (numberOfEnabledActions !== this.visibleMessageActionsCount) {
            this.visibleMessageActionsCount = numberOfEnabledActions;
            if (this.isViewInited) {
              this.cdRef.detectChanges();
            }
          }
        }
      })
    );
    this.subscriptions.push(
      this.channelService.activeChannelTranslationLanguage$.subscribe(
        (language) => {
          if (language !== this.translationLanguage) {
            this.translationLanguage = language;
            this.updateTranslations();
            if (this.isViewInited) {
              this.cdRef.detectChanges();
            }
          }
        }
      )
    );
    this.subscriptions.push(
      this.channelService.activeChannel$.subscribe((activeChannel) => {
        const newChannelMemberCount = activeChannel?.data?.member_count;
        if (newChannelMemberCount !== this.channelMemberCount) {
          const shouldUpdateText =
            this.channelMemberCount !== undefined &&
            newChannelMemberCount != undefined &&
            ((this.channelMemberCount <= 1000 && newChannelMemberCount > 100) ||
              (this.channelMemberCount > 100 && newChannelMemberCount <= 100));
          this.channelMemberCount = activeChannel?.data?.member_count;
          if (
            this.message &&
            this.message.cid === activeChannel?.cid &&
            shouldUpdateText
          ) {
            this.updateReadByText();
          }
        }
      })
    );
    this.subscriptions.push(
      this.messageActionsService.modalOpenedForMessage.subscribe(
        (messageId) => {
          if (messageId === this.message?.id) {
            this.nestedModalState = 'opened';
          }
        }
      )
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.message) {
      this.updateTranslations();
      const originalAttachments = this.message?.quoted_message?.attachments;
      this.quotedMessageAttachments =
        originalAttachments && originalAttachments.length
          ? [originalAttachments[0]]
          : [];
      this.setIsSentByCurrentUser();
      this.parsedDate =
        (this.message &&
          this.message.created_at &&
          this.dateParser.parseDateTime(nsToDate(this.message.created_at))) ||
        '';
      this.pasedEditedDate =
        (this.message &&
          this.message.message_text_updated_at &&
          this.dateParser.parseDateTime(
            nsToDate(this.message.message_text_updated_at)
          )) ||
        '';
      this.editedDateTime = this.message?.message_text_updated_at
        ? nsToRfc3339(this.message.message_text_updated_at)
        : undefined;
      this.hasAttachment =
        !!this.message?.attachments && !!this.message.attachments.length;
      this.hasReactions =
        !!this.message?.reaction_groups &&
        Object.keys(this.message.reaction_groups).length > 0;
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
    if (
      changes.message ||
      changes.channel ||
      changes.isLastSentMessage ||
      changes.mode
    ) {
      this.updateReadByWatcher();
    }
    if (changes.message || changes.enabledMessageActions || changes.mode) {
      this.shouldDisplayThreadLink =
        !!this.message?.reply_count && this.mode !== 'thread';
    }
    if (changes.message || changes.mode || changes.enabledMessageActions) {
      this.areOptionsVisible = this.message
        ? !(
            !this.message.type ||
            this.message.type === 'error' ||
            this.message.type === 'system' ||
            this.message.type === 'deleted' ||
            this.message.type === 'ephemeral' ||
            this.message.status === 'failed' ||
            this.message.status === 'sending' ||
            (this.mode === 'thread' && !this.message.parent_id) ||
            this.message.deleted_at ||
            this.enabledMessageActions.length === 0
          )
        : false;
    }
    if (changes.message || changes.enabledMessageActions) {
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
    if (this.hasTouchSupport && this.messageBubble?.nativeElement) {
      this.ngZone.runOutsideAngular(() => {
        this.registerMenuTriggerEventHandlers();
      });
    }
    this.subscriptions.push(
      this.messageActionsService.messageMenuOpenedFor$.subscribe((id) => {
        if (
          (id === undefined || this.message?.id !== id) &&
          this.areMessageOptionsOpen
        ) {
          this.messageMenuTrigger?.hide();
        }
      })
    );
    this.subscriptions.push(
      this.messageActionsService.modalOpenedForMessage
        .pipe(pairwise())
        .subscribe(([oldId, newId]) => {
          if (newId === this.message?.id) {
            this.nestedModalState = 'opened';
          } else if (oldId === this.message?.id && newId === undefined) {
            this.nestedModalState = 'closed';
          }
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.stopWatchingReadBy?.();
    if (this.showMessageMenuTimeout) {
      clearTimeout(this.showMessageMenuTimeout);
    }
  }

  mousePushedDown(event: MouseEvent) {
    if (
      !this.hasTouchSupport ||
      event.button !== 0 ||
      !this.areOptionsVisible
    ) {
      return;
    }
    this.startMessageMenuShowTimer({ fromTouch: false });
  }

  mouseReleased() {
    this.stopMessageMenuShowTimer();
  }

  touchStarted() {
    if (!this.areOptionsVisible) {
      return;
    }
    this.startMessageMenuShowTimer({ fromTouch: true });
  }

  touchEnded() {
    this.stopMessageMenuShowTimer();
  }

  messageBubbleClicked(event: Event) {
    if (!this.hasTouchSupport) {
      return;
    }
    if (this.shouldPreventMessageMenuClose) {
      event.stopPropagation();
      this.shouldPreventMessageMenuClose = false;
    } else if (this.areMessageOptionsOpen) {
      this.messageMenuTrigger?.hide();
    }
  }

  messageOptionsButtonClicked() {
    if (!this.message) {
      return;
    }
    if (this.messageActionsService.customActionClickHandler) {
      this.messageActionsService.customActionClickHandler({
        message: this.message,
        enabledActions: this.enabledMessageActions,
        customActions: this.messageActionsService.customActions$.getValue(),
        isMine: this.isSentByCurrentUser,
        messageTextHtmlElement: this.messageTextElement?.nativeElement,
      });
    } else {
      this.areMessageOptionsOpen = !this.areMessageOptionsOpen;
    }
  }

  messageActionsBoxClicked(floatingContent: NgxFloatUiContentComponent) {
    floatingContent.hide();
  }

  getAttachmentListContext(): AttachmentListContext {
    return {
      messageId: this.message?.id || '',
      attachments: this.message?.attachments || [],
      parentMessageId: this.message?.parent_id,
      imageModalStateChangeHandler: (state) => (this.nestedModalState = state),
    };
  }

  getMessageContext(): SystemMessageContext {
    return {
      message: this.message,
      channel: this.channel,
      enabledMessageActions: this.enabledMessageActions,
      isHighlighted: this.isHighlighted,
      isLastSentMessage: this.isLastSentMessage,
      mode: this.mode,
      customActions: this.messageActionsService.customActions$.getValue(),
      parsedDate: this.parsedDate,
      scroll$: this.scroll$,
    };
  }

  getMessageTextContext(): MessageTextContext {
    return {
      message: this.message,
      isQuoted: false,
      shouldTranslate: this.displayedMessageTextContent === 'translation',
      translation: this.translation,
    };
  }

  getQuotedMessageTextContext(): MessageTextContext {
    return {
      message: this.message?.quoted_message,
      isQuoted: true,
      shouldTranslate: this.displayedMessageTextContent === 'translation',
      translation: this.quotedMessageTranslation,
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
      messageId: this.message?.id,
      ownReactions: this.message?.own_reactions || [],
      messageReactionGroups: this.message?.reaction_groups || {},
    };
  }

  get isBounced() {
    return (
      this.message?.type === 'error' &&
      this.message?.moderation?.action === 'bounce'
    );
  }

  messageClicked() {
    if (
      this.message?.status === 'failed' &&
      this.message?.error?.status !== 403
    ) {
      this.resendMessage();
    } else if (this.isBounced) {
      this.openMessageBouncePrompt();
    } else {
      this.isEditedFlagOpened = !this.isEditedFlagOpened;
    }
  }

  resendMessage() {
    void this.channelService.resendMessage(this.message!);
  }

  setAsActiveParentMessage() {
    void this.channelService.setAsActiveParentMessage(this.message);
  }

  getMessageActionsBoxContext(): MessageActionsBoxContext {
    return {
      isMine: this.isSentByCurrentUser,
      enabledActions: this.enabledMessageActions,
      message: this.message,
      messageTextHtmlElement: this.messageTextElement?.nativeElement,
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
      readBy: this.readBy,
    };
  }

  getMessageMetadataContext(): CustomMetadataContext {
    return { message: this.message! };
  }

  getMessageBlockedContext(): MessageBlockedContext {
    return {
      message: this.message!,
      isMyMessage: this.isSentByCurrentUser,
    };
  }

  jumpToMessage(messageId: string, parentMessageId?: string) {
    void this.channelService.jumpToMessage(messageId, parentMessageId);
  }

  openMessageBouncePrompt() {
    this.channelService.bouncedMessage$.next(this.message);
  }

  displayTranslatedMessage() {
    this.shouldDisplayTranslationNotice = true;
    this.displayedMessageTextContent = 'translation';
  }

  displayOriginalMessage() {
    this.displayedMessageTextContent = 'original';
  }

  private updateReadByText() {
    const others = this.translateService.instant(
      'streamChat.and others'
    ) as string;
    const hasMoreThan100Members = (this.channelMemberCount ?? 0) > 100;
    this.readByText = listUsers(this.readBy, !hasMoreThan100Members, others);
  }

  private updateTranslations() {
    this.translation = getMessageTranslation(
      this.message,
      this.translationLanguage,
      this.userId
    );
    this.quotedMessageTranslation = getMessageTranslation(
      this.message?.quoted_message,
      this.translationLanguage,
      this.userId
    );
    this.displayedMessageTextContent = this.translation
      ? 'translation'
      : 'original';
    this.shouldDisplayTranslationNotice =
      this.displayedMessageTextContent === 'translation';
  }

  /**
   * Read receipts are only displayed for the last message sent by the current user, so only that message watches them
   */
  private updateReadByWatcher() {
    const message = this.message;
    const channel = this.channel;
    const shouldWatch =
      !!message &&
      !!channel &&
      this.isSentByCurrentUser &&
      !!this.isLastSentMessage &&
      this.mode === 'main' &&
      message.status === 'received';
    if (
      shouldWatch &&
      this.readByWatchedFor?.channel === channel &&
      this.readByWatchedFor.message.id === message.id &&
      this.readByWatchedFor.message.created_at === message.created_at
    ) {
      return;
    }
    this.stopWatchingReadBy?.();
    this.stopWatchingReadBy = undefined;
    this.readByWatchedFor = undefined;
    if (!shouldWatch) {
      this.setReadBy([]);
      return;
    }
    this.readByWatchedFor = { message, channel };
    let isInitialCall = true;
    this.stopWatchingReadBy = watchReadBy(message, channel, (readBy) => {
      if (isInitialCall) {
        this.setReadBy(readBy);
      } else {
        // Read receipts are updated by stream-chat (WebSocket events), outside of Angular's zone
        this.ngZone.run(() => {
          this.setReadBy(readBy);
          this.cdRef.markForCheck();
        });
      }
    });
    isInitialCall = false;
  }

  private setReadBy(readBy: UserResponse[]) {
    if (this.isSameUserList(readBy, this.readBy)) {
      return;
    }
    this.readBy = readBy;
    this.isMessageDeliveredAndRead =
      this.message?.status === 'received' && this.readBy.length > 0;
    this.updateReadByText();
  }

  private isSameUserList(users1: UserResponse[], users2: UserResponse[]) {
    return (
      users1.length === users2.length &&
      users1.every(
        (u, i) =>
          u.id === users2[i]?.id &&
          u.name === users2[i]?.name &&
          u.image === users2[i]?.image
      )
    );
  }

  private setIsSentByCurrentUser() {
    this.isSentByCurrentUser = this.message?.user?.id === this.userId;
  }

  private startMessageMenuShowTimer(options: { fromTouch: boolean }) {
    this.stopMessageMenuShowTimer();
    if (this.scroll$) {
      this.subscriptions.push(
        this.scroll$.pipe(take(1)).subscribe(() => {
          this.stopMessageMenuShowTimer();
        })
      );
    }
    this.showMessageMenuTimeout = setTimeout(() => {
      if (!this.message) {
        return;
      }
      this.ngZone.run(() => {
        if (this.messageActionsService.customActionClickHandler) {
          this.messageActionsService.customActionClickHandler({
            message: this.message,
            enabledActions: this.enabledMessageActions,
            customActions: this.messageActionsService.customActions$.getValue(),
            isMine: this.isSentByCurrentUser,
            messageTextHtmlElement: this.messageTextElement?.nativeElement,
          });
          return;
        } else {
          this.shouldPreventMessageMenuClose = !options.fromTouch;
          // Fix for iOS Safari: iOS Safari won't close the input if we open message menu
          // The virtual keyboard can hide parts of the message menu, so we close the input here
          if (
            document.activeElement &&
            typeof (document.activeElement as HTMLInputElement).blur !==
              'undefined'
          )
            (document.activeElement as HTMLInputElement).blur();
          this.messageMenuTrigger.show();
          this.messageActionsService.messageMenuOpenedFor$.next(
            this.message?.id
          );
        }
        if (this.isViewInited) {
          this.cdRef.detectChanges();
        }
        this.showMessageMenuTimeout = undefined;
      });
    }, 400);
  }

  private registerMenuTriggerEventHandlers() {
    this.messageBubble!.nativeElement.addEventListener('touchstart', () =>
      this.touchStarted()
    );
    this.messageBubble!.nativeElement.addEventListener('touchend', () =>
      this.touchEnded()
    );
    this.messageBubble!.nativeElement.addEventListener('mousedown', (e) =>
      this.mousePushedDown(e)
    );
    this.messageBubble!.nativeElement.addEventListener('mouseup', () =>
      this.mouseReleased()
    );
    this.messageBubble!.nativeElement.addEventListener('click', (e) =>
      this.messageBubbleClicked(e)
    );
  }

  private stopMessageMenuShowTimer() {
    if (this.showMessageMenuTimeout) {
      clearTimeout(this.showMessageMenuTimeout);
      this.showMessageMenuTimeout = undefined;
    }
  }
}
