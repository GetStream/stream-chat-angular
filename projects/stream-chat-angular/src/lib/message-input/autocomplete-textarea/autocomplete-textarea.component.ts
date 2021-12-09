import {
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { MentionConfig, Mentions } from 'angular-mentions';
import {
  MentionAutcompleteListItemContext,
  MentionAutcompleteListItem,
} from '../../types';

import { BehaviorSubject, Subscription } from 'rxjs';
import { UserResponse } from 'stream-chat';
import { ChannelService } from '../../channel.service';
import { TextareaInterface } from '../textarea.interface';
import { ChatClientService } from '../../chat-client.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TransliterationService } from '../../transliteration.service';

@Component({
  selector: 'stream-autocomplete-textarea',
  templateUrl: './autocomplete-textarea.component.html',
  styles: [],
})
export class AutocompleteTextareaComponent
  implements TextareaInterface, OnChanges
{
  @HostBinding() class = 'str-chat__textarea';
  @Input() value = '';
  @Input() areMentionsEnabled: boolean | undefined = true;
  @Input() mentionAutocompleteItemTemplate:
    | TemplateRef<MentionAutcompleteListItemContext>
    | undefined;
  @Input() mentionScope: 'channel' | 'application' = 'channel';
  @Output() readonly valueChange = new EventEmitter<string>();
  @Output() readonly send = new EventEmitter<void>();
  @Output() readonly userMentions = new EventEmitter<UserResponse[]>();
  private readonly labelKey = 'autocompleteLabel';
  private readonly triggerChar = '@';
  autocompleteConfig: MentionConfig = {
    mentions: [],
  };
  @ViewChild('input') private messageInput!: ElementRef<HTMLInputElement>;
  private subscriptions: Subscription[] = [];
  private mentionedUsers: UserResponse[] = [];
  private userMentionConfig: Mentions = {
    triggerChar: this.triggerChar,
    dropUp: true,
    labelKey: this.labelKey,
    returnTrigger: true,
    mentionFilter: (
      searchString: string,
      items: { autocompleteLabel: string }[]
    ) => this.filter(searchString, items),
    mentionSelect: (item, triggerChar) => this.mentioned(item, triggerChar),
  };
  private searchTerm$ = new BehaviorSubject<string>('');

  constructor(
    private channelService: ChannelService,
    private chatClientService: ChatClientService,
    private transliterationService: TransliterationService
  ) {
    this.searchTerm$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((searchTerm) => void this.updateMentionOptions(searchTerm));
    this.subscriptions.push(
      this.channelService.activeChannel$.subscribe(() => {
        this.mentionedUsers = [];
        this.userMentions.next([...this.mentionedUsers]);
        void this.updateMentionOptions(this.searchTerm$.getValue());
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.areMentionsEnabled) {
      if (this.areMentionsEnabled) {
        this.autocompleteConfig.mentions = [this.userMentionConfig];
        this.autocompleteConfig = { ...this.autocompleteConfig };
      } else {
        this.autocompleteConfig.mentions = [];
        this.autocompleteConfig = { ...this.autocompleteConfig };
      }
    }
    if (changes.mentionScope) {
      void this.updateMentionOptions(this.searchTerm$.getValue());
    }
  }

  filter(searchString: string, items: { autocompleteLabel: string }[]) {
    return items.filter((item) =>
      this.transliterate(item.autocompleteLabel.toLowerCase()).includes(
        this.transliterate(searchString.toLowerCase())
      )
    );
  }

  mentioned(item: MentionAutcompleteListItem, triggerChar = '') {
    this.mentionedUsers.push((item.user ? item.user : item) as UserResponse);
    this.userMentions.next([...this.mentionedUsers]);
    return triggerChar + item.autocompleteLabel;
  }

  autcompleteSearchTermChanged(searchTerm: string) {
    if (searchTerm === this.triggerChar) {
      void this.updateMentionOptions();
    } else {
      this.searchTerm$.next(searchTerm.replace(this.triggerChar, ''));
    }
  }

  inputChanged() {
    this.valueChange.emit(this.messageInput.nativeElement.value);
  }

  inputLeft() {
    this.updateMentionedUsersFromText();
  }

  sent(event: Event) {
    event.preventDefault();
    this.updateMentionedUsersFromText();
    this.send.next();
  }

  private transliterate(s: string) {
    if (this.transliterationService) {
      return this.transliterationService.transliterate(s);
    } else {
      return s;
    }
  }

  private async updateMentionOptions(searchTerm?: string) {
    if (!this.areMentionsEnabled) {
      return;
    }
    const request =
      this.mentionScope === 'application'
        ? (s: string) => this.chatClientService.autocompleteUsers(s)
        : (s: string) => this.channelService.autocompleteMembers(s);
    const result = await request(searchTerm || '');
    const items = this.filter(
      searchTerm || '',
      result.map((i) => {
        const user = (i.user ? i.user : i) as UserResponse;
        return {
          ...i,
          autocompleteLabel: user.name || user.id,
          type: 'mention',
        };
      })
    );
    this.userMentionConfig.items = items;
    this.autocompleteConfig.mentions = [this.userMentionConfig];
    this.autocompleteConfig = { ...this.autocompleteConfig };
  }

  private updateMentionedUsersFromText() {
    const updatedMentionedUsers: UserResponse[] = [];
    this.mentionedUsers.forEach((u) => {
      const key = u.name || u.id;
      if (this.value.includes(`${this.triggerChar}${key}`)) {
        updatedMentionedUsers.push(u);
      }
    });
    if (updatedMentionedUsers.length !== this.mentionedUsers.length) {
      this.userMentions.next([...updatedMentionedUsers]);
      this.mentionedUsers = updatedMentionedUsers;
    }
  }
}
