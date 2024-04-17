import {
  AfterViewInit,
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
  MessageInputContext,
  StreamMessage,
} from '../types';
import { MessageActionsService } from '../message-actions.service';
/**
 * The `MessageActionsBox` component displays a list of message actions (i.e edit), that can be opened or closed. You can find the [list of the supported actions](../concepts/message-interactions.mdx) in the message interaction guide.
 */
@Component({
  selector: 'stream-message-actions-box',
  templateUrl: './message-actions-box.component.html',
  styles: [],
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
   * The list of [channel capabilities](https://getstream.io/chat/docs/javascript/channel_capabilities/?language=javascript) that are enabled for the current user, the list of [supported interactions](../concepts/message-interactions.mdx) can be found in our message interaction guide. Unathorized actions won't be displayed on the UI.
   */
  @Input() enabledActions: string[] = [];
  messageInputTemplate: TemplateRef<MessageInputContext> | undefined;
  messageActionItemTemplate:
    | TemplateRef<MessageActionBoxItemContext>
    | undefined;
  visibleMessageActionItems: (MessageActionItem | CustomMessageActionItem)[] =
    [];
  isEditModalOpen = false;
  customActions: CustomMessageActionItem[] = [];
  private readonly messageActionItems: MessageActionItem[];
  private subscriptions: Subscription[] = [];
  private isViewInited = false;
  constructor(
    public readonly customTemplatesService: CustomTemplatesService,
    private messageActionsService: MessageActionsService,
    private cdRef: ChangeDetectorRef
  ) {
    this.messageActionItems = this.messageActionsService.defaultActions;
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.messageActionsService.customActions$.subscribe((actions) => {
        this.customActions = actions;
        this.setVisibleActions();
        if (this.isViewInited) {
          this.cdRef.detectChanges();
        }
      })
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
            this.cdRef.detectChanges();
          }
        }
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.isMine || changes.enabledActions || changes.message) {
      this.setVisibleActions();
    }
  }

  ngAfterViewInit(): void {
    this.isViewInited = true;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  getActionLabel(
    actionLabelOrTranslationKey: ((message: StreamMessage) => string) | string
  ) {
    return typeof actionLabelOrTranslationKey === 'string'
      ? actionLabelOrTranslationKey
      : actionLabelOrTranslationKey(this.message!);
  }

  getMessageActionTemplateContext(
    item: MessageActionItem | CustomMessageActionItem
  ): MessageActionBoxItemContext {
    return {
      actionHandler: item.actionHandler,
      isMine: this.isMine,
      actionName: item.actionName,
      message: this.message!,
      actionLabelOrTranslationKey: item.actionLabelOrTranslationKey,
    };
  }

  trackByActionName(
    _: number,
    item: MessageActionItem | CustomMessageActionItem
  ) {
    return item.actionName;
  }

  private setVisibleActions() {
    this.visibleMessageActionItems = [
      ...this.messageActionItems,
      ...this.customActions,
    ].filter((item) =>
      item.isVisible(this.enabledActions, this.isMine, this.message!)
    );
  }
}
