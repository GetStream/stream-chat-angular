import { EventEmitter } from '@angular/core';

export interface TextareaInterface {
  value: string;
  valueChange: EventEmitter<string>;
  send: EventEmitter<void>;
}
