import {
  AfterViewChecked,
  Component,
  ElementRef,
  HostBinding,
  Input,
  OnChanges,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { ChannelService } from '../channel.service';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { StreamMessage } from '../types';
import { ChatClientService } from '../chat-client.service';
import { getGroupStyles, GroupStyle } from './group-styles';
import { ImageLoadService } from './image-load.service';
import { MessageActions } from '../message-actions-box/message-actions-box.component';
@Component({
  selector: 'stream-message-list',
  templateUrl: './message-list.component.html',
  styles: [],
})
export class MessageListComponent implements AfterViewChecked, OnChanges {
  @Input() messageTemplate: TemplateRef<any> | undefined;
  @Input() areReactionsEnabled = true;
  /* eslint-disable-next-line @angular-eslint/no-input-rename */
  @Input('enabledMessageActions') enabledMessageActionsInput: MessageActions[] =
    ['flag', 'edit', 'edit-any', 'delete', 'delete-any'];
  messages$!: Observable<StreamMessage[]>;
  canReactToMessage: boolean | undefined;
  canReceiveReadEvents: boolean | undefined;
  enabledMessageActions: MessageActions[] = [];
  @HostBinding('class') private class =
    'str-chat-angular__main-panel-inner str-chat-angular__message-list-host';
  unreadMessageCount = 0;
  isUserScrolledUp: boolean | undefined;
  groupStyles: GroupStyle[] = [];
  lastSentMessageId: string | undefined;
  @ViewChild('scrollContainer')
  private scrollContainer!: ElementRef<HTMLElement>;
  private latestMessageDate: Date | undefined;
  private hasNewMessages: boolean | undefined;
  private containerHeight: number | undefined;
  private oldestMessageDate: Date | undefined;
  private olderMassagesLoaded: boolean | undefined;
  private isNewMessageSentByUser: boolean | undefined;
  private authorizedMessageActions: MessageActions[] = ['flag'];
  private readonly isUserScrolledUpThreshold = 300;

  constructor(
    private channelService: ChannelService,
    private chatClientService: ChatClientService,
    private imageLoadService: ImageLoadService
  ) {
    this.channelService.activeChannel$.subscribe((channel) => {
      this.latestMessageDate = undefined;
      this.hasNewMessages = true;
      this.isUserScrolledUp = false;
      this.containerHeight = undefined;
      this.olderMassagesLoaded = false;
      this.oldestMessageDate = undefined;
      this.unreadMessageCount = 0;
      this.isNewMessageSentByUser = undefined;
      const capabilites = channel?.data?.own_capabilities as string[];
      if (capabilites) {
        this.canReactToMessage = capabilites.indexOf('send-reaction') !== -1;
        this.canReceiveReadEvents = capabilites.indexOf('read-events') !== -1;
        this.authorizedMessageActions = [];
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
        this.setEnabledActions();
      }
    });
    this.messages$ = this.channelService.activeChannelMessages$.pipe(
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
    this.imageLoadService.imageLoad$.subscribe(() => {
      if (!this.isUserScrolledUp) {
        this.scrollToBottom();
        // Hacky and unreliable workaround to scroll down after loaded images move the scrollbar
        setTimeout(() => {
          this.scrollToBottom();
        }, 300);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.enabledMessageActionsInput) {
      this.setEnabledActions();
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
    }
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
    if (this.scrollContainer.nativeElement.scrollTop === 0) {
      this.containerHeight = this.scrollContainer.nativeElement.scrollHeight;
      void this.channelService.loadMoreMessages();
    }
  }

  private preserveScrollbarPosition() {
    this.scrollContainer.nativeElement.scrollTop =
      this.scrollContainer.nativeElement.scrollHeight - this.containerHeight!;
  }

  private setEnabledActions() {
    this.enabledMessageActions = [];
    if (!this.enabledMessageActionsInput) {
      return;
    }
    this.enabledMessageActionsInput.forEach((action) => {
      const isAuthorized = this.authorizedMessageActions.indexOf(action) !== -1;
      if (isAuthorized) {
        this.enabledMessageActions.push(action);
      }
    });
  }
}
