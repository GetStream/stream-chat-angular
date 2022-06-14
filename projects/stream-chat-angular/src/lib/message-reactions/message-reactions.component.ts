import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { ReactionResponse } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { MessageReactionType, DefaultStreamChatGenerics } from '../types';

const emojiReactionsMapping: { [key in MessageReactionType]: string } = {
  like: '👍',
  angry: '😠',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😞',
};

/**
 * The `MessageReactions` component displays the reactions of a message, the current user can add and remove reactions. You can read more about [message reactions](https://getstream.io/chat/docs/javascript/send_reaction/?language=javascript) in the platform documentation.
 */
@Component({
  selector: 'stream-message-reactions',
  templateUrl: './message-reactions.component.html',
  styles: ['.emoji {position: relative; display: inline-block; }'],
})
export class MessageReactionsComponent implements AfterViewChecked, OnChanges {
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

  constructor(
    private cdRef: ChangeDetectorRef,
    private channelService: ChannelService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.isSelectorOpen) {
      this.isSelectorOpen
        ? setTimeout(() => this.watchForOutsideClicks()) // setTimeout: wait for current click to bubble up, and only watch for clicks after that
        : this.stopWatchForOutsideClicks();
    }
  }

  ngAfterViewChecked(): void {
    if (this.tooltipText && !this.tooltipPositions) {
      this.setTooltipPosition();
      this.cdRef.detectChanges();
    }
  }

  get existingReactions(): MessageReactionType[] {
    return Object.keys(this.messageReactionCounts).filter(
      (k) => this.messageReactionCounts[k as MessageReactionType]! > 0
    ) as MessageReactionType[];
  }

  get reactionsCount() {
    return Object.values(this.messageReactionCounts).reduce(
      (total, count) => total + count,
      0
    );
  }

  get reactionOptions(): MessageReactionType[] {
    return ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
  }

  getLatestUserByReaction(reactionType: MessageReactionType) {
    return this.latestReactions.find((r) => r.type === reactionType && r.user)
      ?.user;
  }

  getEmojiByReaction(reactionType: MessageReactionType) {
    return emojiReactionsMapping[reactionType];
  }

  getUsersByReaction(reactionType: MessageReactionType) {
    return this.latestReactions
      .filter((r) => r.type === reactionType)
      .map((r) => r.user?.name || r.user?.id)
      .filter((i) => !!i)
      .join(', ');
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

  react(type: MessageReactionType) {
    this.ownReactions.find((r) => r.type === type)
      ? void this.channelService.removeReaction(this.messageId!, type)
      : void this.channelService.addReaction(this.messageId!, type);
  }

  isOwnReaction(reactionType: MessageReactionType) {
    return !!this.ownReactions.find((r) => r.type === reactionType);
  }

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
}
