import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import { ReactionResponse } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { DefaultReactionType, DefaultUserType } from '../types';

export type MessageReactionType =
  | 'angry'
  | 'haha'
  | 'like'
  | 'love'
  | 'sad'
  | 'wow';

const emojiReactionsMapping: { [key in MessageReactionType]: string } = {
  like: 'thumbsup',
  angry: 'angry',
  love: 'heart',
  haha: 'joy',
  wow: 'open_mouth',
  sad: 'disappointed',
};
@Component({
  selector: 'stream-message-reactions',
  templateUrl: './message-reactions.component.html',
  styles: [],
})
export class MessageReactionsComponent implements AfterViewChecked {
  @Input() messageId: string | undefined;
  @Input() messageReactionCounts: { [key in MessageReactionType]?: number } =
    {};
  @Input() isSelectorOpen: boolean = false;
  @Input() latestReactions: ReactionResponse<
    DefaultReactionType,
    DefaultUserType
  >[] = [];
  @Input() ownReactions: ReactionResponse<
    DefaultReactionType,
    DefaultUserType
  >[] = [];
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

  getEmojiNameByReaction(reactionType: MessageReactionType) {
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
