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
  TemplateRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CustomTemplatesService } from '../custom-templates.service';
import {
  CustomMessageActionItem,
  MessageActionBoxItemContext,
  MessageActionItem,
  MessageReactionActionItem,
  MessageReactionsSelectorContext,
  StreamMessage,
} from '../types';
import { MessageActionsService } from '../message-actions.service';
/**
 * The `MessageActionsBox` component displays a list of message actions (i.e edit), that can be opened or closed. You can find the [list of the supported actions](/chat/docs/sdk/angular/v7-rc/concepts/message-interactions/) in the message interaction guide.
 */
@Component({
  selector: 'stream-message-actions-box',
  templateUrl: './message-actions-box.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageActionsBoxComponent
  implements OnInit, OnChanges, OnDestroy, AfterViewInit
{
  /**
   * Indicates if the message actions are belonging to a message that was sent by the current user or not.
   */
  @Input() isMine = false;
  /**
   * The message the actions will be executed on
   */
  @Input() message: StreamMessage | undefined;
  /**
   * The HTML element which contains the message text, it's used for the "copy message text" action
   */
  @Input() messageTextHtmlElement: HTMLElement | undefined;
  /**
   * The list of [channel capabilities](/chat/docs/javascript/channel_capabilities/) that are enabled for the current user, the list of [supported interactions](/chat/docs/sdk/angular/v7-rc/concepts/message-interactions) can be found in our message interaction guide. Unathorized actions won't be displayed on the UI.
   */
  @Input() enabledActions: string[] = [];
  messageActionItemTemplate:
    | TemplateRef<MessageActionBoxItemContext>
    | undefined;
  visibleMessageActionItems: (
    | MessageActionItem
    | CustomMessageActionItem
    | MessageReactionActionItem
  )[] = [];
  isEditModalOpen = false;
  customActions: CustomMessageActionItem[] = [];
  private readonly messageActionItems: (
    | MessageActionItem
    | MessageReactionActionItem
  )[];
  private subscriptions: Subscription[] = [];
  private isViewInited = false;
  constructor(
    public readonly customTemplatesService: CustomTemplatesService,
    private messageActionsService: MessageActionsService,
    private cdRef: ChangeDetectorRef,
  ) {
    this.messageActionItems = this.messageActionsService.defaultActions;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.isMine || changes.enabledActions || changes.message) {
      this.setVisibleActions();
    }
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.messageActionsService.customActions$.subscribe((actions) => {
        this.customActions = actions;
        this.setVisibleActions();
        if (this.isViewInited) {
          this.cdRef.markForCheck();
        }
      }),
    );
    this.subscriptions.push(
      this.messageActionsService.messageToEdit$.subscribe((m) => {
        let isEditModalOpen = false;
        if (m && m.id === this.message?.id) {
          isEditModalOpen = true;
        }
        if (isEditModalOpen !== this.isEditModalOpen) {
          this.isEditModalOpen = isEditModalOpen;
          if (this.isViewInited) {
            this.cdRef.markForCheck();
          }
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

  getActionLabel(
    actionLabelOrTranslationKey: ((message: StreamMessage) => string) | string,
  ) {
    return typeof actionLabelOrTranslationKey === 'string'
      ? actionLabelOrTranslationKey
      : actionLabelOrTranslationKey(this.message!);
  }

  getReactionSelectorTemplateContext(): MessageReactionsSelectorContext {
    return {
      messageId: this.message?.id,
      ownReactions: this.message?.own_reactions || [],
    };
  }

  getMessageActionTemplateContext(
    item:
      | MessageActionItem
      | CustomMessageActionItem
      | MessageReactionActionItem,
  ): MessageActionBoxItemContext {
    if (this.isReactAction(item)) {
      return {} as MessageActionBoxItemContext;
    } else {
      return {
        actionHandler: item.actionHandler,
        actionHandlerExtraParams: {
          isMine: this.isMine,
          messageTextHtmlElement: this.messageTextHtmlElement,
        },
        actionName: item.actionName,
        message: this.message!,
        actionLabelOrTranslationKey: item.actionLabelOrTranslationKey,
      };
    }
  }

  private isReactAction(
    item:
      | MessageActionItem
      | CustomMessageActionItem
      | MessageReactionActionItem,
  ): item is MessageReactionActionItem {
    return item.actionName === 'react';
  }

  private setVisibleActions() {
    if (!this.message) {
      this.visibleMessageActionItems = [];
    } else {
      this.visibleMessageActionItems = [
        ...this.messageActionItems,
        ...this.customActions,
      ].filter((item) =>
        item.isVisible(this.enabledActions, this.isMine, this.message!),
      );
    }
  }
}
