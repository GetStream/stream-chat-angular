import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { DefaultStreamChatGenerics, MessageReactionType } from '../types';
import { ReactionResponse } from 'stream-chat';
import { ChannelService } from '../channel.service';
import { MessageReactionsService } from '../message-reactions.service';
import { Subscription } from 'rxjs';

/**
 * The `MessageReactionsSelectorComponent` makes it possible for users to react to a message, the reaction options can be set using the [`MessageReactionsService`](/chat/docs/sdk/angular/services/MessageReactionsService/). You can read more about [message reactions](https://getstream.io/chat/docs/javascript/send_reaction/?language=javascript) in the platform documentation.
 */
@Component({
  selector: 'stream-message-reactions-selector',
  templateUrl: './message-reactions-selector.component.html',
  styles: [],
})
export class MessageReactionsSelectorComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  /**
   * List of the user's own reactions of a [message](/chat/docs/sdk/angular/types/stream-message/), used to display the users of a reaction type.
   */
  @Input() ownReactions: ReactionResponse<DefaultStreamChatGenerics>[] = [];
  /**
   * The id of the message the reactions belong to
   */
  @Input() messageId: string | undefined;
  reactionOptions: string[] = [];
  private subscriptions: Subscription[] = [];
  private isViewInited = false;

  constructor(
    private channelService: ChannelService,
    private messageReactionsService: MessageReactionsService,
    private cdRef: ChangeDetectorRef
  ) {}
  ngOnInit(): void {
    this.subscriptions.push(
      this.messageReactionsService.reactions$.subscribe((reactions) => {
        this.reactionOptions = Object.keys(reactions);
        if (this.isViewInited) {
          this.cdRef.detectChanges();
        }
      })
    );
  }

  ngAfterViewInit(): void {
    this.isViewInited = true;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  trackByMessageReaction(_: number, item: MessageReactionType) {
    return item;
  }

  isOwnReaction(reactionType: MessageReactionType) {
    return !!this.ownReactions.find((r) => r.type === reactionType);
  }

  getEmojiByReaction(reactionType: MessageReactionType) {
    return this.messageReactionsService.reactions[reactionType];
  }

  async react(type: MessageReactionType) {
    this.ownReactions.find((r) => r.type === type)
      ? await this.channelService.removeReaction(this.messageId!, type)
      : await this.channelService.addReaction(this.messageId!, type);
  }
}
