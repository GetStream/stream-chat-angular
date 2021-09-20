import {
  AfterViewChecked,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { FormatMessageResponse } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
@Component({
  selector: 'stream-message-list',
  templateUrl: './message-list.component.html',
  styleUrls: ['./message-list.component.scss'],
})
export class MessageListComponent implements AfterViewChecked {
  messages$!: Observable<FormatMessageResponse[]>;
  @ViewChild('scrollContainer')
  private scrollContainer!: ElementRef<HTMLElement>;
  private latestMessageDate: Date | undefined;
  private hasNewMessages: boolean | undefined;
  private isUserScrolledUp: boolean | undefined;
  private containerHeight: number | undefined;
  private oldestMessageDate: Date | undefined;
  private olderMassagesLoaded: boolean | undefined;

  constructor(private channelService: ChannelService) {
    this.channelService.activeChannel$.subscribe(() => {
      this.latestMessageDate = undefined;
      this.hasNewMessages = true;
      this.isUserScrolledUp = false;
      this.containerHeight = undefined;
      this.olderMassagesLoaded = false;
      this.oldestMessageDate = undefined;
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
      })
    );
  }

  ngAfterViewChecked() {
    if (this.hasNewMessages) {
      if (!this.isUserScrolledUp) {
        this.scrollToBottom();
      }
      this.hasNewMessages = false;
      this.containerHeight = this.scrollContainer.nativeElement.scrollHeight;
    } else if (this.olderMassagesLoaded) {
      this.preserveScrollbarPosition();
      this.containerHeight = this.scrollContainer.nativeElement.scrollHeight;
      this.olderMassagesLoaded = false;
    }
  }

  scrolled() {
    this.isUserScrolledUp =
      this.scrollContainer.nativeElement.scrollTop +
        this.scrollContainer.nativeElement.clientHeight !==
      this.scrollContainer.nativeElement.scrollHeight;
    if (this.scrollContainer.nativeElement.scrollTop === 0) {
      this.containerHeight = this.scrollContainer.nativeElement.scrollHeight;
      void this.channelService.loadMoreMessages();
    }
  }

  private scrollToBottom(): void {
    this.scrollContainer.nativeElement.scrollTop =
      this.scrollContainer.nativeElement.scrollHeight;
  }

  private preserveScrollbarPosition() {
    this.scrollContainer.nativeElement.scrollTop =
      this.scrollContainer.nativeElement.scrollHeight - this.containerHeight!;
  }
}
