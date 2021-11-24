import {
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { TextareaInterface } from '../textarea.interface';

@Component({
  selector: 'stream-textarea',
  templateUrl: './textarea.component.html',
  styles: [],
})
export class TextareaComponent implements TextareaInterface {
  @HostBinding() class = 'str-chat__textarea';
  @Input() value = '';
  @Output() readonly valueChange = new EventEmitter<string>();
  @Output() readonly send = new EventEmitter<void>();
  @ViewChild('input') private messageInput!: ElementRef<HTMLInputElement>;

  constructor() {}

  inputChanged() {
    this.valueChange.emit(this.messageInput.nativeElement.value);
  }

  sent(event: Event) {
    event.preventDefault();
    this.send.next();
  }
}
