import { InjectionToken, Type } from '@angular/core';
import { TextareaInterface } from './message-input/textarea.interface';

export const textareaInjectionToken = new InjectionToken<
  Type<TextareaInterface>
>('textareaInjectionToken');
