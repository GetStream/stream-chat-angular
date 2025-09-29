import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { ChatClientService } from '../chat-client.service';
import { Poll, User } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { Subscription } from 'rxjs';
import { CustomTemplatesService } from '../custom-templates.service';
import { NotificationService } from '../notification.service';

/**
 * @internal
 */
@Component({
  selector: 'stream-base-poll',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export abstract class BasePollComponent
  implements OnChanges, AfterViewInit, OnDestroy
{
  /**
   * The poll id to display
   */
  @Input() pollId: string | undefined;
  /**
   * The message id the poll is attached to
   */
  @Input() messageId: string | undefined;
  canVote = false;
  canQueryVotes = false;
  private pollStateUnsubscribe?: () => void;
  private isViewInited = false;
  private capabilitySubscription?: Subscription;
  protected dismissNotificationFn: (() => void) | undefined;

  constructor(
    public customTemplatesService: CustomTemplatesService,
    private chatClientService: ChatClientService,
    private cdRef: ChangeDetectorRef,
    private channelService: ChannelService,
    protected notificationService: NotificationService
  ) {
    this.capabilitySubscription = this.channelService.activeChannel$.subscribe(
      (channel) => {
        if (channel) {
          const capabilities = channel.data?.own_capabilities as string[];
          this.canVote = capabilities.indexOf('cast-poll-vote') !== -1;
          this.canQueryVotes = capabilities.indexOf('query-poll-votes') !== -1;
        }
      }
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pollId']) {
      if (this.pollId) {
        this.setupStateStoreSelector();
      } else {
        this.pollStateUnsubscribe?.();
      }
      this.dismissNotificationFn?.();
    }
  }

  ngAfterViewInit(): void {
    this.isViewInited = true;
  }

  ngOnDestroy(): void {
    this.pollStateUnsubscribe?.();
    this.dismissNotificationFn?.();
    this.capabilitySubscription?.unsubscribe();
  }

  protected get poll(): Poll | undefined {
    return this.chatClientService.chatClient.polls.fromState(this.pollId ?? '');
  }

  protected setupStateStoreSelector(): void {
    this.pollStateUnsubscribe?.();
    const poll = this.chatClientService.chatClient.polls.fromState(
      this.pollId ?? ''
    );
    if (poll) {
      this.pollStateUnsubscribe = this.stateStoreSelector(poll, () => {
        this.markForCheck();
      });
    }
  }

  protected addNotification(
    ...args: Parameters<
      typeof this.notificationService.addTemporaryNotification
    >
  ) {
    this.dismissNotificationFn?.();
    this.dismissNotificationFn =
      this.notificationService.addTemporaryNotification(...args);
  }

  protected abstract stateStoreSelector(
    poll: Poll,
    markForCheck: () => void
  ): () => void;

  protected get currentUser(): User | undefined {
    return this.chatClientService.chatClient.user;
  }

  protected markForCheck(): void {
    if (this.isViewInited) {
      this.cdRef.detectChanges();
    }
  }
}
