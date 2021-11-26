import {
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  Output,
  ViewChild,
} from '@angular/core';
import { TextareaInterface } from '../textarea.interface';

@Component({
  selector: 'stream-textarea',
  templateUrl: './textarea.component.html',
  styles: [],
})
export class TextareaComponent implements TextareaInterface, OnChanges {
  @HostBinding() class = 'str-chat__textarea';
  @Input() value = '';
  @Output() readonly valueChange = new EventEmitter<string>();
  @Output() readonly send = new EventEmitter<void>();
  @ViewChild('input') private messageInput!: ElementRef<HTMLInputElement>;

  constructor() {}

  // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
  ngOnChanges(): void {}

  inputChanged() {
    this.valueChange.emit(this.messageInput.nativeElement.value);
  }

  sent(event: Event) {
    event.preventDefault();
    this.send.next();
  }
}
