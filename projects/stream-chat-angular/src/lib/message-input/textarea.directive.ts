import {
  ComponentRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewContainerRef,
} from '@angular/core';
import { Directive } from '@angular/core';
import { Subscription } from 'rxjs';
import { TextareaInterface } from './textarea.interface';

@Directive({
  selector: '[streamTextarea]',
})
export class TextareaDirective implements OnChanges {
  @Input() componentRef: ComponentRef<TextareaInterface> | undefined;
  @Input() value = '';
  @Output() readonly valueChange = new EventEmitter<string>();
  @Output() readonly send = new EventEmitter<void>();
  private subscriptions: Subscription[] = [];

  constructor(public viewContainerRef: ViewContainerRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.componentRef) {
      return;
    }
    if (changes.componentRef) {
      this.subscriptions.forEach((s) => s.unsubscribe());
      if (this.componentRef) {
        this.subscriptions.push(
          this.componentRef.instance.valueChange.subscribe((value) =>
            this.valueChange.next(value)
          )
        );
        this.subscriptions.push(
          this.componentRef.instance.send.subscribe((value) =>
            this.send.next(value)
          )
        );
      }
    }
    if (changes.value) {
      this.componentRef.instance.value = this.value;
    }
  }
}
