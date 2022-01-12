import { EventEmitter, OnChanges, TemplateRef } from '@angular/core';
import { UserResponse } from 'stream-chat';
import {
  CommandAutocompleteListItemContext,
  MentionAutcompleteListItemContext,
} from '../types';

export interface TextareaInterface extends OnChanges {
  value: string;
  valueChange: EventEmitter<string>;
  send: EventEmitter<void>;
  userMentions?: EventEmitter<UserResponse[]>;
  areMentionsEnabled?: boolean;
  mentionAutocompleteItemTemplate?:
    | TemplateRef<MentionAutcompleteListItemContext>
    | undefined;
  commandAutocompleteItemTemplate?:
    | TemplateRef<CommandAutocompleteListItemContext>
    | undefined;
  mentionScope?: 'channel' | 'application';
}
