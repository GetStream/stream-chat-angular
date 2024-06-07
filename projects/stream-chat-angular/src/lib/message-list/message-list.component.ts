import {
  AfterViewChecked,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostBinding,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { ChannelService } from '../channel.service';
import { Observable, Subject, Subscription, combineLatest } from 'rxjs';
import { filter, map, shareReplay, tap, throttleTime } from 'rxjs/operators';
import {
  MessageContext,
  DefaultStreamChatGenerics,
  StreamMessage,
  TypingIndicatorContext,
  CustomMessageActionItem,
  DateSeparatorContext,
  UnreadMessagesNotificationContext,
  UnreadMessagesIndicatorContext,
} from '../types';
import { ChatClientService } from '../chat-client.service';
import { getGroupStyles, GroupStyle } from './group-styles';
import { UserResponse } from 'stream-chat';
import { CustomTemplatesService } from '../custom-templates.service';
import { listUsers } from '../list-users';
import { DateParserService } from '../date-parser.service';
import { MessageActionsService } from '../message-actions.service';
import { isOnSeparateDate } from '../is-on-separate-date';

/**
 * The `MessageList` component renders a scrollable list of messages.
 */
@Component({
  selector: 'stream-message-list',
  templateUrl: './message-list.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageListComponent
  implements AfterViewChecked, OnChanges, OnInit, OnDestroy, AfterViewInit
{
  /**
   * Determines if the message list should display channel messages or [thread messages](https://getstream.io/chat/docs/javascript/threads/?language=javascript).
   */
  @Input() mode: 'main' | 'thread' = 'main';
  /**
   * The direction of the messages in the list, `bottom-to-top` means newest message is at the bottom of the message list and users scroll upwards to load older messages
   */
  @Input() direction: 'bottom-to-top' | 'top-to-bottom' = 'bottom-to-top';
  /**
   * Determines what triggers the appearance of the message options: by default you can hover (click on mobile) anywhere in the row of the message (`message-row` option), or you can set `message-bubble`, in that case only a hover (click on mobile) in the message bubble will trigger the options to appear.
   */
  @Input() messageOptionsTrigger: 'message-row' | 'message-bubble' =
    'message-row';
  /**
   * You can hide the "jump to latest" button while scrolling. A potential use-case for this input would be to [workaround a known issue on iOS Safar webview](https://github.com/GetStream/stream-chat-angular/issues/418)
   *
   */
  @Input() hideJumpToLatestButtonDuringScroll = false;
  /**
   * A list of custom message actions to be displayed in the message action box
   *
   * @deprecated please use the [`MessageActionsService`](https://getstream.io/chat/docs/sdk/angular/services/MessageActionsService) to set this property.
   */
  @Input() customMessageActions: CustomMessageActionItem<any>[] = [];
  /**
   * If `true` date separators will be displayed
   */
  @Input() displayDateSeparator = true;
  /**
   * If `true` unread indicator will be displayed
   */
  @Input() displayUnreadSeparator = true;
  /**
   * If date separators are displayed, you can set the horizontal position of the date text.
   */
  @Input() dateSeparatorTextPos: 'center' | 'right' | 'left' = 'center';
  /**
   * `last-message` option will open the message list at the last message, `last-read-message` will open the list at the last unread message. This option only works if mode is `main`.
   */
  @Input() openMessageListAt: 'last-message' | 'last-read-message' =
    'last-message';
  /**
   * If the user has unread messages when they open the channel the UI shows the unread indicator / notification which features the unread count by default. This count will be increased every time a user receives a new message. If you don't want to show the unread count, you can turn that off.
   *
   * This is only applicable for `main` mode, as threads doesn't have read infromation.
   */
  @Input() hideUnreadCountForNotificationAndIndicator = false;
  /**
   * You can turn on and off the loading indicator that signals to users that more messages are being loaded to the message list
   */
  @Input() displayLoadingIndicator = true;
  /**
   * @internal
   */
  @Input() limitNumberOfMessagesInList = true;
  typingIndicatorTemplate: TemplateRef<TypingIndicatorContext> | undefined;
  messageTemplate: TemplateRef<MessageContext> | undefined;
  customDateSeparatorTemplate: TemplateRef<DateSeparatorContext> | undefined;
  customnewMessagesIndicatorTemplate:
    | TemplateRef<UnreadMessagesIndicatorContext>
    | undefined;
  customnewMessagesNotificationTemplate:
    | TemplateRef<UnreadMessagesNotificationContext>
    | undefined;
  emptyMainMessageListTemplate: TemplateRef<void> | null = null;
  emptyThreadMessageListTemplate: TemplateRef<void> | null = null;
  messages$!: Observable<StreamMessage[]>;
  enabledMessageActions: string[] = [];
  isEmpty = true;
  newMessageCountWhileBeingScrolled = 0;
  isUserScrolled: boolean | undefined;
  groupStyles: GroupStyle[] = [];
  isNextMessageOnSeparateDate: boolean[] = [];
  lastSentMessageId: string | undefined;
  parentMessage: StreamMessage | undefined;
  highlightedMessageId: string | undefined;
  isLoading = false;
  scrollEndTimeout: any;
  lastReadMessageId?: string;
  isUnreadNotificationVisible = true;
  firstUnreadMessageId?: string;
  unreadCount?: number;
  isJumpingToLatestUnreadMessage = false;
  isJumpToLatestButtonVisible = true;
  @ViewChild('scrollContainer')
  private scrollContainer!: ElementRef<HTMLElement>;
  @ViewChild('parentMessageElement')
  private parentMessageElement!: ElementRef<HTMLElement>;
  private latestMessage: { id: string; created_at: Date } | undefined;
  private hasNewMessages: boolean | undefined;
  private containerHeight: number | undefined;
  private oldestMessage: { id: string; created_at: Date } | undefined;
  private olderMassagesLoaded: boolean | undefined;
  private isNewMessageSentByUser: boolean | undefined;
  private subscriptions: Subscription[] = [];
  private newMessageSubscription: { unsubscribe: () => void } | undefined;
  private prevScrollTop: number | undefined;
  private usersTypingInChannel$!: Observable<
    UserResponse<DefaultStreamChatGenerics>[]
  >;
  private usersTypingInThread$!: Observable<
    UserResponse<DefaultStreamChatGenerics>[]
  >;
  private isLatestMessageInList = true;
  private channelId?: string;
  private parsedDates = new Map<Date, string>();
  private isViewInited = false;
  private checkIfUnreadNotificationIsVisibleTimeout?: any;
  private jumpToLatestButtonVisibilityTimeout?: any;
  private messageRemoveTimeout?: any;
  private removeOldMessagesSubscription?: Subscription;
  private isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  private forceRepaintSubject = new Subject<void>();

  @HostBinding('class')
  private get class() {
    return `str-chat-angular__main-panel-inner str-chat-angular__message-list-host str-chat__main-panel-inner ${
      this.isEmpty ? 'str-chat-angular__message-list-host--empty' : ''
    }`;
  }

  constructor(
    private channelService: ChannelService,
    private chatClientService: ChatClientService,
    private customTemplatesService: CustomTemplatesService,
    private dateParser: DateParserService,
    private ngZone: NgZone,
    private cdRef: ChangeDetectorRef,
    private messageActionsService: MessageActionsService
  ) {
    this.usersTypingInChannel$ = this.channelService.usersTypingInChannel$;
    this.usersTypingInThread$ = this.channelService.usersTypingInThread$;
  }

  messageNotificationJumpClicked = () => {
    this.jumpToFirstUnreadMessage();
    this.isUnreadNotificationVisible = false;
  };

  messageNotificationDismissClicked = () => {
    this.isUnreadNotificationVisible = false;
  };

  ngOnInit(): void {
    this.subscriptions.push(
      this.forceRepaintSubject.pipe(throttleTime(1000)).subscribe(() => {
        this.forceRepaint();
      })
    );
    this.subscriptions.push(
      this.channelService.activeChannel$.subscribe((channel) => {
        this.chatClientService.chatClient?.logger?.(
          'info',
          `${channel?.cid || 'undefined'} selected`,
          { tags: `message list ${this.mode}` }
        );
        let isNewChannel = false;
        if (this.channelId !== channel?.id) {
          isNewChannel = true;
          if (this.checkIfUnreadNotificationIsVisibleTimeout) {
            clearTimeout(this.checkIfUnreadNotificationIsVisibleTimeout);
          }
          this.isUnreadNotificationVisible = false;
          this.chatClientService?.chatClient?.logger?.(
            'info',
            `new channel is different from prev channel, reseting scroll state`,
            { tags: `message list ${this.mode}` }
          );
          this.parsedDates = new Map();
          if (this.messageRemoveTimeout) {
            clearTimeout(this.messageRemoveTimeout);
          }
          this.resetScrollState();
          this.channelId = channel?.id;
          if (this.isViewInited) {
            this.cdRef.detectChanges();
          }
        }
        if (this.mode === 'main') {
          const lastReadMessageId =
            this.channelService.activeChannelLastReadMessageId;
          const unreadCount = this.channelService.activeChannelUnreadCount;
          if (
            lastReadMessageId !== this.lastReadMessageId ||
            unreadCount !== this.unreadCount
          ) {
            this.lastReadMessageId = lastReadMessageId;
            this.unreadCount = unreadCount || 0;
            if (isNewChannel && this.lastReadMessageId) {
              if (this.openMessageListAt === 'last-read-message') {
                this.jumpToFirstUnreadMessage();
              } else {
                // Wait till messages and the unread banner is rendered
                // If unread banner isn't visible on the screen, we display the unread notificaion
                setTimeout(() => {
                  const bannerElement = document.getElementById(
                    'stream-chat-new-message-indicator'
                  );
                  if (
                    !bannerElement ||
                    bannerElement?.offsetTop <
                      this.scrollContainer?.nativeElement?.scrollHeight -
                        this.scrollContainer?.nativeElement?.clientHeight
                  ) {
                    this.isUnreadNotificationVisible = true;
                    if (this.isViewInited) {
                      this.cdRef.detectChanges();
                    }
                  }
                }, 100);
              }
            }
            if (this.isViewInited) {
              this.cdRef.detectChanges();
            }
          }
        } else if (this.lastReadMessageId) {
          this.lastReadMessageId = undefined;
          this.unreadCount = 0;
          if (this.isViewInited) {
            this.cdRef.detectChanges();
          }
        }
        const capabilites = channel?.data?.own_capabilities as string[];
        const capabilitesString = [...(capabilites || [])].sort().join('');
        const enabledActionsString = [...(this.enabledMessageActions || [])]
          .sort()
          .join('');
        if (capabilitesString !== enabledActionsString) {
          this.enabledMessageActions = capabilites || [];
          if (this.isViewInited) {
            this.cdRef.detectChanges();
          }
        }
        this.newMessageSubscription?.unsubscribe();
        if (channel) {
          this.newMessageSubscription = channel.on('message.new', (event) => {
            // If we display main channel messages and we're switched to an older message set -> use message.new event to update unread count and detect new messages sent by current user
            if (
              !event.message ||
              channel.state.messages === channel.state.latestMessages ||
              this.mode === 'thread'
            ) {
              return;
            }
            this.newMessageReceived({
              id: event.message.id,
              user: event.message.user,
              created_at: new Date(event.message.created_at || ''),
            });
          });
        }
      })
    );
    this.subscriptions.push(
      this.messageActionsService.customActions$.subscribe((actions) => {
        if (actions !== this.customMessageActions) {
          this.customMessageActions = actions;
          if (this.isViewInited) {
            this.cdRef.detectChanges();
          }
        }
      })
    );
    this.subscriptions.push(
      this.channelService.activeParentMessage$.subscribe((message) => {
        if (
          message &&
          this.parentMessage &&
          message.id !== this.parentMessage.id &&
          this.mode === 'thread'
        ) {
          this.resetScrollState();
        }
        if (this.parentMessage === message) {
          return;
        }
        this.parentMessage = message;
        if (this.isViewInited) {
          this.cdRef.detectChanges();
        }
      })
    );
    this.subscriptions.push(
      this.customTemplatesService.messageTemplate$.subscribe((template) => {
        if (this.messageTemplate === template) {
          return;
        }
        this.messageTemplate = template;
        if (this.isViewInited) {
          this.cdRef.detectChanges();
        }
      })
    );
    this.subscriptions.push(
      this.customTemplatesService.dateSeparatorTemplate$.subscribe(
        (template) => {
          if (this.customDateSeparatorTemplate === template) {
            return;
          }
          this.customDateSeparatorTemplate = template;
          if (this.isViewInited) {
            this.cdRef.detectChanges();
          }
        }
      )
    );
    this.subscriptions.push(
      this.customTemplatesService.newMessagesIndicatorTemplate$.subscribe(
        (template) => {
          if (this.customnewMessagesIndicatorTemplate === template) {
            return;
          }
          this.customnewMessagesIndicatorTemplate = template;
          if (this.isViewInited) {
            this.cdRef.detectChanges();
          }
        }
      )
    );
    this.subscriptions.push(
      this.customTemplatesService.newMessagesNotificationTemplate$.subscribe(
        (template) => {
          if (this.customnewMessagesNotificationTemplate === template) {
            return;
          }
          this.customnewMessagesNotificationTemplate = template;
          if (this.isViewInited) {
            this.cdRef.detectChanges();
          }
        }
      )
    );
    this.subscriptions.push(
      this.customTemplatesService.typingIndicatorTemplate$.subscribe(
        (template) => {
          if (this.typingIndicatorTemplate === template) {
            return;
          }
          this.typingIndicatorTemplate = template;
          if (this.isViewInited) {
            this.cdRef.detectChanges();
          }
        }
      )
    );
    this.subscriptions.push(
      this.channelService.jumpToMessage$
        .pipe(filter((config) => !!config.id))
        .subscribe((config) => {
          let messageId: string | undefined = undefined;
          if (this.messageRemoveTimeout) {
            clearTimeout(this.messageRemoveTimeout);
          }
          if (this.mode === 'main') {
            messageId = config.parentId || config.id;
          } else if (config.parentId) {
            messageId = config.id;
          }
          this.chatClientService.chatClient?.logger?.(
            'info',
            `Jumping to ${messageId || ''}`,
            { tags: `message list ${this.mode}` }
          );
          if (messageId) {
            if (messageId === 'latest') {
              this.scrollToLatestMessage();
              if (this.isViewInited) {
                this.cdRef.detectChanges();
              }
            } else {
              if (this.isJumpingToLatestUnreadMessage) {
                this.scrollMessageIntoView(
                  this.firstUnreadMessageId || messageId
                );
                this.highlightedMessageId =
                  this.firstUnreadMessageId || messageId;
              } else {
                this.scrollMessageIntoView(messageId);
                this.highlightedMessageId = messageId;
              }
            }
          }
          this.channelService.clearMessageJump();
        })
    );
    this.subscriptions.push(
      this.customTemplatesService.emptyMainMessageListPlaceholder$.subscribe(
        (template) => {
          const isChanged = this.emptyMainMessageListTemplate !== template;
          this.emptyMainMessageListTemplate = template || null;
          if (isChanged && this.isViewInited) {
            this.cdRef.detectChanges();
          }
        }
      )
    );
    this.subscriptions.push(
      this.customTemplatesService.emptyThreadMessageListPlaceholder$.subscribe(
        (template) => {
          const isChanged = this.emptyThreadMessageListTemplate !== template;
          this.emptyThreadMessageListTemplate = template || null;
          if (isChanged && this.isViewInited) {
            this.cdRef.detectChanges();
          }
        }
      )
    );
    this.setMessages$();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.mode || changes.direction) {
      this.setMessages$();
    }
    if (changes.direction) {
      if (this.scrollContainer?.nativeElement) {
        this.jumpToLatestMessage();
      }
    }
    if (changes.customMessageActions) {
      this.messageActionsService.customActions$.next(this.customMessageActions);
    }
  }

  ngAfterViewInit(): void {
    this.isViewInited = true;
    this.ngZone.runOutsideAngular(() => {
      this.scrollContainer.nativeElement.addEventListener('scroll', () =>
        this.scrolled()
      );
    });
  }

  ngAfterViewChecked() {
    if (this.highlightedMessageId) {
      // Turn off programatic scroll adjustments while jump to message is in progress
      this.hasNewMessages = false;
      this.olderMassagesLoaded = false;
    }
    if (this.direction === 'top-to-bottom') {
      if (
        this.hasNewMessages &&
        (this.isNewMessageSentByUser || !this.isUserScrolled)
      ) {
        this.isLatestMessageInList
          ? this.scrollToTop()
          : this.jumpToLatestMessage();
        this.hasNewMessages = false;
        this.containerHeight = this.scrollContainer.nativeElement.scrollHeight;
      }
    } else {
      if (this.hasNewMessages) {
        if (!this.isUserScrolled || this.isNewMessageSentByUser) {
          this.chatClientService.chatClient?.logger?.(
            'info',
            `User has new messages, and not scrolled or sent new messages, therefore we ${
              this.isLatestMessageInList ? 'scroll' : 'jump'
            } to latest message`,
            { tags: `message list ${this.mode}` }
          );
          this.isLatestMessageInList
            ? this.scrollToBottom()
            : this.jumpToLatestMessage();
        }
        this.hasNewMessages = false;
        this.containerHeight = this.scrollContainer.nativeElement.scrollHeight;
      } else if (this.olderMassagesLoaded) {
        this.chatClientService.chatClient?.logger?.(
          'info',
          `Older messages are loaded, we preserve the scroll position`,
          { tags: `message list ${this.mode}` }
        );
        this.preserveScrollbarPosition();
        this.containerHeight = this.scrollContainer.nativeElement.scrollHeight;
        this.olderMassagesLoaded = false;
      } else if (
        this.getScrollPosition() !== 'bottom' &&
        !this.isUserScrolled &&
        !this.highlightedMessageId
      ) {
        this.chatClientService.chatClient?.logger?.(
          'info',
          `Container grew and user didn't scroll therefore we ${
            this.isLatestMessageInList ? 'scroll' : 'jump'
          } to latest message`,
          { tags: `message list ${this.mode}` }
        );
        this.isLatestMessageInList
          ? this.scrollToBottom()
          : this.jumpToLatestMessage();
        this.containerHeight = this.scrollContainer.nativeElement.scrollHeight;
      }
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.newMessageSubscription?.unsubscribe();
    if (this.scrollEndTimeout) {
      clearTimeout(this.scrollEndTimeout);
    }
    if (this.checkIfUnreadNotificationIsVisibleTimeout) {
      clearTimeout(this.checkIfUnreadNotificationIsVisibleTimeout);
    }
    if (this.jumpToLatestButtonVisibilityTimeout) {
      clearTimeout(this.jumpToLatestButtonVisibilityTimeout);
    }
    if (this.messageRemoveTimeout) {
      clearTimeout(this.messageRemoveTimeout);
    }
    this.removeOldMessagesSubscription?.unsubscribe();
  }

  trackByMessageId(index: number, item: StreamMessage) {
    return item.id;
  }

  trackByUserId(index: number, user: UserResponse) {
    return user.id;
  }

  jumpToLatestMessage() {
    void this.channelService.jumpToMessage(
      'latest',
      this.mode === 'thread' ? this.parentMessage?.id : undefined
    );
  }

  scrollToBottom(): void {
    this.scrollContainer.nativeElement.scrollTop =
      this.scrollContainer.nativeElement.scrollHeight + 0.1;
    if (this.isSafari) {
      this.forceRepaintSubject.next();
    }
  }

  scrollToTop() {
    this.scrollContainer.nativeElement.scrollTop = 0;
  }

  scrolled() {
    if (
      this.scrollContainer.nativeElement.scrollHeight ===
      this.scrollContainer.nativeElement.clientHeight
    ) {
      return;
    }
    const scrollPosition = this.getScrollPosition();
    this.chatClientService.chatClient?.logger?.(
      'info',
      `Scrolled - scroll position: ${scrollPosition}, container height: ${this.scrollContainer.nativeElement.scrollHeight}`,
      { tags: `message list ${this.mode}` }
    );

    const isUserScrolled =
      (this.direction === 'bottom-to-top'
        ? scrollPosition !== 'bottom'
        : scrollPosition !== 'top') || !this.isLatestMessageInList;
    if (this.isUserScrolled !== isUserScrolled) {
      this.ngZone.run(() => {
        this.isUserScrolled = isUserScrolled;
        if (!this.isUserScrolled) {
          this.newMessageCountWhileBeingScrolled = 0;
        }
        this.cdRef.detectChanges();
      });
    }

    if (this.hideJumpToLatestButtonDuringScroll) {
      if (this.isJumpToLatestButtonVisible) {
        this.isJumpToLatestButtonVisible = false;
        this.cdRef.detectChanges();
      }
      if (this.jumpToLatestButtonVisibilityTimeout) {
        clearTimeout(this.jumpToLatestButtonVisibilityTimeout);
      }
      this.jumpToLatestButtonVisibilityTimeout = setTimeout(() => {
        if (this.isUserScrolled) {
          this.isJumpToLatestButtonVisible = true;
          this.jumpToLatestButtonVisibilityTimeout = undefined;
          this.cdRef.detectChanges();
        }
      }, 100);
    }

    if (this.shouldLoadMoreMessages(scrollPosition)) {
      this.ngZone.run(() => {
        this.containerHeight = this.scrollContainer.nativeElement.scrollHeight;
        let direction: 'newer' | 'older';
        if (this.direction === 'top-to-bottom') {
          direction = scrollPosition === 'top' ? 'newer' : 'older';
        } else {
          direction = scrollPosition === 'top' ? 'older' : 'newer';
        }
        const result =
          this.mode === 'main'
            ? this.channelService.loadMoreMessages(direction)
            : this.channelService.loadMoreThreadReplies(direction);
        if (result) {
          this.chatClientService.chatClient?.logger?.(
            'info',
            `Displaying loading indicator`,
            { tags: `message list ${this.mode}` }
          );
          this.isLoading = true;
          result.catch?.(() => {
            this.isLoading = false;
          });
        }
        this.cdRef.detectChanges();
      });
    }
    this.prevScrollTop = this.scrollContainer.nativeElement.scrollTop;
  }

  jumpToFirstUnreadMessage() {
    if (!this.lastReadMessageId) {
      return;
    }
    this.isJumpingToLatestUnreadMessage = true;
    void this.channelService.jumpToMessage(this.lastReadMessageId);
  }

  getTypingIndicatorContext(): TypingIndicatorContext {
    return {
      usersTyping$: this.usersTyping$,
    };
  }

  getTypingIndicatorText(users: UserResponse[]) {
    const text = listUsers(users);

    return text;
  }

  isSentByCurrentUser(message?: StreamMessage) {
    if (!message) {
      return false;
    }
    return message.user?.id === this.chatClientService.chatClient.user?.id;
  }

  parseDate(date: Date) {
    if (this.parsedDates.has(date)) {
      return this.parsedDates.get(date);
    }
    const parsedDate = this.dateParser.parseDate(date);
    this.parsedDates.set(date, parsedDate);
    return parsedDate;
  }

  get replyCountParam() {
    return { replyCount: this.parentMessage?.reply_count };
  }

  get emptyListTemplate() {
    return this.mode === 'main'
      ? this.emptyMainMessageListTemplate
      : this.emptyThreadMessageListTemplate;
  }

  private preserveScrollbarPosition() {
    this.scrollContainer.nativeElement.scrollTop =
      (this.prevScrollTop || 0) +
      (this.scrollContainer.nativeElement.scrollHeight - this.containerHeight!);
  }

  private forceRepaint() {
    // Solves the issue of empty screen on Safari when scrolling
    this.scrollContainer.nativeElement.style.display = 'none';
    this.scrollContainer.nativeElement.offsetHeight; // no need to store this anywhere, the reference is enough
    this.scrollContainer.nativeElement.style.display = '';
  }

  private getScrollPosition(): 'top' | 'bottom' | 'middle' {
    let position: 'top' | 'bottom' | 'middle' = 'middle';
    if (
      Math.floor(this.scrollContainer.nativeElement.scrollTop) <=
        (this.parentMessageElement?.nativeElement.clientHeight || 0) &&
      (this.prevScrollTop === undefined ||
        this.prevScrollTop >
          (this.parentMessageElement?.nativeElement.clientHeight || 0))
    ) {
      position = 'top';
    } else if (
      Math.ceil(this.scrollContainer.nativeElement.scrollTop) +
        this.scrollContainer.nativeElement.clientHeight +
        1 >=
      this.scrollContainer.nativeElement.scrollHeight
    ) {
      position = 'bottom';
    }

    return position;
  }

  private shouldLoadMoreMessages(scrollPosition: 'top' | 'bottom' | 'middle') {
    return (
      scrollPosition !== 'middle' &&
      !this.highlightedMessageId &&
      !this.isLoading
    );
  }

  private setMessages$() {
    this.messages$ = (
      this.mode === 'main'
        ? this.channelService.activeChannelMessages$
        : this.channelService.activeThreadMessages$
    ).pipe(
      tap((messages) => {
        this.isLoading = false;
        if (messages.length === 0) {
          this.chatClientService.chatClient?.logger?.(
            'info',
            `Empty messages array, reseting scroll state`,
            {
              tags: `message list ${this.mode}`,
            }
          );
          this.resetScrollState();
          return;
        }
        if (this.isEmpty) {
          // cdRef.detectChanges() isn't enough here, test will fail
          setTimeout(() => (this.isEmpty = false), 0);
        }
        this.chatClientService.chatClient?.logger?.(
          'info',
          `Received one or more messages`,
          {
            tags: `message list ${this.mode}`,
          }
        );
        const currentLatestMessageInState = messages[messages.length - 1];
        this.newMessageReceived(currentLatestMessageInState);
        const currentOldestMessage = messages[0];
        if (
          !this.oldestMessage ||
          !messages.find((m) => m.id === this.oldestMessage!.id)
        ) {
          this.oldestMessage = currentOldestMessage;
        } else if (
          this.oldestMessage.created_at.getTime() >
          currentOldestMessage.created_at.getTime()
        ) {
          this.oldestMessage = currentOldestMessage;
          this.olderMassagesLoaded = true;
        }
      }),
      tap((messages) => {
        if (
          this.isJumpingToLatestUnreadMessage &&
          !this.firstUnreadMessageId &&
          this.lastReadMessageId
        ) {
          const lastReadIndex = messages.findIndex(
            (m) => m.id === this.lastReadMessageId
          );
          this.firstUnreadMessageId =
            messages[lastReadIndex + 1]?.id || this.lastReadMessageId;
        }
      }),
      tap(
        (messages) =>
          (this.lastSentMessageId = [...messages]
            .reverse()
            .find(
              (m) =>
                m.user?.id === this.chatClientService.chatClient?.user?.id &&
                m.status !== 'sending'
            )?.id)
      ),
      tap((messages) => {
        this.isLatestMessageInList =
          !this.latestMessage ||
          messages.length === 0 ||
          messages[messages.length - 1].id === this.latestMessage.id ||
          this.mode === 'thread';
        if (!this.isLatestMessageInList) {
          this.isUserScrolled = true;
        }
      }),
      map((messages) =>
        this.direction === 'bottom-to-top' ? messages : [...messages].reverse()
      ),
      tap((messages) => {
        this.groupStyles = messages.map((m, i) =>
          getGroupStyles(m, messages[i - 1], messages[i + 1], {
            lastReadMessageId: this.lastReadMessageId,
          })
        );
        this.isNextMessageOnSeparateDate = messages.map((m, i) =>
          this.checkIfOnSeparateDates(m, messages[i + 1])
        );
      }),
      shareReplay(1)
    );
    this.removeOldMessagesSubscription?.unsubscribe();
    this.removeOldMessagesSubscription = combineLatest([
      this.channelService.jumpToMessage$,
      this.messages$,
    ]).subscribe(([jumpToMessage, messages]) => {
      if (
        this.limitNumberOfMessagesInList &&
        this.mode === 'main' &&
        messages.length >
          ChannelService.MAX_MESSAGE_COUNT_IN_MESSAGE_LIST * 0.5 &&
        !this.isUserScrolled &&
        !jumpToMessage?.id &&
        this.isLatestMessageInList
      ) {
        if (this.messageRemoveTimeout) {
          clearTimeout(this.messageRemoveTimeout);
        }
        if (
          messages.length >= ChannelService.MAX_MESSAGE_COUNT_IN_MESSAGE_LIST
        ) {
          this.channelService.removeOldMessageFromMessageList();
        } else {
          this.messageRemoveTimeout = setTimeout(() => {
            if (
              this.limitNumberOfMessagesInList &&
              this.mode === 'main' &&
              messages.length >
                ChannelService.MAX_MESSAGE_COUNT_IN_MESSAGE_LIST * 0.5 &&
              !this.isUserScrolled &&
              !this.highlightedMessageId &&
              this.isLatestMessageInList
            ) {
              this.channelService.removeOldMessageFromMessageList();
            }
          }, 1500);
        }
      }
    });
  }

  private resetScrollState() {
    this.isEmpty = true;
    this.latestMessage = undefined;
    this.hasNewMessages = true;
    this.isUserScrolled = false;
    this.containerHeight = undefined;
    this.olderMassagesLoaded = false;
    this.oldestMessage = undefined;
    this.newMessageCountWhileBeingScrolled = 0;
    this.prevScrollTop = undefined;
    this.isNewMessageSentByUser = undefined;
    this.isLatestMessageInList = true;
  }

  private get usersTyping$() {
    return this.mode === 'thread'
      ? this.usersTypingInThread$
      : this.usersTypingInChannel$;
  }

  private scrollMessageIntoView(messageId: string, withRetry = true) {
    const element = document.getElementById(messageId);
    if (!element && withRetry) {
      // If the message was newly inserted into activeChannelMessages$, the message will be rendered after the current change detection cycle -> wait for this cycle to complete
      setTimeout(() => this.scrollMessageIntoView(messageId, false));
    } else if (element) {
      element.scrollIntoView({
        block: 'center',
      });
      setTimeout(() => {
        this.highlightedMessageId = undefined;
        this.firstUnreadMessageId = undefined;
        this.isJumpingToLatestUnreadMessage = false;
        this.cdRef.detectChanges();
      }, 1000);
    }
  }

  private scrollToLatestMessage(withRetry = true) {
    if (document.getElementById(this.latestMessage!.id)) {
      this.direction === 'bottom-to-top'
        ? this.scrollToBottom()
        : this.scrollToTop();
    } else if (withRetry) {
      // If the message was newly inserted into activeChannelMessages$, the message will be rendered after the current change detection cycle -> wait for this cycle to complete
      setTimeout(() => this.scrollToLatestMessage(false), 0);
    }
  }

  private newMessageReceived(message: {
    id: string;
    created_at: Date;
    user?: { id: string } | null;
  }) {
    const latestMessages =
      this.channelService.activeChannel?.state?.latestMessages;
    if (
      !this.latestMessage ||
      this.latestMessage.created_at?.getTime() < message.created_at.getTime() ||
      (this.mode === 'main' &&
        latestMessages &&
        this.latestMessage &&
        latestMessages[latestMessages.length - 1]?.id !== this.latestMessage.id)
    ) {
      this.chatClientService.chatClient?.logger?.(
        'info',
        `Received new message`,
        { tags: `message list ${this.mode}` }
      );
      const isNewChannel = !this.latestMessage;
      this.latestMessage = message;
      this.hasNewMessages = true;
      this.isNewMessageSentByUser =
        message.user?.id === this.chatClientService.chatClient?.user?.id;
      if (this.isUserScrolled) {
        this.newMessageCountWhileBeingScrolled++;
      }
      if (
        !this.isNewMessageSentByUser &&
        this.unreadCount !== undefined &&
        !isNewChannel
      ) {
        this.unreadCount++;
      }
      this.cdRef.detectChanges();
    }
  }

  private checkIfOnSeparateDates(
    message?: StreamMessage,
    nextMessage?: StreamMessage
  ) {
    if (!message || !nextMessage) {
      return false;
    }
    return isOnSeparateDate(message.created_at, nextMessage.created_at);
  }
}
