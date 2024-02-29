import {
  AfterViewChecked,
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { ReactionResponse, UserResponse } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { MessageReactionType, DefaultStreamChatGenerics } from '../types';
import { NgxPopperjsTriggers, NgxPopperjsPlacements } from 'ngx-popperjs';
import { MessageReactionsService } from '../message-reactions.service';
import { CustomTemplatesService } from '../custom-templates.service';
import { ThemeService } from '../theme.service';
import { Subscription } from 'rxjs';

/**
 * The `MessageReactions` component displays the reactions of a message, the current user can add and remove reactions. You can read more about [message reactions](https://getstream.io/chat/docs/javascript/send_reaction/?language=javascript) in the platform documentation.
 */
@Component({
  selector: 'stream-message-reactions',
  templateUrl: './message-reactions.component.html',
})
export class MessageReactionsComponent
  implements AfterViewChecked, OnChanges, OnInit, AfterViewInit, OnDestroy
{
  /**
   * The id of the message the reactions belong to
   */
  @Input() messageId: string | undefined;
  /**
   * The number of reactions grouped by [reaction types](https://github.com/GetStream/stream-chat-angular/tree/master/projects/stream-chat-angular/src/lib/message-reactions/message-reactions.component.ts)
   */
  @Input() messageReactionCounts: { [key in MessageReactionType]?: number } =
    {};
  /**
   * Indicates if the selector should be opened or closed. Adding a UI element to open and close the selector is the parent's component responsibility.
   */
  @Input() isSelectorOpen: boolean = false;
  /**
   * List of reactions of a [message](../types/stream-message.mdx), used to display the users of a reaction type.
   */
  @Input() latestReactions: ReactionResponse<DefaultStreamChatGenerics>[] = [];
  /**
   * List of the user's own reactions of a [message](../types/stream-message.mdx), used to display the users of a reaction type.
   */
  @Input() ownReactions: ReactionResponse<DefaultStreamChatGenerics>[] = [];
  /**
   * Indicates if the selector should be opened or closed. Adding a UI element to open and close the selector is the parent's component responsibility.
   */
  @Output() readonly isSelectorOpenChange = new EventEmitter<boolean>();
  tooltipPositions: { arrow: number; tooltip: number } | undefined;
  tooltipText: string | undefined;
  @ViewChild('selectorContainer') private selectorContainer:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('selectorTooltip') private selectorTooltip:
    | ElementRef<HTMLElement>
    | undefined;
  currentTooltipTarget: HTMLElement | undefined;
  popperTriggerHover = NgxPopperjsTriggers.hover;
  popperPlacementAuto = NgxPopperjsPlacements.AUTO;
  selectedReactionType: string | undefined;
  isLoading = true;
  reactions: ReactionResponse[] = [];
  shouldHandleReactionClick = true;
  existingReactions: string[] = [];
  reactionsCount: number = 0;
  reactionOptions: string[] = [];
  private subscriptions: Subscription[] = [];
  private isViewInited = false;

  constructor(
    private cdRef: ChangeDetectorRef,
    private channelService: ChannelService,
    private messageReactionsService: MessageReactionsService,
    public customTemplatesService: CustomTemplatesService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.messageReactionsService.reactions$.subscribe((reactions) => {
        this.reactionOptions = Object.keys(reactions);
        this.setExistingReactions();
        if (this.isViewInited) {
          this.cdRef.detectChanges();
        }
      })
    );
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.isSelectorOpen) {
      this.isSelectorOpen
        ? setTimeout(() => this.watchForOutsideClicks()) // setTimeout: wait for current click to bubble up, and only watch for clicks after that
        : this.stopWatchForOutsideClicks();
    }
    if (changes.messageReactionCounts) {
      this.setExistingReactions();
    }
    if (changes.messageReactionCounts && this.messageReactionCounts) {
      const reactionsCount = Object.keys(this.messageReactionCounts).reduce(
        (acc, key) => acc + (this.messageReactionCounts[key] || 0),
        0
      );
      this.shouldHandleReactionClick =
        reactionsCount <= ChannelService.MAX_MESSAGE_REACTIONS_TO_FETCH ||
        !!this.messageReactionsService.customReactionClickHandler;
    }
  }

  ngAfterViewInit(): void {
    this.isViewInited = true;
  }

  ngAfterViewChecked(): void {
    if (this.tooltipText && !this.tooltipPositions) {
      this.setTooltipPosition();
      this.cdRef.detectChanges();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  getLatestUserByReaction(reactionType: MessageReactionType) {
    return this.latestReactions.find((r) => r.type === reactionType && r.user)
      ?.user;
  }

  getEmojiByReaction(reactionType: MessageReactionType) {
    return this.messageReactionsService.reactions[reactionType];
  }

  reactionSelected(reactionType: string) {
    if (!this.shouldHandleReactionClick) {
      return;
    }
    if (this.themeService.themeVersion === '1') {
      return;
    }
    if (!this.messageId) {
      return;
    }
    if (this.messageReactionsService.customReactionClickHandler) {
      this.messageReactionsService.customReactionClickHandler({
        messageId: this.messageId,
        reactionType: reactionType,
      });
    } else {
      this.selectedReactionType = reactionType;
      void this.fetchAllReactions();
    }
  }

  getUsersByReaction(reactionType: MessageReactionType) {
    return this.latestReactions
      .filter((r) => r.type === reactionType)
      .map((r) => r.user?.name || r.user?.id)
      .filter((i) => !!i)
      .join(', ');
  }

  getAllUsersByReaction(
    reactionType?: MessageReactionType
  ): UserResponse<DefaultStreamChatGenerics>[] {
    if (!reactionType) {
      return [];
    }

    const users = this.reactions
      .filter((r) => r.type === reactionType)
      .map((r) => r.user)
      .filter((i) => !!i) as UserResponse[];

    users.sort((u1, u2) => {
      const name1 = u1.name?.toLowerCase();
      const name2 = u2.name?.toLowerCase();

      if (!name1) {
        return 1;
      }

      if (!name2) {
        return -1;
      }

      if (name1 === name2) {
        return 0;
      }

      if (name1 < name2) {
        return -1;
      } else {
        return 1;
      }
    });

    return users;
  }

  showTooltip(event: Event, reactionType: MessageReactionType) {
    this.currentTooltipTarget = event.target as HTMLElement;
    this.tooltipText = this.getUsersByReaction(reactionType);
  }

  hideTooltip() {
    this.tooltipText = undefined;
    this.currentTooltipTarget = undefined;
    this.tooltipPositions = undefined;
  }

  trackByMessageReaction(index: number, item: MessageReactionType) {
    return item;
  }

  trackByUserId(index: number, item: UserResponse) {
    return item.id;
  }

  async react(type: MessageReactionType) {
    this.ownReactions.find((r) => r.type === type)
      ? await this.channelService.removeReaction(this.messageId!, type)
      : await this.channelService.addReaction(this.messageId!, type);
    this.isSelectorOpenChange.emit(false);
  }

  isOwnReaction(reactionType: MessageReactionType) {
    return !!this.ownReactions.find((r) => r.type === reactionType);
  }

  isOpenChange = (isOpen: boolean) => {
    this.selectedReactionType = isOpen ? this.selectedReactionType : undefined;
  };

  private eventHandler = (event: Event) => {
    if (!this.selectorContainer?.nativeElement.contains(event.target as Node)) {
      this.isSelectorOpenChange.emit(false);
    }
  };

  private watchForOutsideClicks() {
    window.addEventListener('click', this.eventHandler);
  }

  private stopWatchForOutsideClicks() {
    window.removeEventListener('click', this.eventHandler);
  }

  private setTooltipPosition() {
    const tooltip = this.selectorTooltip?.nativeElement.getBoundingClientRect();
    const target = this.currentTooltipTarget?.getBoundingClientRect();

    const container =
      this.selectorContainer?.nativeElement.getBoundingClientRect();

    if (!tooltip || !target || !container) return;

    const tooltipPosition =
      tooltip.width === container.width || tooltip.x < container.x
        ? 0
        : target.left + target.width / 2 - container.left - tooltip.width / 2;

    const arrowPosition =
      target.x - tooltip.x + target.width / 2 - tooltipPosition;

    this.tooltipPositions = {
      tooltip: tooltipPosition,
      arrow: arrowPosition,
    };
  }

  private async fetchAllReactions() {
    if (!this.messageId) {
      return;
    }
    this.isLoading = true;
    try {
      this.reactions = await this.channelService.getMessageReactions(
        this.messageId
      );
    } catch (error) {
      this.selectedReactionType = undefined;
    } finally {
      this.isLoading = false;
      this.cdRef.detectChanges();
    }
  }

  private setExistingReactions() {
    this.existingReactions = Object.keys(this.messageReactionCounts)
      .filter((k) => this.reactionOptions.indexOf(k) !== -1)
      .filter((k) => this.messageReactionCounts[k]! > 0);
    this.reactionsCount = this.existingReactions.reduce(
      (total, reaction) => total + this.messageReactionCounts[reaction]!,
      0
    );
  }
}
