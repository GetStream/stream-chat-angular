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
import { Attachment, UserResponse } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { ChatClientService } from '../chat-client.service';
import {
  AttachmentListContext,
  MessageActionsBoxContext,
  MessageReactionsContext,
  StreamMessage,
  DeliveredStatusContext,
  SendingStatusContext,
  ReadStatusContext,
  SystemMessageContext,
  CustomMetadataContext,
  MessageTextContext,
} from '../types';
import { Observable, Subscription, take } from 'rxjs';
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

/**
 * The `Message` component displays a message with additional information such as sender and date, and enables [interaction with the message (i.e. edit or react)](/chat/docs/sdk/angular/v6-rc/concepts/message-interactions/).
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
   * The list of [channel capabilities](/chat/docs/javascript/channel_capabilities/) that are enabled for the current user, the list of [supported interactions](/chat/docs/sdk/angular/v6-rc/concepts/message-interactions/) can be found in our message interaction guide. Unathorized actions won't be displayed on the UI. The [`MessageList`](/chat/docs/sdk/angular/v6-rc/components/MessageListComponent/) component automatically sets this based on [channel capabilities](/chat/docs/javascript/channel_capabilities/).
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
  imageAttachmentModalState: 'opened' | 'closed' = 'closed';
  shouldDisplayThreadLink = false;
  isSentByCurrentUser = false;
  readByText = '';
  lastReadUser: UserResponse | undefined = undefined;
  isOnlyReadByMe = false;
  isReadByMultipleUsers = false;
  isMessageDeliveredAndRead = false;
  parsedDate = '';
  pasedEditedDate = '';
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
          this.setLastReadUser();
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
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.message) {
      this.displayedMessageTextContent = this.message?.translation
        ? 'translation'
        : 'original';
      this.shouldDisplayTranslationNotice =
        this.displayedMessageTextContent === 'translation';
      const originalAttachments = this.message?.quoted_message?.attachments;
      this.quotedMessageAttachments =
        originalAttachments && originalAttachments.length
          ? [originalAttachments[0]]
          : [];
      this.setIsSentByCurrentUser();
      this.setLastReadUser();
      this.updateReadByText();
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
      this.pasedEditedDate =
        (this.message &&
          this.message.message_text_updated_at &&
          this.dateParser.parseDateTime(
            new Date(this.message.message_text_updated_at)
          )) ||
        '';
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
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
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
    };
  }

  getQuotedMessageTextContext(): MessageTextContext {
    return {
      message: this.message?.quoted_message,
      isQuoted: true,
      shouldTranslate: this.displayedMessageTextContent === 'translation',
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

  messageClicked() {
    if (
      this.message?.status === 'failed' &&
      this.message?.errorStatusCode !== 403
    ) {
      this.resendMessage();
    } else if (
      this.message?.type === 'error' &&
      this.message?.moderation_details
    ) {
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
    };
  }

  getMessageMetadataContext(): CustomMetadataContext {
    return {
      message: this.message!,
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
    this.readByText = this.message?.readBy
      ? listUsers(this.message.readBy, !hasMoreThan100Members, others)
      : '';
  }

  private setIsSentByCurrentUser() {
    this.isSentByCurrentUser = this.message?.user?.id === this.userId;
  }

  private setLastReadUser() {
    this.lastReadUser = this.message?.readBy?.filter(
      (u) => u.id !== this.userId
    )[0];
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
