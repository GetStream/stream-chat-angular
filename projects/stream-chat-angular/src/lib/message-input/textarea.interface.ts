import { EventEmitter, OnChanges } from '@angular/core';
import { UserResponse } from 'stream-chat';

export interface TextareaInterface extends OnChanges {
  value: string;
  valueChange: EventEmitter<string>;
  send: EventEmitter<void>;
  userMentions?: EventEmitter<UserResponse[]>;
  areMentionsEnabled?: boolean;
  mentionScope?: 'channel' | 'application';
  placeholder?: string;
}
