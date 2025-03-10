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
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import {
  filter,
  map,
  shareReplay,
  take,
  tap,
  throttleTime,
} from 'rxjs/operators';
import {
  MessageContext,
  StreamMessage,
  TypingIndicatorContext,
  DateSeparatorContext,
  UnreadMessagesNotificationContext,
  UnreadMessagesIndicatorContext,
  VirtualizedListScrollPosition,
} from '../types';
import { ChatClientService } from '../chat-client.service';
import { getGroupStyles, GroupStyle } from './group-styles';
import { MessageResponse, UserResponse } from 'stream-chat';
import { CustomTemplatesService } from '../custom-templates.service';
import { listUsers } from '../list-users';
import { DateParserService } from '../date-parser.service';
import { isOnSeparateDate } from '../is-on-separate-date';
import { VirtualizedMessageListService } from '../virtualized-message-list.service';
import { isSafari } from '../is-safari';

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
   * Determines if the message list should display channel messages or [thread messages](/chat/docs/javascript/threads/).
   */
  @Input() mode: 'main' | 'thread' = 'main';
  /**
   * The direction of the messages in the list, `bottom-to-top` means newest message is at the bottom of the message list and users scroll upwards to load older messages
   */
  @Input() direction: 'bottom-to-top' | 'top-to-bottom' = 'bottom-to-top';
  /**
   * You can hide the "jump to latest" button while scrolling. A potential use-case for this input would be to [workaround a known issue on iOS Safar webview](https://github.com/GetStream/stream-chat-angular/issues/418)
   *
   */
  @Input() hideJumpToLatestButtonDuringScroll = false;
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
  loadingState: 'idle' | 'loading-top' | 'loading-bottom' = 'idle';
  scrollEndTimeout?: ReturnType<typeof setTimeout>;
  lastReadMessageId?: string;
  isUnreadNotificationVisible = true;
  firstUnreadMessageId?: string;
  unreadCount?: number;
  isJumpingToLatestUnreadMessage = false;
  isJumpToLatestButtonVisible = true;
  isJumpingToMessage = false;
  scroll$ = new Subject<void>();
  @ViewChild('scrollContainer')
  private scrollContainer!: ElementRef<HTMLElement>;
  @ViewChild('parentMessageElement')
  private parentMessageElement!: ElementRef<HTMLElement>;
  private isNewMessageSentByUser: boolean = false;
  private subscriptions: Subscription[] = [];
  private newMessageSubscription: { unsubscribe: () => void } | undefined;
  private usersTypingInChannel$!: Observable<UserResponse[]>;
  private usersTypingInThread$!: Observable<UserResponse[]>;
  private isLatestMessageInList = true;
  private channelId?: string;
  private parsedDates = new Map<Date, string>();
  private isViewInited = false;
  private checkIfUnreadNotificationIsVisibleTimeout?: ReturnType<
    typeof setTimeout
  >;
  private jumpToMessageTimeouts: ReturnType<typeof setTimeout>[] = [];
  private jumpToLatestButtonVisibilityTimeout?: ReturnType<typeof setTimeout>;
  private forceRepaintSubject = new Subject<void>();
  private messageIdToAnchorTo?: string;
  private anchorMessageTopOffset?: number;
  private isSafari = isSafari();

  @HostBinding('class')
  private get class() {
    return `str-chat-angular__main-panel-inner str-chat-angular__message-list-host str-chat__main-panel-inner ${
      this.isEmpty ? 'str-chat-angular__message-list-host--empty' : ''
    }`;
  }
  private virtualizedList?: VirtualizedMessageListService;
  private scrollPosition$ = new BehaviorSubject<VirtualizedListScrollPosition>(
    'bottom',
  );
  private jumpToItemSubscription?: Subscription;
  private queryStateSubscription?: Subscription;

  constructor(
    private channelService: ChannelService,
    private chatClientService: ChatClientService,
    private customTemplatesService: CustomTemplatesService,
    private dateParser: DateParserService,
    private ngZone: NgZone,
    private cdRef: ChangeDetectorRef,
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.mode || changes.direction) {
      this.resetScrollState();
      this.setMessages$();
    }
    if (changes.direction) {
      if (this.scrollContainer?.nativeElement) {
        this.jumpToLatestMessage();
      }
    }
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.forceRepaintSubject.pipe(throttleTime(1000)).subscribe(() => {
        this.forceRepaint();
      }),
    );
    this.subscriptions.push(
      this.channelService.activeChannel$.subscribe((channel) => {
        let wasChannelSwitch = false;
        if (this.channelId !== channel?.id) {
          wasChannelSwitch = true;
          if (this.checkIfUnreadNotificationIsVisibleTimeout) {
            clearTimeout(this.checkIfUnreadNotificationIsVisibleTimeout);
          }
          this.jumpToMessageTimeouts.forEach((timeout) =>
            clearTimeout(timeout),
          );
          this.jumpToMessageTimeouts = [];
          this.highlightedMessageId = undefined;
          this.isUnreadNotificationVisible = false;
          this.parsedDates = new Map();
          this.resetScrollState();
          this.setMessages$();
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
            if (wasChannelSwitch && this.lastReadMessageId) {
              // Delay jumping to last read message in case we need to give precedence to channelService.jumpToMessage
              if (this.openMessageListAt === 'last-read-message') {
                setTimeout(() => {
                  // Don't jump if a jump to a message was already started (using channelService.jumpToMessage)
                  if (
                    !this.isJumpingToMessage &&
                    !this.channelService.isMessageLoadingInProgress
                  ) {
                    this.jumpToFirstUnreadMessage();
                  }
                }, 0);
              } else {
                // Wait till messages and the unread banner is rendered
                // If unread banner isn't visible on the screen, we display the unread notificaion
                setTimeout(() => {
                  const bannerElement = document.getElementById(
                    'stream-chat-new-message-indicator',
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
            if (!event.message) {
              return;
            } else {
              this.newMessageReceived(event.message);
            }
          });
        }
      }),
    );
    this.subscriptions.push(
      this.channelService.activeParentMessage$.subscribe((message) => {
        if (!message && this.parentMessage && this.mode === 'thread') {
          this.resetScrollState();
        }
        if (
          message &&
          this.parentMessage &&
          message.id !== this.parentMessage.id &&
          this.mode === 'thread'
        ) {
          this.resetScrollState();
          this.setMessages$();
        }
        if (this.parentMessage === message) {
          return;
        }
        this.parentMessage = message;
        if (this.isViewInited) {
          this.cdRef.detectChanges();
        }
      }),
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
      }),
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
        },
      ),
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
        },
      ),
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
        },
      ),
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
        },
      ),
    );
    this.subscriptions.push(
      this.customTemplatesService.emptyMainMessageListPlaceholder$.subscribe(
        (template) => {
          const isChanged = this.emptyMainMessageListTemplate !== template;
          this.emptyMainMessageListTemplate = template || null;
          if (isChanged && this.isViewInited) {
            this.cdRef.detectChanges();
          }
        },
      ),
    );
    this.subscriptions.push(
      this.customTemplatesService.emptyThreadMessageListPlaceholder$.subscribe(
        (template) => {
          const isChanged = this.emptyThreadMessageListTemplate !== template;
          this.emptyThreadMessageListTemplate = template || null;
          if (isChanged && this.isViewInited) {
            this.cdRef.detectChanges();
          }
        },
      ),
    );
    this.setMessages$();
  }

  ngAfterViewInit(): void {
    this.isViewInited = true;
    this.ngZone.runOutsideAngular(() => {
      this.scrollContainer?.nativeElement?.addEventListener('scroll', () =>
        this.scrolled(),
      );
    });
  }

  ngAfterViewChecked() {
    if (this.isJumpingToMessage) {
      this.isNewMessageSentByUser = false;
      this.messageIdToAnchorTo = undefined;
      this.anchorMessageTopOffset = undefined;
      return;
    }
    if (this.messageIdToAnchorTo && this.loadingState === 'idle') {
      this.preserveScrollbarPosition();
    } else if (
      (!this.isUserScrolled &&
        this.scrollContainer.nativeElement?.scrollHeight >
          this.scrollContainer?.nativeElement.clientHeight &&
        this.getScrollPosition() !==
          (this.direction === 'bottom-to-top' ? 'bottom' : 'top')) ||
      (this.isUserScrolled && this.isNewMessageSentByUser)
    ) {
      this.isNewMessageSentByUser = false;
      this.jumpToLatestMessage();
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
    this.jumpToMessageTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.disposeVirtualizedList();
  }

  trackByUserId(_: number, user: UserResponse) {
    return user.id;
  }

  jumpToLatestMessage() {
    if (this.isLatestMessageInList) {
      this.direction === 'bottom-to-top'
        ? this.scrollToBottom()
        : this.scrollToTop();
    } else {
      void this.channelService.jumpToMessage(
        'latest',
        this.mode === 'thread' ? this.parentMessage?.id : undefined,
      );
    }
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
      if (this.isJumpToLatestButtonVisible) {
        this.isJumpToLatestButtonVisible = false;
        this.newMessageCountWhileBeingScrolled = 0;
        this.cdRef.detectChanges();
      }
      return;
    }
    if (
      this.scrollContainer.nativeElement.scrollHeight >
      this.scrollContainer.nativeElement.clientHeight
    ) {
      if (!this.isJumpToLatestButtonVisible) {
        this.isJumpToLatestButtonVisible = true;
      }
    }

    this.scroll$.next();

    this.checkIfUserScrolled();

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

  private checkIfUserScrolled() {
    let scrollPosition = this.getScrollPosition();

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

    const prevScrollPosition = this.scrollPosition$.getValue();

    if (this.direction === 'top-to-bottom') {
      if (scrollPosition === 'top') {
        scrollPosition = 'bottom';
      } else if (scrollPosition === 'bottom') {
        scrollPosition = 'top';
      }
    }

    if (prevScrollPosition !== scrollPosition && !this.isJumpingToMessage) {
      if (scrollPosition === 'top' || scrollPosition === 'bottom') {
        this.virtualizedList?.virtualizedItems$
          .pipe(take(1))
          .subscribe((items) => {
            this.messageIdToAnchorTo =
              scrollPosition === 'top'
                ? items[0]?.id
                : items[items.length - 1]?.id;
            this.anchorMessageTopOffset = document
              .getElementById(this.messageIdToAnchorTo)
              ?.getBoundingClientRect()?.top;
          });
      }
      this.ngZone.run(() => {
        this.scrollPosition$.next(scrollPosition);
      });
    }
  }

  private preserveScrollbarPosition() {
    if (!this.messageIdToAnchorTo) {
      return;
    }
    const messageToAlignTo = document.getElementById(this.messageIdToAnchorTo);
    this.messageIdToAnchorTo = undefined;
    this.scrollContainer.nativeElement.scrollTop +=
      (messageToAlignTo?.getBoundingClientRect()?.top || 0) -
      (this.anchorMessageTopOffset || 0);
    this.anchorMessageTopOffset = undefined;
    if (this.isSafari) {
      this.forceRepaintSubject.next();
    }
  }

  private forceRepaint() {
    // Solves the issue of empty screen on Safari when scrolling
    this.scrollContainer.nativeElement.style.display = 'none';
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.scrollContainer.nativeElement.offsetHeight; // no need to store this anywhere, the reference is enough
    this.scrollContainer.nativeElement.style.display = '';
  }

  private getScrollPosition(): 'top' | 'bottom' | 'middle' {
    let position: 'top' | 'bottom' | 'middle' = 'middle';
    if (
      Math.ceil(this.scrollContainer.nativeElement.scrollTop) +
        this.scrollContainer.nativeElement.clientHeight +
        1 >=
      this.scrollContainer.nativeElement.scrollHeight
    ) {
      position = 'bottom';
    } else if (
      Math.floor(this.scrollContainer.nativeElement.scrollTop) <=
      (this.parentMessageElement?.nativeElement?.clientHeight || 0)
    ) {
      position = 'top';
    }

    return position;
  }

  private setMessages$() {
    this.disposeVirtualizedList();
    this.virtualizedList = new VirtualizedMessageListService(
      this.mode,
      this.scrollPosition$,
      this.channelService,
    );
    this.queryStateSubscription = this.virtualizedList.queryState$.subscribe(
      (queryState) => {
        let mappedState: 'idle' | 'loading-top' | 'loading-bottom' = 'idle';
        if (queryState.state.includes('loading')) {
          mappedState = (queryState.state as 'loading-top') || 'loading-bottom';
        }
        if (mappedState !== this.loadingState) {
          this.loadingState = mappedState;
          if (this.isViewInited) {
            this.cdRef.detectChanges();
          }
        }
      },
    );
    this.messages$ = this.virtualizedList.virtualizedItems$.pipe(
      tap(() => {
        if (this.isEmpty) {
          // cdRef.detectChanges() isn't enough here, test will fail
          setTimeout(() => (this.isEmpty = false), 0);
        }
      }),
      tap((messages) => {
        if (
          this.isJumpingToLatestUnreadMessage &&
          !this.firstUnreadMessageId &&
          this.lastReadMessageId
        ) {
          const lastReadIndex = messages.findIndex(
            (m) => m.id === this.lastReadMessageId,
          );
          if (lastReadIndex !== -1) {
            this.firstUnreadMessageId = messages[lastReadIndex + 1]?.id;
          }
        }
      }),
      tap(
        (messages) =>
          (this.lastSentMessageId = [...messages]
            .reverse()
            .find(
              (m) =>
                m.user?.id === this.chatClientService.chatClient?.user?.id &&
                m.status !== 'sending',
            )?.id),
      ),
      tap((messages) => {
        const latestMessageInList = messages[messages.length - 1];
        const channel = this.channelService.activeChannel;
        const messagesFromState =
          (this.mode === 'main'
            ? channel?.state.latestMessages
            : channel?.state.threads[this.parentMessage?.id || '']) || [];
        this.isLatestMessageInList =
          !latestMessageInList ||
          latestMessageInList.cid !== channel?.cid ||
          (this.mode === 'thread' &&
            latestMessageInList?.parent_id !== this.parentMessage?.id) ||
          latestMessageInList?.id ===
            messagesFromState[messagesFromState.length - 1]?.id;
        if (!this.isLatestMessageInList) {
          this.isUserScrolled = true;
        }
      }),
      map((messages) => {
        return this.direction === 'bottom-to-top'
          ? messages
          : [...messages].reverse();
      }),
      tap((messages) => {
        this.groupStyles = messages.map((m, i) =>
          getGroupStyles(m, messages[i - 1], messages[i + 1], {
            lastReadMessageId: this.lastReadMessageId,
          }),
        );
        this.isNextMessageOnSeparateDate = messages.map((m, i) =>
          this.checkIfOnSeparateDates(m, messages[i + 1]),
        );
      }),
      shareReplay(1),
    );
    if (this.virtualizedList?.jumpToItem$) {
      this.jumpToItemSubscription = this.virtualizedList.jumpToItem$
        .pipe(filter((jumpToMessage) => !!jumpToMessage.item?.id))
        .subscribe((jumpToMessage) => {
          let messageId = jumpToMessage.item?.id;
          if (messageId) {
            if (this.isJumpingToLatestUnreadMessage) {
              messageId = this.firstUnreadMessageId || messageId;
            }
            if (jumpToMessage.position !== 'bottom') {
              this.highlightedMessageId = messageId;
            } else if (this.direction === 'top-to-bottom') {
              jumpToMessage.position = 'top';
            }
            this.isJumpingToMessage = true;
            this.scrollMessageIntoView({
              messageId: this.firstUnreadMessageId || messageId,
              position: jumpToMessage.position || 'middle',
            });
          }
        });
    }
  }

  private resetScrollState() {
    this.isEmpty = true;
    this.isUserScrolled = false;
    this.messageIdToAnchorTo = undefined;
    this.anchorMessageTopOffset = undefined;
    this.newMessageCountWhileBeingScrolled = 0;
    this.isNewMessageSentByUser = false;
    this.isLatestMessageInList = true;
    this.isJumpingToMessage = false;
    this.scrollPosition$.next('bottom');
    this.loadingState = 'idle';
  }

  private disposeVirtualizedList() {
    this.virtualizedList?.dispose();
    this.jumpToItemSubscription?.unsubscribe();
    this.queryStateSubscription?.unsubscribe();
  }

  private get usersTyping$() {
    return this.mode === 'thread'
      ? this.usersTypingInThread$
      : this.usersTypingInChannel$;
  }

  private scrollMessageIntoView(
    options: { messageId: string; position: 'top' | 'bottom' | 'middle' },
    withRetry: boolean = true,
  ) {
    const element = document.getElementById(options.messageId);
    this.jumpToMessageTimeouts.forEach((t) => clearTimeout(t));
    this.jumpToMessageTimeouts = [];
    if (!element && withRetry) {
      // If the message was newly inserted into activeChannelMessages$, the message will be rendered after the current change detection cycle -> wait for this cycle to complete
      this.jumpToMessageTimeouts.push(
        setTimeout(() => this.scrollMessageIntoView(options, false)),
      );
    } else if (element) {
      const blockMapping: { [key: string]: ScrollLogicalPosition } = {
        top: 'start',
        bottom: 'end',
        middle: 'center',
      };
      // We can't know when smooth scrolling ends, so we set the behavior to instant https://github.com/w3c/csswg-drafts/issues/3744
      element.scrollIntoView({
        behavior: 'instant' as ScrollBehavior,
        block: blockMapping[options.position],
      });
      if (options.position !== 'middle') {
        options.position === 'bottom'
          ? this.scrollToBottom()
          : this.scrollToTop();
      }
      this.jumpToMessageTimeouts.push(
        setTimeout(() => {
          this.isJumpingToMessage = false;
          if (!this.isUserScrolled) {
            this.checkIfUserScrolled();
          }
        }, 200),
      );
      this.jumpToMessageTimeouts.push(
        setTimeout(() => {
          this.highlightedMessageId = undefined;
          this.firstUnreadMessageId = undefined;
          this.isJumpingToLatestUnreadMessage = false;
          this.jumpToMessageTimeouts = [];
          this.cdRef.detectChanges();
        }, 1000),
      );
    } else {
      this.isJumpingToMessage = false;
      this.highlightedMessageId = undefined;
      this.firstUnreadMessageId = undefined;
      this.isJumpingToLatestUnreadMessage = false;
    }
  }

  private newMessageReceived(message: MessageResponse) {
    if (
      (this.mode === 'main' && message.parent_id) ||
      (this.mode === 'thread' && message.parent_id !== this.parentMessage?.id)
    ) {
      return;
    }
    const isNewMessageSentByCurrentUser =
      message.user?.id === this.chatClientService.chatClient?.user?.id;

    let shouldDetectChanges = false;

    if (!this.isNewMessageSentByUser && isNewMessageSentByCurrentUser) {
      this.isNewMessageSentByUser = true;
      shouldDetectChanges = true;
    }

    if (this.isUserScrolled) {
      this.newMessageCountWhileBeingScrolled++;
      shouldDetectChanges = true;
    }
    if (!this.isNewMessageSentByUser && this.unreadCount !== undefined) {
      this.unreadCount++;
      shouldDetectChanges = true;
    }

    if (shouldDetectChanges && this.isViewInited) {
      this.cdRef.detectChanges();
    }
  }

  private checkIfOnSeparateDates(
    message?: StreamMessage,
    nextMessage?: StreamMessage,
  ) {
    if (!message || !nextMessage) {
      return false;
    }
    return isOnSeparateDate(message.created_at, nextMessage.created_at);
  }
}
