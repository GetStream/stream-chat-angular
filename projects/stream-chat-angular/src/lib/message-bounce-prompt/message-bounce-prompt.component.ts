import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostBinding,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ChannelService } from '../channel.service';
import { CustomTemplatesService } from '../custom-templates.service';
import { Subscription } from 'rxjs';
import { MessageActionsService } from '../message-actions.service';
import { StreamMessage } from '../types';

/**
 * The component watches for the [`channelService.bouncedMessage$` stream](/chat/docs/sdk/angular/v7-rc/services/ChannelService/#bouncedmessage) and opens the bounce modal if a message is emitted.
 *
 * To bounce messages, you need to set up [semantic filters for moderation](https://getstream.io/automated-moderation/docs/automod_configuration/?q=semantic%20filters).
 */
@Component({
  selector: 'stream-message-bounce-prompt',
  templateUrl: './message-bounce-prompt.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageBouncePromptComponent
  implements OnDestroy, OnInit, AfterViewInit
{
  @HostBinding() class = 'str-chat__message-bounce-prompt';
  isModalOpen = false;
  message?: StreamMessage;
  private subscriptions: Subscription[] = [];
  private isViewInitialized = false;

  constructor(
    private channelService: ChannelService,
    readonly customTemplatesService: CustomTemplatesService,
    private messageActionsService: MessageActionsService,
    private cdRef: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.channelService.bouncedMessage$.subscribe((m) => {
        if (m !== this.message) {
          this.message = m;
          if (this.message) {
            this.isModalOpen = true;
          }
          if (this.isViewInitialized) {
            this.cdRef.markForCheck();
          }
        }
      }),
    );
  }

  ngAfterViewInit(): void {
    this.isViewInitialized = true;
  }

  messageBounceModalOpenChanged = (isOpen: boolean) => {
    this.isModalOpen = isOpen;
    if (!isOpen) {
      this.message = undefined;
      this.channelService.bouncedMessage$.next(undefined);
    }
  };

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  async resendMessage() {
    this.isModalOpen = false;
    await this.channelService.resendMessage(this.message!);
    this.message = undefined;
    this.channelService.bouncedMessage$.next(undefined);
  }

  async deleteMessage() {
    if (!this.message) {
      return;
    }
    this.isModalOpen = false;
    await this.channelService.deleteMessage(this.message, true);
    this.message = undefined;
    this.channelService.bouncedMessage$.next(undefined);
  }

  editMessage() {
    this.isModalOpen = false;
    this.messageActionsService.messageToEdit$.next(this.message);
    this.message = undefined;
    this.channelService.bouncedMessage$.next(undefined);
  }
}
