import { EventEmitter } from '@angular/core';
import { UserResponse } from 'stream-chat';

export interface TextareaInterface {
  value: string;
  valueChange: EventEmitter<string>;
  send: EventEmitter<void>;
  userMentions?: EventEmitter<UserResponse[]>;
  areMentionsEnabled?: boolean;
  mentionScope?: 'channel' | 'application';
  placeholder?: string;
  inputMode?: 'mobile' | 'desktop';
  autoFocus?: boolean;
}
