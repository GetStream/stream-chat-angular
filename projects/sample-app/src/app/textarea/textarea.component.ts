import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { UserResponse, DefaultGenerics } from 'stream-chat';
import { ChatClientService, TextareaInterface } from 'stream-chat-angular';

@Component({
  selector: 'app-textarea',
  templateUrl: './textarea.component.html',
  styleUrls: ['./textarea.component.scss'],
})
export class TextareaComponent implements OnInit, OnDestroy, TextareaInterface {
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();
  @Output() send = new EventEmitter<void>();
  isEnabled: boolean = false;
  // Optional inputs/outputs depending on the functionalities you want to support inside textarea
  userMentions?: EventEmitter<UserResponse<DefaultGenerics>[]> | undefined;
  areMentionsEnabled?: boolean | undefined;
  mentionScope?: 'channel' | 'application' | undefined;
  placeholder?: string | undefined;
  private subscriptions: Subscription[] = [];

  constructor(private chatService: ChatClientService) {
    this.subscriptions.push(
      this.chatService.user$
        .pipe(filter((u) => !!u))
        .subscribe((u) => this.setIsEnabled(u!))
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  private setIsEnabled(user: UserResponse) {
    // Custom logic for enabling and disabling the textarea
    this.isEnabled = user.id.startsWith('j');
    console.log(
      `Message text for user ${user.id} is ${
        this.isEnabled ? 'enabled' : 'disabled'
      }`
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Empty method to comply with TextareaInterface
  }

  ngOnInit(): void {}

  inputChanged(value: string) {
    console.log(value);
    this.valueChange.emit(value);
  }

  // Notify the message input component if enter was hit to trigger message send
  sent(event: Event) {
    event.preventDefault();
    this.send.emit();
  }
}
