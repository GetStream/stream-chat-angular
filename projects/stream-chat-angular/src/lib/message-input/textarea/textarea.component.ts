import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../theme.service';
import { EmojiInputService } from '../emoji-input.service';
import { TextareaInterface } from '../textarea.interface';

/**
 * The `Textarea` component is used by the [`MessageInput`](./MessageInputComponent.mdx) component to display the input HTML element where users can type their message.
 */
@Component({
  selector: 'stream-textarea',
  templateUrl: './textarea.component.html',
  styles: [],
})
export class TextareaComponent
  implements TextareaInterface, OnChanges, OnDestroy, AfterViewInit
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
   * See [`MessageInputConfigService`](../services/MessageInputConfigService.mdx) for more information
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
  @ViewChild('input') private messageInput!: ElementRef<HTMLInputElement>;
  private subscriptions: Subscription[] = [];

  constructor(
    private emojiInputService: EmojiInputService,
    private themeService: ThemeService
  ) {
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
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.value && !this.value && this.messageInput) {
      this.messageInput.nativeElement.style.height = 'auto';
    }
  }

  ngAfterViewInit(): void {
    if (this.messageInput.nativeElement.scrollHeight > 0) {
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
    if (this.inputMode === 'desktop') {
      event.preventDefault();
      this.send.next();
    }
  }

  private adjustTextareaHeight() {
    if (this.themeService.themeVersion === '2') {
      this.messageInput.nativeElement.style.height = '';
      this.messageInput.nativeElement.style.height = `${this.messageInput.nativeElement.scrollHeight}px`;
    }
  }
}
