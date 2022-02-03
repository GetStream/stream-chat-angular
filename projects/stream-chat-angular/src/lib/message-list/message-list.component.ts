import {
  AfterViewChecked,
  Component,
  ElementRef,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { ChannelService } from '../channel.service';
import { Observable, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import { StreamMessage } from '../types';
import { ChatClientService } from '../chat-client.service';
import { getGroupStyles, GroupStyle } from './group-styles';
import { ImageLoadService } from './image-load.service';

@Component({
  selector: 'stream-message-list',
  templateUrl: './message-list.component.html',
  styles: [],
})
export class MessageListComponent
  implements AfterViewChecked, OnChanges, OnInit, OnDestroy
{
  @Input() messageTemplate: TemplateRef<any> | undefined;
  @Input() messageInputTemplate: TemplateRef<any> | undefined;
  @Input() mentionTemplate: TemplateRef<any> | undefined;
  /**
   * @deprecated https://getstream.io/chat/docs/sdk/angular/components/message_list/#caution-arereactionsenabled-deprecated
   */
  @Input() areReactionsEnabled: boolean | undefined = undefined;
  /**
   * @deprecated https://getstream.io/chat/docs/sdk/angular/components/message_list/#caution-enabledmessageactions-deprecated
   */
  /* eslint-disable-next-line @angular-eslint/no-input-rename */
  @Input('enabledMessageActions') enabledMessageActionsInput:
    | string[]
    | undefined = undefined;
  @Input() mode: 'main' | 'thread' = 'main';
  messages$!: Observable<StreamMessage[]>;
  canReactToMessage: boolean | undefined;
  canReceiveReadEvents: boolean | undefined;
  enabledMessageActions: string[] = [];
  @HostBinding('class') private class =
    'str-chat-angular__main-panel-inner str-chat-angular__message-list-host';
  unreadMessageCount = 0;
  isUserScrolledUp: boolean | undefined;
  groupStyles: GroupStyle[] = [];
  lastSentMessageId: string | undefined;
  parentMessage: StreamMessage | undefined;
  @ViewChild('scrollContainer')
  private scrollContainer!: ElementRef<HTMLElement>;
  @ViewChild('parentMessageElement')
  private parentMessageElement!: ElementRef<HTMLElement>;
  private latestMessageDate: Date | undefined;
  private hasNewMessages: boolean | undefined;
  private containerHeight: number | undefined;
  private oldestMessageDate: Date | undefined;
  private olderMassagesLoaded: boolean | undefined;
  private isNewMessageSentByUser: boolean | undefined;
  private authorizedMessageActions: string[] = ['flag'];
  private readonly isUserScrolledUpThreshold = 300;
  private subscriptions: Subscription[] = [];
  private prevScrollTop: number | undefined;

  constructor(
    private channelService: ChannelService,
    private chatClientService: ChatClientService,
    private imageLoadService: ImageLoadService
  ) {
    this.subscriptions.push(
      this.channelService.activeChannel$.subscribe((channel) => {
        this.resetScrollState();
        const capabilites = channel?.data?.own_capabilities as string[];
        if (capabilites) {
          this.canReactToMessage = capabilites.indexOf('send-reaction') !== -1;
          this.canReceiveReadEvents = capabilites.indexOf('read-events') !== -1;
          this.authorizedMessageActions = [];
          if (this.canReactToMessage) {
            this.authorizedMessageActions.push('send-reaction');
          }
          if (this.canReceiveReadEvents) {
            this.authorizedMessageActions.push('read-events');
          }
          if (capabilites.indexOf('flag-message') !== -1) {
            this.authorizedMessageActions.push('flag');
          }
          if (capabilites.indexOf('update-own-message') !== -1) {
            this.authorizedMessageActions.push('edit');
          }
          if (capabilites.indexOf('update-any-message') !== -1) {
            this.authorizedMessageActions.push('edit');
            this.authorizedMessageActions.push('edit-any');
          }
          if (capabilites.indexOf('delete-own-message') !== -1) {
            this.authorizedMessageActions.push('delete');
          }
          if (capabilites.indexOf('delete-any-message') !== -1) {
            this.authorizedMessageActions.push('delete');
            this.authorizedMessageActions.push('delete-any');
          }
          if (capabilites.indexOf('send-reply') !== -1) {
            this.authorizedMessageActions.push('send-reply');
          }
          if (capabilites.indexOf('quote-message') !== -1) {
            this.authorizedMessageActions.push('quote-message');
          }
          this.setEnabledActions();
        }
      })
    );
    this.subscriptions.push(
      this.imageLoadService.imageLoad$.subscribe(() => {
        if (!this.isUserScrolledUp) {
          this.scrollToBottom();
          // Hacky and unreliable workaround to scroll down after loaded images move the scrollbar
          setTimeout(() => {
            this.scrollToBottom();
          }, 300);
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
        this.parentMessage = message;
      })
    );
  }

  ngOnInit(): void {
    this.setMessages$();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.enabledMessageActionsInput) {
      this.setEnabledActions();
    }
    if (changes.mode) {
      this.setMessages$();
    }
  }

  ngAfterViewChecked() {
    if (this.hasNewMessages) {
      if (!this.isUserScrolledUp || this.isNewMessageSentByUser) {
        this.scrollToBottom();
        // Hacky and unreliable workaround to scroll down after loaded images move the scrollbar
        setTimeout(() => {
          this.scrollToBottom();
        }, 300);
      }
      this.hasNewMessages = false;
      this.containerHeight = this.scrollContainer.nativeElement.scrollHeight;
    } else if (this.olderMassagesLoaded) {
      this.preserveScrollbarPosition();
      this.containerHeight = this.scrollContainer.nativeElement.scrollHeight;
      this.olderMassagesLoaded = false;
    } else if (
      this.containerHeight !== undefined &&
      this.containerHeight < this.scrollContainer.nativeElement.scrollHeight &&
      !this.isUserScrolledUp
    ) {
      this.scrollToBottom();
      this.containerHeight = this.scrollContainer.nativeElement.scrollHeight;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  trackByMessageId(index: number, item: StreamMessage) {
    return item.id;
  }

  scrollToBottom(): void {
    this.scrollContainer.nativeElement.scrollTop =
      this.scrollContainer.nativeElement.scrollHeight;
  }

  scrolled() {
    this.isUserScrolledUp =
      this.scrollContainer.nativeElement.scrollHeight -
        (this.scrollContainer.nativeElement.scrollTop +
          this.scrollContainer.nativeElement.clientHeight) >
      this.isUserScrolledUpThreshold;
    if (!this.isUserScrolledUp) {
      this.unreadMessageCount = 0;
    }
    if (
      this.scrollContainer.nativeElement.scrollTop <=
        (this.parentMessageElement?.nativeElement.clientHeight || 0) &&
      (this.prevScrollTop === undefined ||
        this.prevScrollTop >
          (this.parentMessageElement?.nativeElement.clientHeight || 0))
    ) {
      this.containerHeight = this.scrollContainer.nativeElement.scrollHeight;
      this.mode === 'main'
        ? void this.channelService.loadMoreMessages()
        : void this.channelService.loadMoreThreadReplies();
    }
    this.prevScrollTop = this.scrollContainer.nativeElement.scrollTop;
  }

  private preserveScrollbarPosition() {
    this.scrollContainer.nativeElement.scrollTop =
      (this.prevScrollTop || 0) +
      (this.scrollContainer.nativeElement.scrollHeight - this.containerHeight!);
  }

  private setEnabledActions() {
    this.enabledMessageActions = [];
    if (!this.enabledMessageActionsInput) {
      this.enabledMessageActions = this.authorizedMessageActions;
      return;
    }
    this.enabledMessageActionsInput = [
      ...this.enabledMessageActionsInput,
      'send-reaction',
      'read-events',
      'send-reply',
      'quote-message',
    ];
    this.enabledMessageActionsInput.forEach((action) => {
      const isAuthorized = this.authorizedMessageActions.indexOf(action) !== -1;
      if (isAuthorized) {
        this.enabledMessageActions.push(action);
      }
    });
  }

  private setMessages$() {
    this.messages$ = (
      this.mode === 'main'
        ? this.channelService.activeChannelMessages$
        : this.channelService.activeThreadMessages$
    ).pipe(
      tap((messages) => {
        if (messages.length === 0) {
          return;
        }
        const currentLatestMessageDate =
          messages[messages.length - 1].created_at;
        if (
          !this.latestMessageDate ||
          this.latestMessageDate?.getTime() < currentLatestMessageDate.getTime()
        ) {
          this.latestMessageDate = currentLatestMessageDate;
          this.hasNewMessages = true;
          this.isNewMessageSentByUser =
            messages[messages.length - 1].user?.id ===
            this.chatClientService.chatClient?.user?.id;
          if (this.isUserScrolledUp) {
            this.unreadMessageCount++;
          }
        }
        const currentOldestMessageDate = messages[0].created_at;
        if (!this.oldestMessageDate) {
          this.oldestMessageDate = currentOldestMessageDate;
        } else if (
          this.oldestMessageDate?.getTime() > currentOldestMessageDate.getTime()
        ) {
          this.oldestMessageDate = currentOldestMessageDate;
          this.olderMassagesLoaded = true;
        }
      }),
      tap((messages) => {
        this.groupStyles = messages.map((m, i) =>
          getGroupStyles(m, messages[i - 1], messages[i + 1])
        );
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
      )
    );
  }

  private resetScrollState() {
    this.latestMessageDate = undefined;
    this.hasNewMessages = true;
    this.isUserScrolledUp = false;
    this.containerHeight = undefined;
    this.olderMassagesLoaded = false;
    this.oldestMessageDate = undefined;
    this.unreadMessageCount = 0;
    this.prevScrollTop = undefined;
    this.isNewMessageSentByUser = undefined;
  }
}
