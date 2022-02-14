import {
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { EmojiInputService } from '../emoji-input.service';
import { TextareaInterface } from '../textarea.interface';

@Component({
  selector: 'stream-textarea',
  templateUrl: './textarea.component.html',
  styles: [],
})
export class TextareaComponent
  implements TextareaInterface, OnChanges, OnDestroy
{
  @HostBinding() class = 'str-chat__textarea';
  @Input() value = '';
  @Output() readonly valueChange = new EventEmitter<string>();
  @Output() readonly send = new EventEmitter<void>();
  @ViewChild('input') private messageInput!: ElementRef<HTMLInputElement>;
  private subscriptions: Subscription[] = [];

  constructor(private emojiInputService: EmojiInputService) {
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

  // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
  ngOnChanges(): void {}

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  inputChanged() {
    this.valueChange.emit(this.messageInput.nativeElement.value);
  }

  sent(event: Event) {
    event.preventDefault();
    this.send.next();
  }
}
