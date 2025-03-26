import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import {
  ReactionGroupResponse,
  ReactionResponse,
  UserResponse,
} from 'stream-chat';
import { MessageReactionType } from '../types';
import { MessageReactionsService } from '../message-reactions.service';
import { CustomTemplatesService } from '../custom-templates.service';
import { Subscription } from 'rxjs';

/**
 * The `MessageReactions` component displays the reactions of a message. You can read more about [message reactions](/chat/docs/javascript/send_reaction/) in the platform documentation.
 */
@Component({
  selector: 'stream-message-reactions',
  templateUrl: './message-reactions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageReactionsComponent
  implements OnChanges, OnInit, AfterViewInit, OnDestroy
{
  /**
   * The id of the message the reactions belong to
   */
  @Input() messageId: string | undefined;
  /**
   * The number of reactions grouped by [reaction types](https://github.com/GetStream/stream-chat-angular/tree/master/projects/stream-chat-angular/src/lib/message-reactions/message-reactions.component.ts)
   */
  @Input() messageReactionGroups:
    | { [key: string]: ReactionGroupResponse }
    | undefined = undefined;
  /**
   * The number of reactions grouped by [reaction types](https://github.com/GetStream/stream-chat-angular/tree/master/projects/stream-chat-angular/src/lib/message-reactions/message-reactions.component.ts)
   * @deprecated use `messageReactionGroups`
   */
  @Input() messageReactionCounts: { [key in MessageReactionType]?: number } =
    {};
  /**
   * List of reactions of a [message](/chat/docs/sdk/angular/v7-rc/types/stream-message/), used to display the users of a reaction type.
   * @deprecated you can fetch the reactions using [`messageReactionsService.queryReactions()`](/chat/docs/sdk/angular/v7-rc/services/MessageReactionsService/#queryreactions)
   */
  @Input() latestReactions: ReactionResponse[] = [];
  /**
   * List of the user's own reactions of a [message](/chat/docs/sdk/angular/v7-rc/types/stream-message/), used to display the users of a reaction type.
   */
  @Input() ownReactions: ReactionResponse[] = [];
  selectedReactionType: string | undefined;
  isLoading = true;
  reactions: ReactionResponse[] = [];
  shouldHandleReactionClick = true;
  existingReactions: string[] = [];
  reactionOptions: string[] = [];
  usersByReactions: {
    [key: string]: { users: UserResponse[]; next?: string };
  } = {};
  private subscriptions: Subscription[] = [];
  private isViewInited = false;

  constructor(
    private cdRef: ChangeDetectorRef,
    private messageReactionsService: MessageReactionsService,
    public customTemplatesService: CustomTemplatesService,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes.messageReactionCounts || changes.messageReactionGroups) {
      if (this.messageReactionCounts && !this.messageReactionGroups) {
        this.messageReactionGroups = {};
        Object.keys(this.messageReactionCounts).forEach((k) => {
          this.messageReactionGroups![k] = {
            count: this.messageReactionCounts?.[k] ?? 0,
            sum_scores: this.messageReactionCounts?.[k] ?? 0,
            first_reaction_at: undefined,
            last_reaction_at: undefined,
          };
        });
      }
      this.setExistingReactions();
    }
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.messageReactionsService.reactions$.subscribe((reactions) => {
        this.reactionOptions = Object.keys(reactions);
        this.setExistingReactions();
        if (this.isViewInited) {
          this.cdRef.markForCheck();
        }
      }),
    );
  }

  ngAfterViewInit(): void {
    this.isViewInited = true;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  getEmojiByReaction(reactionType: MessageReactionType) {
    return this.messageReactionsService.reactions[reactionType];
  }

  async reactionSelected(reactionType: string) {
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
      if (!this.usersByReactions[this.selectedReactionType]) {
        this.usersByReactions[this.selectedReactionType] = {
          users: [],
        };
        await this.loadNextPageOfReactions();
      }
    }
  }

  async loadNextPageOfReactions() {
    if (!this.messageId || !this.selectedReactionType) {
      return;
    }

    this.isLoading = true;
    try {
      const response = await this.messageReactionsService.queryReactions(
        this.messageId,
        this.selectedReactionType,
        this.usersByReactions[this.selectedReactionType].next,
      );
      this.usersByReactions[this.selectedReactionType].users = [
        ...this.usersByReactions[this.selectedReactionType].users,
        ...(response.reactions
          .map((r) => r.user)
          .filter((u) => !!u) as UserResponse[]),
      ];
      this.usersByReactions[this.selectedReactionType].next = response.next;
    } catch (error) {
      this.selectedReactionType = undefined;
    } finally {
      this.isLoading = false;
    }
    if (this.isViewInited) {
      this.cdRef.markForCheck();
    }
  }

  isOwnReaction(reactionType: MessageReactionType) {
    return !!this.ownReactions.find((r) => r.type === reactionType);
  }

  isOpenChange = (isOpen: boolean) => {
    this.selectedReactionType = isOpen ? this.selectedReactionType : undefined;
    if (!isOpen) {
      this.usersByReactions = {};
    }
  };

  private setExistingReactions() {
    this.existingReactions = Object.keys(this.messageReactionGroups ?? {})
      .filter((k) => this.reactionOptions.indexOf(k) !== -1)
      .filter((k) => this.messageReactionGroups![k].count > 0)
      .sort((r1, r2) => {
        const date1 = this.messageReactionGroups![r1].first_reaction_at
          ? new Date(this.messageReactionGroups![r1].first_reaction_at!)
          : new Date();
        const date2 = this.messageReactionGroups![r2].first_reaction_at
          ? new Date(this.messageReactionGroups![r2].first_reaction_at!)
          : new Date();

        return date1.getTime() - date2.getTime();
      });
  }
}
