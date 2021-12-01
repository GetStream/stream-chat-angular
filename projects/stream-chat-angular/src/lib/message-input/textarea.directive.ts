import {
  ComponentRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { Directive } from '@angular/core';
import { Subscription } from 'rxjs';
import { UserResponse } from 'stream-chat';
import { MentionAutcompleteListItemContext } from '../types';
import { TextareaInterface } from './textarea.interface';

@Directive({
  selector: '[streamTextarea]',
})
export class TextareaDirective implements OnChanges {
  @Input() componentRef: ComponentRef<TextareaInterface> | undefined;
  @Input() areMentionsEnabled: boolean | undefined;
  @Input() mentionAutocompleteItemTemplate:
    | TemplateRef<MentionAutcompleteListItemContext>
    | undefined;
  @Input() mentionScope?: 'channel' | 'application';
  @Input() value = '';
  @Output() readonly valueChange = new EventEmitter<string>();
  @Output() readonly send = new EventEmitter<void>();
  @Output() readonly userMentions = new EventEmitter<UserResponse[]>();
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
        if (this.componentRef.instance.userMentions) {
          this.subscriptions.push(
            this.componentRef.instance.userMentions.subscribe((value) =>
              this.userMentions.next(value)
            )
          );
        }
      }
    }
    if (changes.areMentionsEnabled) {
      this.componentRef.instance.areMentionsEnabled = this.areMentionsEnabled;
    }
    if (changes.mentionAutocompleteItemTemplate) {
      this.componentRef.instance.mentionAutocompleteItemTemplate =
        this.mentionAutocompleteItemTemplate;
    }
    if (changes.mentionScope) {
      this.componentRef.instance.mentionScope = this.mentionScope;
    }
    if (changes.value) {
      this.componentRef.instance.value = this.value;
    }
    // ngOnChanges not called for dynamic components since we don't use template binding
    // eslint-disable-next-line @angular-eslint/no-lifecycle-call
    this.componentRef.instance.ngOnChanges(changes);
  }
}
