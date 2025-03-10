import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { EmojiInputService } from '../emoji-input.service';
import { TextareaInterface } from '../textarea.interface';
import { UserResponse } from 'stream-chat';

/**
 * The `Textarea` component is used by the [`MessageInput`](/chat/docs/sdk/angular/v6-rc/components/MessageInputComponent/) component to display the input HTML element where users can type their message.
 */
@Component({
  selector: 'stream-textarea',
  templateUrl: './textarea.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextareaComponent
  implements TextareaInterface, OnChanges, OnInit, OnDestroy, AfterViewInit
{
  @HostBinding() class =
    'str-chat__textarea str-chat__message-textarea-angular-host';
  /**
   * The value of the input HTML element.
   */
  @Input() value = '';
  /**
   * Placeholder of the textarea
   */
  @Input() placeholder = '';
  /**
   * See [`MessageInputConfigService`](/chat/docs/sdk/angular/v6-rc/services/MessageInputConfigService) for more information
   */
  @Input() inputMode!: 'desktop' | 'mobile';
  /**
   * Enables or disables auto focus on the textarea element
   */
  @Input() autoFocus = true;
  /**
   * Emits the current value of the input element when a user types.
   */
  @Output() readonly valueChange = new EventEmitter<string>();
  /**
   * Emits when a user triggers a message send event (this happens when they hit the `Enter` key).
   */
  @Output() readonly send = new EventEmitter<void>();
  /**
   * Emits any paste event that occured inside the textarea
   */
  @Output() readonly pasteFromClipboard = new EventEmitter<ClipboardEvent>();
  @ViewChild('input') private messageInput!: ElementRef<HTMLInputElement>;
  userMentions?: EventEmitter<UserResponse[]> | undefined;
  areMentionsEnabled?: boolean | undefined;
  mentionScope?: 'channel' | 'application' | undefined;
  private subscriptions: Subscription[] = [];
  private isViewInited = false;

  constructor(
    private emojiInputService: EmojiInputService,
    private cdRef: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.value && !this.value && this.messageInput) {
      this.messageInput.nativeElement.style.height = 'auto';
    } else if (
      changes.value &&
      this.value &&
      this.messageInput &&
      this.isViewInited
    ) {
      setTimeout(() => {
        if (this.messageInput.nativeElement.scrollHeight > 0) {
          this.adjustTextareaHeight();
        }
      }, 0);
    }
    this.cdRef.markForCheck();
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.emojiInputService.emojiInput$.subscribe((emoji) => {
        this.messageInput.nativeElement.focus();
        const { selectionStart } = this.messageInput.nativeElement;
        this.messageInput.nativeElement.setRangeText(emoji);
        this.messageInput.nativeElement.selectionStart =
          selectionStart! + emoji.length;
        this.messageInput.nativeElement.selectionEnd =
          selectionStart! + emoji.length;
        this.inputChanged();
        if (this.isViewInited) {
          this.cdRef.markForCheck();
        }
      }),
    );
  }

  ngAfterViewInit(): void {
    this.isViewInited = true;
    if (this.messageInput.nativeElement.scrollHeight > 0 && this.value) {
      this.adjustTextareaHeight();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  inputChanged() {
    this.valueChange.emit(this.messageInput.nativeElement.value);
    this.adjustTextareaHeight();
  }

  enterHit(event: Event) {
    if (this.inputMode === 'desktop' && !(event as KeyboardEvent).isComposing) {
      event.preventDefault();
      this.send.next();
    }
  }

  private adjustTextareaHeight() {
    this.messageInput.nativeElement.style.height = '';
    this.messageInput.nativeElement.style.height = `${this.messageInput.nativeElement.scrollHeight}px`;
  }
}
